// Development-only stand-in for Supabase Realtime, used by scripts/check-workspace-live.cjs.
// Pages in one browser profile share broadcast and presence through a BroadcastChannel. Like the
// realtime RLS (workspace_realtime_access), a member may publish only on the topic ending in their
// own id. It's loaded only when NODE_ENV isn't "production" and NEXT_PUBLIC_FAKE_REALTIME is "1",
// so production builds never include it.
import type { SupabaseClient } from "@supabase/supabase-js";

type Message =
  | { topic: string; kind: "broadcast"; event: string; payload: unknown }
  | { topic: string; kind: "presence"; key: string; meta: Record<string, unknown> | null }
  | { topic: string; kind: "hello" };
type Handler = { type: string; event: string; cb: (value: { payload?: unknown }) => void };

export function fakeRealtimeClient(userId: string): SupabaseClient {
  const bus = new BroadcastChannel("dormscape-fake-realtime"), channels = new Map<string, ReturnType<typeof channel>>();
  bus.onmessage = (e: MessageEvent<Message>) => channels.get(e.data.topic)?.receive(e.data);
  addEventListener("pagehide", () => channels.forEach(c => c.leave()));
  function channel(topic: string, key: string) {
    const handlers: Handler[] = [], others: Record<string, Record<string, unknown>[]> = {};
    const mine = topic.split(":").at(-1) === userId, denied = () => Promise.reject(new Error("Not allowed to publish on this topic."));
    let own: Record<string, unknown> | null = null;
    const sync = () => handlers.filter(h => h.type === "presence").forEach(h => h.cb({}));
    const self = {
      on(type: string, filter: { event: string }, cb: Handler["cb"]) { handlers.push({ type, event: filter.event, cb }); return self; },
      presenceState: () => ({ ...others, ...(own ? { [key]: [own] } : {}) }),
      subscribe(cb?: (status: string) => void) { channels.set(topic, self); bus.postMessage({ topic, kind: "hello" }); setTimeout(() => cb?.("SUBSCRIBED")); return self; },
      track(meta: Record<string, unknown>) { if (!mine) return denied(); own = meta; bus.postMessage({ topic, kind: "presence", key, meta }); sync(); return Promise.resolve("ok"); },
      send(message: { event: string; payload: unknown }) { if (!mine) return denied(); bus.postMessage({ topic, kind: "broadcast", event: message.event, payload: message.payload }); return Promise.resolve("ok"); },
      receive(m: Message) {
        if (m.kind === "broadcast") handlers.filter(h => h.type === "broadcast" && h.event === m.event).forEach(h => h.cb({ payload: m.payload }));
        else if (m.kind === "hello") { if (own) bus.postMessage({ topic, kind: "presence", key, meta: own }); }
        else { if (m.meta) others[m.key] = [m.meta]; else delete others[m.key]; sync(); }
      },
      leave() { if (own) bus.postMessage({ topic, kind: "presence", key, meta: null }); own = null; channels.delete(topic); },
    };
    return self;
  }
  return {
    auth: { getSession: async () => ({ data: { session: { access_token: "dev-fake-session" } } }) },
    realtime: { setAuth: async () => {} },
    channel: (topic: string, options: { config: { presence: { key: string } } }) => channel(topic, options.config.presence.key),
    removeChannel: async (c: ReturnType<typeof channel>) => { c.leave(); return "ok"; },
  } as unknown as SupabaseClient;
}

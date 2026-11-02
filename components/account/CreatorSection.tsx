"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { bearer } from "@/lib/invites";
import { track } from "@/lib/analytics";
import { CREATOR_MIN_FOLLOWERS, PLUS_INITIAL_CREDITS } from "@/lib/plan";
import type { CreatorStatus, Platform } from "@/lib/creators";
import s from "./account.module.css";

const NAMES: Record<Platform, string> = { instagram: "Instagram", tiktok: "TikTok" };
const MIN = CREATOR_MIN_FOLLOWERS.toLocaleString("en-US");

/** Account settings › Creators: apply, the bio code while it's reviewed, then your creator code. */
export default function CreatorSection({ eyebrow }: { eyebrow: string }) {
  const { profile, refreshProfile } = useAuth();
  const [st, setSt] = useState<CreatorStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLElement>(null);

  async function call(init?: RequestInit): Promise<CreatorStatus> {
    const token = await bearer();
    if (!token) throw new Error("Sign in again to continue.");
    const res = await fetch("/api/creator", { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const data = (await res.json().catch(() => null)) as (CreatorStatus & { error?: string }) | null;
    if (!res.ok || !data) throw new Error(data?.error ?? "Something went wrong. Try again in a minute.");
    return data;
  }

  useEffect(() => {
    call().then(setSt, (e: Error) => setLoadError(e.message));
    // Signed up from "Sign up as a creator": land on the form.
    if (new URLSearchParams(window.location.search).get("creator") === "apply") {
      requestAnimationFrame(() => root.current?.scrollIntoView({ block: "start" }));
    }
  }, []);

  useEffect(() => {
    // Approval sets the badge on the profile; pick it up when the status says so.
    if (st?.status === "approved" && !profile?.creator_at) void refreshProfile();
  }, [st?.status, profile?.creator_at, refreshProfile]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setSt(await call({ method: "POST", body: JSON.stringify({ platform, handle, followers: Number(followers.replace(/[^\d]/g, "")) }) }));
      track("creator_applied", { platform });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const link = st?.code ? `${window.location.origin.replace(/^https?:\/\//, "")}/c/${st.code}` : "";

  return (
    <section ref={root} id="creator" className={`${s.card} ${s.section}`} aria-labelledby="creator-title">
      <p className={s.sectionEyebrow}>{eyebrow}</p>
      <h2 id="creator-title" className={s.cardTitle}>
        {st?.status === "approved" ? "You're a dormscape creator" : "Become a creator"}
      </h2>
      <p className={s.cardLede}>
        Creators with {MIN}+ followers on Instagram or TikTok get a Creator badge by their username, including on gallery
        layouts, and a code that unlocks Plus free for their followers: {PLUS_INITIAL_CREDITS} plan credits and every Plus tool.
      </p>

      {loadError && <p className={s.note}>{loadError}</p>}

      {st?.status === "pending" && st.platform && (
        <div className={s.note} role="status">
          <b>Almost there.</b> Add <code>{st.verifyCode}</code> to your {NAMES[st.platform]} bio (@{st.handle}) so we can see the
          account is yours. We check it and your follower count, usually within 2 days. You can take it out once you&rsquo;re
          approved.
        </div>
      )}

      {st?.status === "approved" && st.code && (
        <>
          <div className={s.note}>
            <p style={{ margin: "0 0 12px" }}>
              Your code is <code>{st.code.toUpperCase()}</code>. Share <b>{link}</b>, or tell followers to type the code on
              the Pricing page.
            </p>
            <button
              type="button"
              className="ds-btn ds-btn--sm ds-btn--ink-yellow"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`https://${link}`);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                } catch {
                  // Clipboard blocked: the link is on screen to copy by hand.
                }
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <ul className={s.statRow}>
            <li>
              <b>{st.redemptions ?? 0}</b>
              <span>{st.redemptions === 1 ? "person" : "people"} unlocked Plus with your code</span>
            </li>
          </ul>
        </>
      )}

      {(st?.status === "none" || st?.status === "rejected") && (
        <form onSubmit={apply} className={s.form} noValidate>
          {st.status === "rejected" && (
            <p className={s.note}>
              We couldn&rsquo;t confirm your last application. Check the handle, follower count and the code in your bio, then
              apply again.
            </p>
          )}
          {!profile?.username && (
            <p className={s.note}>Set a username in Profile details first. It becomes your creator code.</p>
          )}
          <div className={s.fields}>
            <fieldset className={`${s.platforms} ${s.full}`}>
              <legend className="ds-label">Where you post</legend>
              {(Object.keys(NAMES) as Platform[]).map((p) => (
                <label key={p}>
                  <input type="radio" name="creator-platform" value={p} checked={platform === p} onChange={() => setPlatform(p)} />
                  {NAMES[p]}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="creator-handle" className="ds-label">
                Handle
              </label>
              <input
                id="creator-handle"
                className="ds-input"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                maxLength={31}
              />
            </div>
            <div>
              <label htmlFor="creator-followers" className="ds-label">
                Followers
              </label>
              <input
                id="creator-followers"
                className="ds-input"
                value={followers}
                onChange={(e) => setFollowers(e.target.value)}
                placeholder={MIN}
                inputMode="numeric"
              />
            </div>
          </div>
          <div className={s.formActions}>
            <button type="submit" className="ds-btn ds-btn--ink-yellow" disabled={busy || !profile?.username || !handle.trim() || !followers.trim()}>
              {busy ? "Sending…" : "Apply as a creator"}
            </button>
            {error && (
              <p className={s.formError} role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

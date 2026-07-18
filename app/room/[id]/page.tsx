import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import StaticRoomView from "@/components/room/StaticRoomView";
import type { SaveRoomRequest } from "@/lib/api-types";
import { CATEGORY_LABELS, CATEGORY_ORDER, productById, totalFor } from "@/lib/catalog";
import { formatRoomType } from "@/lib/format";
import { getSchool } from "@/lib/schools";
import { styleById } from "@/lib/styles";
import { getServiceClient } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: "A Dormscape Room Design" },
  description: "A dorm room designed with Dormscape, the free AI dorm room planner.",
  robots: { index: false }, // share pages shouldn't compete with the planner in search
};

interface SavedRow extends SaveRoomRequest {
  id: string;
  created_at: string;
}

async function loadRoom(id: string): Promise<SavedRow | null> {
  if (!/^[A-Za-z0-9_-]{1,21}$/.test(id)) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("saved_rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as SavedRow | null) ?? null;
}

export default async function SharedRoomPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const room = await loadRoom(id);
  if (!room) notFound();

  const dims = room.room_dimensions;
  const school = room.college_id ? getSchool(room.college_id) : undefined;
  const style = styleById(room.style);
  const products = CATEGORY_ORDER.map((cat) => {
    const pid = room.selected_products?.[cat];
    return pid ? productById(pid) : undefined;
  }).filter((p): p is Product => Boolean(p));
  const total = totalFor(products);

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {/* CTA first: this page exists to convert viewers */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-cobalt p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-extrabold tracking-tight text-white">
              Design your own room. It&rsquo;s free.
            </p>
            <p className="mt-1 text-sm text-white/80">
              Your exact dorm, your style, your budget. Two minutes.
            </p>
          </div>
          <Link
            href="/plan"
            className="shrink-0 rounded-lg bg-white px-5 py-2.5 font-semibold text-ink transition-colors hover:bg-highlight"
          >
            Start planning
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {style.emoji} {style.name} room
          </h1>
          <p className="font-mono text-sm text-ink-soft">
            {school ? `${school.name} · ` : ""}
            {formatRoomType(dims.room_type)} · {dims.length_ft} × {dims.width_ft} ft
          </p>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-ink/10 bg-card p-4 sm:p-6">
            <StaticRoomView
              lengthFt={dims.length_ft}
              widthFt={dims.width_ft}
              furniture={room.furniture_positions}
              isCorridor={room.template_id.startsWith("corridor-")}
            />
            <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Designed with Dormscape
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">The shopping list</h2>
              <p className="font-mono text-sm font-semibold">
                ${total.toFixed(2)}
              </p>
            </div>
            <ul className="mt-4 space-y-3">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-ink/10 bg-card p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 shrink-0 rounded-md border border-ink/5 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-ink-soft">
                      {CATEGORY_LABELS[p.category]} · ${p.price.toFixed(2)}
                    </p>
                  </div>
                  <a
                    href={p.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="shrink-0 rounded-md bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cobalt"
                  >
                    Buy
                  </a>
                </li>
              ))}
            </ul>
            {products.length === 0 && (
              <p className="mt-4 rounded-lg border border-dashed border-ink/20 p-4 text-sm text-ink-soft">
                This design didn&rsquo;t save its product picks.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

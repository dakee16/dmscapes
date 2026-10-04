"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import RoomThumb from "@/components/room/RoomThumb";
import { ArrowRight } from "@/components/ds/Icons";
import { ChevronLeft } from "@/components/account-ui/parts";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { hasFeatures } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { getSchool, formatDims } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { styleById } from "@/lib/styles";
import { formatRoomType } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { analyzeRoom, assignedCosts, DEFAULT_PLANNING, shoppingProducts } from "@/lib/planning";
import { visibleFurniture } from "@/lib/studio";
import type { ProductCategory } from "@/lib/types";
import type { AccountRoomSummary, AccountRoomsResponse } from "@/lib/api-types";
import css from "@/components/account/compare.module.css";

// The five points from "How to compare two dorm room designs" (the Comparing
// FAQ): total vs budget, fit to the real room, anchor pieces, daily use vs
// decoration, roommate coordination. Every value is read from the saved design.

/** The four pieces that carry a look: bed, rug, wall moment, lighting. */
const ANCHORS: { label: string; cats: ProductCategory[] }[] = [
  { label: "Bed", cats: ["bedding"] },
  { label: "Rug", cats: ["rug"] },
  { label: "Wall", cats: ["wall_decor", "tapestry", "mirror"] },
  { label: "Light", cats: ["ambient_lighting", "desk_lamp"] },
];
/** Things that are there for the look; everything else gets used every day. */
const DECOR = new Set<ProductCategory>(["rug", "wall_decor", "tapestry", "throw", "accent", "plant", "ambient_lighting"]);

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function detailsOf(room: AccountRoomSummary) {
  const school = room.college_id ? getSchool(room.college_id) : undefined;
  const dorm = school?.dorms.find((d) => d.id === room.dorm_id);
  return {
    place: [school ? shortName(school) : null, dorm?.name].filter(Boolean).join(" · ") || "Custom room",
    style: styleById(room.style),
    roomType: formatRoomType(room.room_type),
    dims: formatDims(room.length_ft, room.width_ft),
  };
}

function useDesign(room: AccountRoomSummary | undefined) {
  const visible = useMemo(
    () => (room ? visibleFurniture(room.furniture ?? [], room.editor?.hiddenItemIds ?? [], room.editor?.excluded ?? []) : []),
    [room]
  );
  const analysis = useMemo(
    () =>
      room?.length_ft && room.width_ft
        ? analyzeRoom(
            visible,
            {
              type: room.room_type,
              occupants: room.occupants ?? 1,
              lengthFt: room.length_ft,
              widthFt: room.width_ft,
              bedSize: room.bed_size ?? "twin_xl",
              source: "manual",
              outline: room.outline,
              studio: room.studio,
            },
            room.editor?.planning?.walkwayFt ?? 2
          )
        : null,
    [room, visible]
  );
  return useMemo(() => {
    if (!room) return null;
    const planning = room.editor?.planning ?? DEFAULT_PLANNING;
    const cart = room.editor?.cartProducts;
    const cost = cart
      ? Object.values(assignedCosts(room.furniture ?? [], cart, planning)).reduce((a, b) => a + b, 0)
      : null;
    const products = cart ?? [];
    const anchors = ANCHORS.map((a) => ({ label: a.label, product: products.find((p) => a.cats.includes(p.category)) })).filter(
      (a) => a.product
    );
    const decor = products.filter((p) => DECOR.has(p.category)).length;
    const roommates = planning.roommates;
    const buying = shoppingProducts(products, planning);
    const owner = (id: string) => planning.productSupply[id]?.assignedTo ?? "shared";
    const shared = [...new Set(buying.filter((p) => owner(p.id) === "shared").map((p) => CATEGORY_LABELS[p.category] ?? p.category))];
    const perPerson = roommates.map((r) => ({ name: r.name, count: buying.filter((p) => owner(p.id) === r.id).length }));
    return {
      room,
      meta: detailsOf(room),
      visible,
      analysis,
      cost,
      hasCart: Boolean(cart),
      anchors,
      daily: products.length - decor,
      decor,
      roommates,
      shared,
      perPerson,
    };
  }, [room, visible, analysis]);
}
type Design = NonNullable<ReturnType<typeof useDesign>>;

function Header({
  designs,
  value,
  onChange,
  label,
  d,
}: {
  designs: AccountRoomSummary[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  d: Design | null;
}) {
  const id = `compare-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={css.head}>
      <div className={css.pick}>
        <label htmlFor={id}>{label}</label>
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={css.select}>
          {designs.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      {d && (
        <>
          <div className={css.swatches}>
            <span aria-hidden="true">
              {d.meta.style.palette.slice(1, 4).map((c, i) => (
                <i key={i} style={{ background: c }} />
              ))}
            </span>
            <b>{d.meta.style.name}</b>
          </div>
          <h2 className={css.name}>{d.room.name}</h2>
          <p className={css.meta}>{[d.meta.place, d.meta.roomType, d.meta.dims].filter(Boolean).join(" · ")}</p>
          <Link href={`/room/${d.room.id}`} className={css.open}>
            Open this design <ArrowRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}

function Plan({ d, maxLen }: { d: Design | null; maxLen: number }) {
  const r = d?.room;
  return (
    <div className={`ds-plan-paper ${css.planBox}`}>
      {r && r.length_ft && r.width_ft && r.furniture ? (
        <div style={{ width: `${(r.length_ft / maxLen) * 100}%` }} role="img" aria-label={`${r.name} layout, drawn to scale`}>
          <RoomThumb lengthFt={r.length_ft} widthFt={r.width_ft} furniture={d.visible} outline={r.outline ?? null} className={css.thumb} />
        </div>
      ) : (
        <span className={css.noPlan}>No layout preview</span>
      )}
    </div>
  );
}

function Total({ d, other }: { d: Design; other: Design | null }) {
  if (d.cost === null) {
    return (
      <>
        Budget <strong>${d.room.budget}</strong> · total not recorded
      </>
    );
  }
  const left = d.room.budget - d.cost;
  const diff = other && other.cost !== null ? other.cost - d.cost : 0;
  return (
    <>
      <strong>${d.cost.toFixed(2)}</strong> of ${d.room.budget} ·{" "}
      {left >= 0 ? <span className={css.spare}>{usd(left)} to spare</span> : <span className={css.over}>{usd(-left)} over</span>}
      {diff >= 0.5 && <span className={css.cheaper}>{usd(diff)} cheaper</span>}
    </>
  );
}

function Fit({ d }: { d: Design }) {
  const a = d.analysis;
  if (!a) return <span className={css.muted}>Not recorded</span>;
  const warnings = a.issues.filter((i) => i.level === "warning").length;
  return (
    <>
      {warnings === 0 ? "Everything fits" : `${warnings} placement check${warnings === 1 ? "" : "s"} to review`}
      <small>
        ≈ {Math.round(a.openFloorFt2)} ft² open floor · {a.beds} of {d.room.occupants ?? 1} sleeping place
        {(d.room.occupants ?? 1) === 1 ? "" : "s"}
      </small>
    </>
  );
}

function Anchors({ d }: { d: Design }) {
  if (!d.hasCart) return <span className={css.muted}>Not recorded</span>;
  if (!d.anchors.length) return <span className={css.muted}>No anchor pieces in this list</span>;
  return (
    <ul className={css.anchors}>
      {d.anchors.map((a) => (
        <li key={a.label}>
          <span>{a.label}</span>
          <em title={a.product!.name}>{a.product!.name}</em>
        </li>
      ))}
    </ul>
  );
}

function Roommates({ d }: { d: Design }) {
  if (!d.roommates.length) return <span className={css.muted}>No roommates added</span>;
  return (
    <>
      {d.shared.length ? `Split: ${d.shared.join(", ").toLowerCase()}` : "Nothing split"}
      <small>{d.perPerson.map((p) => `${p.name}: ${p.count} item${p.count === 1 ? "" : "s"}`).join(" · ")}</small>
    </>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const { user, profile, loading, openAuthModal } = useAuth();
  const { openUpgrade } = useUpgrade();
  const canCompare = hasFeatures(profile);

  const [designs, setDesigns] = useState<AccountRoomSummary[] | null>(null);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const guardedRef = useRef(false);
  const promptedRef = useRef(false);

  // Logged-out visitors go home and get the login prompt.
  useEffect(() => {
    if (loading || user || guardedRef.current) return;
    guardedRef.current = true;
    router.replace("/");
    openAuthModal("profile");
  }, [loading, user, router, openAuthModal]);

  // Logged-in free users see the upgrade prompt (once).
  useEffect(() => {
    if (loading || !user || canCompare || promptedRef.current) return;
    promptedRef.current = true;
    openUpgrade("compare");
  }, [loading, user, canCompare, openUpgrade]);

  // Plus users: load the design library.
  useEffect(() => {
    if (loading || !user || !canCompare) return;
    let alive = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        const token = supabase
          ? (await supabase.auth.getSession()).data.session?.access_token
          : null;
        const res = await fetch("/api/account/rooms", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AccountRoomsResponse;
        if (!alive) return;
        setDesigns(data.rooms);
        // The My designs tray links here with ?a=<id>&b=<id>; otherwise the two newest.
        const params = new URLSearchParams(window.location.search);
        const has = (id: string | null) => Boolean(id && data.rooms.some((r) => r.id === id));
        const a = params.get("a"), b = params.get("b");
        if (has(a)) setAId(a!);
        else if (data.rooms[0]) setAId(data.rooms[0].id);
        if (has(b)) setBId(b!);
        else if (data.rooms[1]) setBId(data.rooms[1].id);
        track("designs_compared", { count: data.rooms.length });
      } catch {
        if (alive) setDesigns([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loading, user, canCompare]);

  const ready = !loading && Boolean(user);
  const A = useDesign(designs?.find((d) => d.id === aId));
  const B = useDesign(designs?.find((d) => d.id === bId));
  const maxLen = Math.max(A?.room.length_ft ?? 0, B?.room.length_ft ?? 0, 1);

  const intro = (
    <div className={css.intro}>
      <Link href="/rooms" className={css.back}>
        <ChevronLeft /> My designs
      </Link>
      <h1 className={css.h1}>
        <b>Side by</b>
        <i>side.</i>
      </h1>
      <p className={css.lede}>
        Put two of your saved rooms side by side before you commit to one. Read them across the five points that matter.
      </p>
    </div>
  );

  return (
    <PageShell>
      <div className={`ds-wrap ${css.page}`}>
        <div className={css.grid}>
          {intro}
          {!ready || (canCompare && designs === null) ? (
            <>
              <div className={css.skeleton} aria-busy="true" aria-label="Loading your designs" />
              <div className={css.skeleton} aria-hidden="true" />
            </>
          ) : !canCompare ? (
            <div className={css.state}>
              <span className="ds-tag" style={{ background: "var(--ds-ink)", color: "var(--ds-yellow)" }}>
                Plus feature
              </span>
              <h2>Comparison is part of Plus</h2>
              <p>Upgrade once and line up any two of your designs, budgets and all, to settle the debate.</p>
              <Link href="/pricing" className="ds-btn ds-btn--ink-yellow">
                See what Plus unlocks <ArrowRight />
              </Link>
            </div>
          ) : designs!.length < 2 ? (
            <div className={`${css.state} ${css.stateDashed}`}>
              <h2>Save two designs to compare</h2>
              <p>
                You have {designs!.length} saved. Plan another room, save it, and come back to lay them side by side.
              </p>
              <Link href="/plan" className="ds-btn ds-btn--ink-yellow">
                Plan another room <ArrowRight />
              </Link>
            </div>
          ) : (
            <>
              <Header designs={designs!} value={aId} onChange={setAId} label="Design A" d={A} />
              <Header designs={designs!} value={bId} onChange={setBId} label="Design B" d={B} />
              <Plan d={A} maxLen={maxLen} />
              <Plan d={B} maxLen={maxLen} />
              {A && B && (
                <dl className={css.rows}>
                  <div className={css.row}>
                    <dt>Total vs budget</dt>
                    <dd data-col="A"><Total d={A} other={B} /></dd>
                    <dd data-col="B"><Total d={B} other={A} /></dd>
                  </div>
                  <div className={css.row}>
                    <dt>Fit to your real room</dt>
                    <dd data-col="A"><Fit d={A} /></dd>
                    <dd data-col="B"><Fit d={B} /></dd>
                  </div>
                  <div className={css.row}>
                    <dt>Anchor pieces</dt>
                    <dd data-col="A"><Anchors d={A} /></dd>
                    <dd data-col="B"><Anchors d={B} /></dd>
                  </div>
                  <div className={css.row}>
                    <dt>Daily use vs decoration</dt>
                    <dd data-col="A">{A.hasCart ? `${A.daily} daily-use · ${A.decor} decor` : <span className={css.muted}>Not recorded</span>}</dd>
                    <dd data-col="B">{B.hasCart ? `${B.daily} daily-use · ${B.decor} decor` : <span className={css.muted}>Not recorded</span>}</dd>
                  </div>
                  <div className={css.row}>
                    <dt>Roommate coordination</dt>
                    <dd data-col="A"><Roommates d={A} /></dd>
                    <dd data-col="B"><Roommates d={B} /></dd>
                  </div>
                </dl>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

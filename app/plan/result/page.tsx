"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { matchTemplate, ALL_TEMPLATES } from "@/templates/template-matcher";
import { productsFor, productById, tierForBudget, totalFor } from "@/lib/catalog";
import { isPlusStyle } from "@/lib/styles";
import { useAuth } from "@/lib/auth-context";
import { isPaid } from "@/lib/plan";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { roomTypeLabel } from "@/lib/format";
import { formatDims } from "@/lib/schools";
import { fitTemplateToRoom } from "@/lib/layout-fit";
import type RoomCanvasType from "@/components/canvas/RoomCanvas";
import type { RoomCanvasHandle } from "@/components/canvas/RoomCanvas";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import BudgetTracker from "@/components/products/BudgetTracker";
import ProductPanel from "@/components/products/ProductPanel";
import ThingsToAddPanel from "@/components/products/ThingsToAddPanel";
import AddOverBudgetModal from "@/components/products/AddOverBudgetModal";
import ActionBar from "@/components/products/ActionBar";
import BuyAllButton from "@/components/products/BuyAllButton";
import PurchaseSurvey from "@/components/products/PurchaseSurvey";
import SavePrompt from "@/components/planner/SavePrompt";
import { BuyGateProvider } from "@/lib/buy-gate";
import type { Product, ProductCategory } from "@/lib/types";

// react-konva can't render on the server, so load the canvas client-side only.
const RoomCanvas = dynamic(() => import("@/components/canvas/RoomCanvas"), {
  ssr: false,
  loading: () => <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-ink/5" />,
}) as unknown as typeof RoomCanvasType;

function Skeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-ink/10" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-ink/5" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-ink/5" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-ink/5" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const canvasRef = useRef<RoomCanvasHandle>(null);
  const [hydrated, setHydrated] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [viewportH, setViewportH] = useState(0);
  // Piece whose "+" would push the cart over budget: held here until the user
  // confirms or backs out of AddOverBudgetModal.
  const [pendingAdd, setPendingAdd] = useState<Product | null>(null);
  const trackedRef = useRef(false);

  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const budget = usePlannerStore((s) => s.budget);
  const templateId = usePlannerStore((s) => s.templateId);
  const furniture = usePlannerStore((s) => s.furniture);
  const swaps = usePlannerStore((s) => s.swaps);
  const excluded = usePlannerStore((s) => s.excluded);
  const setExcluded = usePlannerStore((s) => s.setExcluded);
  const toggleExcluded = usePlannerStore((s) => s.toggleExcluded);
  const initLayout = usePlannerStore((s) => s.initLayout);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const rotateItem = usePlannerStore((s) => s.rotateItem);
  const resetLayout = usePlannerStore((s) => s.resetLayout);

  const { profile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();

  // sessionStorage-persisted store: wait for rehydration before any decisions.
  useEffect(() => {
    if (usePlannerStore.persist.hasHydrated()) setHydrated(true);
    const unsub = usePlannerStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!room) router.replace("/plan");
    else if (!style) router.replace("/plan/style");
    // Defense in depth: a free user who reached a Plus-gated style (e.g. a
    // stale store or a saved design) is sent back to the picker with the
    // upgrade prompt, rather than served a room they can't actually use.
    else if (!authLoading && isPlusStyle(style) && !isPaid(profile)) {
      openUpgrade("style");
      router.replace("/plan/style");
    }
  }, [hydrated, room, style, authLoading, profile, router, openUpgrade]);

  const match = useMemo(
    () =>
      room
        ? matchTemplate({
            length_ft: room.lengthFt,
            width_ft: room.widthFt,
            occupants: room.occupants,
            room_type: room.type,
          })
        : null,
    [room]
  );

  // Adopt the matched template's layout (once, or when the room changed),
  // refit to the actual room size: templates are authored at nominal dims.
  useEffect(() => {
    if (!hydrated || !match || !room) return;
    if (templateId !== match.template_id || !furniture) {
      initLayout(
        match.template_id,
        fitTemplateToRoom(
          match.template.furniture,
          match.template_id,
          room.lengthFt,
          room.widthFt
        )
      );
    }
  }, [hydrated, match, room, templateId, furniture, initLayout]);

  useEffect(() => {
    if (hydrated && room && style && !trackedRef.current) {
      trackedRef.current = true;
      track("design_completed");
    }
  }, [hydrated, room, style]);

  // Fullscreen editing: lock the page scroll, size the canvas to the viewport,
  // and let Escape close it.
  useEffect(() => {
    if (!fullscreen) return;
    const onResize = () => setViewportH(window.innerHeight);
    onResize();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const products = useMemo(() => {
    if (!style) return [];
    return productsFor(style, tierForBudget(budget), room?.bedSize).map((p) => {
      const swapId = swaps[p.category];
      return (swapId && productById(swapId)) || p;
    });
  }, [style, budget, swaps, room?.bedSize]);

  // Seed the cart / "Things to add" split once per plan: walk the auto-list in
  // priority order, keeping pieces while they fit the budget and parking the
  // overflow. Resets to null (re-seeds) whenever the style, budget, or room
  // changes; the user's manual add/remove is preserved otherwise.
  useEffect(() => {
    if (!hydrated || excluded !== null || products.length === 0) return;
    let remaining = budget;
    const overflow: ProductCategory[] = [];
    for (const p of products) {
      if (p.price <= remaining) remaining -= p.price;
      else overflow.push(p.category);
    }
    setExcluded(overflow);
  }, [hydrated, excluded, products, budget, setExcluded]);

  const cartProducts = useMemo(
    () => products.filter((p) => !(excluded ?? []).includes(p.category)),
    [products, excluded]
  );
  const availableProducts = useMemo(
    () => products.filter((p) => (excluded ?? []).includes(p.category)),
    [products, excluded]
  );

  if (!hydrated || !room || !style || !furniture || !templateId) {
    return <Skeleton />;
  }

  const dims = formatDims(room.lengthFt, room.widthFt);
  const total = totalFor(cartProducts);

  // Remove is always immediate; adding is immediate when it stays within budget,
  // and otherwise routes through the confirmation modal.
  function handleRemove(category: ProductCategory) {
    toggleExcluded(category);
    track("cart_item_removed", { category });
  }

  function handleAdd(product: Product) {
    if (total + product.price <= budget) {
      toggleExcluded(product.category);
      track("cart_item_added", { category: product.category });
    } else {
      setPendingAdd(product);
    }
  }

  function confirmAdd() {
    if (!pendingAdd) return;
    toggleExcluded(pendingAdd.category);
    track("cart_item_added", { category: pendingAdd.category });
    track("cart_add_over_budget_confirmed", { category: pendingAdd.category });
    setPendingAdd(null);
  }

  // One canvas element, mounted either inline or in the fullscreen overlay.
  // crossHighlight is off in fullscreen (no product list to light up).
  const canvas = (
    <RoomCanvas
      ref={canvasRef}
      roomL={room.lengthFt}
      roomW={room.widthFt}
      templateId={templateId}
      furniture={furniture}
      hiddenCategories={excluded ?? []}
      crossHighlight={!fullscreen}
      onMove={(id, x, y) => {
        moveItem(id, x, y);
        track("layout_edited", { item: id });
      }}
      onRotate={(id, dir) => {
        rotateItem(id, dir);
        track("layout_edited", { item: id, action: "rotate" });
      }}
      onReset={handleReset}
    />
  );

  // In fullscreen, cap the canvas width so the whole room fits the viewport
  // height (the canvas scales to fill its container width). This maximizes the
  // scale without forcing a scroll. Falls back to full width before measure.
  const fsMaxWidth =
    viewportH > 0 ? (room.lengthFt / room.widthFt) * (viewportH - 128) + 56 : undefined;

  function handleReset() {
    const t = ALL_TEMPLATES.find((x) => x.template_id === templateId);
    if (t && room)
      resetLayout(
        fitTemplateToRoom(t.furniture, t.template_id, room.lengthFt, room.widthFt)
      );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-10">
      <header className="rise">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Your room, <span className="hl">planned.</span>
        </h1>
        <p className="mt-1.5 font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
          {/* Text segments wrap at word boundaries; dims never split mid-string. */}
          {[college?.name, dorm?.name, roomTypeLabel(room)].filter(Boolean).join(" · ")}
          {dims && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="whitespace-nowrap">{dims}</span>
            </>
          )}
        </p>
        {room.dimsEstimated && <EstimatedDimsNote className="mt-1.5" />}
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Canvas panel */}
        <section className="rise" style={{ animationDelay: "80ms" }}>
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white p-1.5 sm:p-2">
            {!fullscreen && canvas}
          </div>
          <div className="mt-2 flex flex-col items-start gap-0.5">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-cobalt hover:text-cobalt"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
              </svg>
              Edit in fullscreen
            </button>
            <p className="text-[10px] leading-tight text-ink-soft/80">
              We recommend editing your room in fullscreen for more space.
            </p>
          </div>
          {match && !match.exact_match && (
            <p className="mt-2 text-xs text-ink-soft">
              Closest layout for your room size. Drag anything to make it yours.
            </p>
          )}
          <p className="mt-2 hidden text-xs text-ink-soft lg:block">
            Drag furniture to rearrange · click an item to rotate it with the corner
            buttons · items snap to a 6-inch grid · red outline means it doesn&apos;t fit
            there
          </p>
        </section>

        {/* Products panel. Wrapped in the buy gate so its Buy / Buy all links
            require sign-in for logged-out users and resume straight to Amazon
            afterward (lib/buy-gate). */}
        <BuyGateProvider>
          <section className="rise flex flex-col gap-3" style={{ animationDelay: "160ms" }}>
            <BudgetTracker total={total} budget={budget} />
            {/* Prominent "Buy all", in sync with the tracker above (same cart
                total). Hidden when the cart is empty. */}
            {cartProducts.length > 0 && (
              <BuyAllButton products={cartProducts} total={total} />
            )}
            <div className="lg:max-h-[68vh] lg:overflow-y-auto lg:pr-1">
              <ProductPanel
                products={cartProducts}
                bedSize={room.bedSize}
                onRemove={handleRemove}
              />
            </div>
            {/* Budget-aware companion: pieces trimmed from the auto-list or
                removed by hand, each with a "+" to move it back into the cart. */}
            <ThingsToAddPanel items={availableProducts} onAdd={handleAdd} />
          </section>
        </BuyGateProvider>
      </div>

      <ActionBar products={cartProducts} getPng={() => canvasRef.current?.exportPNG() ?? null} />
      <PurchaseSurvey cartTotal={total} />
      <SavePrompt />

      {/* Fullscreen editing overlay: the same canvas, scaled up to the viewport
          for easier drag-and-drop. Product highlighting is off here. */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-paper">
          <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-white px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-ink">
                {[dorm?.name, roomTypeLabel(room)].filter(Boolean).join(" · ")}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
                Fullscreen editing{dims ? ` · ${dims}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-cobalt hover:text-cobalt"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
              </svg>
              Exit fullscreen
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4">
            <div className="w-full" style={{ maxWidth: fsMaxWidth }}>
              {canvas}
            </div>
          </div>
        </div>
      )}

      {pendingAdd && (
        <AddOverBudgetModal
          product={pendingAdd}
          budget={budget}
          newTotal={total + pendingAdd.price}
          onConfirm={confirmAdd}
          onCancel={() => setPendingAdd(null)}
        />
      )}
    </div>
  );
}

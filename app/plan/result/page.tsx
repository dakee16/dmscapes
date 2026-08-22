"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { matchTemplate, ALL_TEMPLATES } from "@/templates/template-matcher";
import { productsFor, productById, tierForBudget, totalFor, extrasFor, isExtraCategory } from "@/lib/catalog";
import { isPlusStyle } from "@/lib/styles";
import { useAuth } from "@/lib/auth-context";
import { isPaid, isPro, isPlanMetered } from "@/lib/plan";
import { consumePlanCredit } from "@/lib/plan-credits";
import { generateVibe } from "@/lib/vibe-client";
import BrandLoader from "@/components/site/BrandLoader";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { furnitureCategory } from "@/lib/highlight";
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
import ProductTabSwitcher, { type ProductTab } from "@/components/products/ProductTabSwitcher";
import AddOverBudgetModal from "@/components/products/AddOverBudgetModal";
import AddOwnItemModal from "@/components/products/AddOwnItemModal";
import ProductCard from "@/components/products/ProductCard";
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
  const [showAddOwn, setShowAddOwn] = useState(false);
  const [pendingOwn, setPendingOwn] = useState<{ product: Product; place: boolean } | null>(null);
  // Which product tab is showing: the cart ("Shopping list") or the catalog.
  const [activeTab, setActiveTab] = useState<ProductTab>("list");
  const [regenerating, setRegenerating] = useState(false);
  const trackedRef = useRef(false);

  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const budget = usePlannerStore((s) => s.budget);
  // Custom vibe: products come from the live pipeline, and the vibe text stands
  // in for the style name everywhere a style name would show.
  const customVibe = usePlannerStore((s) => s.customVibe);
  const customProducts = usePlannerStore((s) => s.customProducts);
  const customMock = usePlannerStore((s) => s.customMock);
  const customRegenUsed = usePlannerStore((s) => s.customRegenUsed);
  const setCustomResult = usePlannerStore((s) => s.setCustomResult);
  const markCustomRegen = usePlannerStore((s) => s.markCustomRegen);
  const templateId = usePlannerStore((s) => s.templateId);
  const furniture = usePlannerStore((s) => s.furniture);
  const swaps = usePlannerStore((s) => s.swaps);
  const excluded = usePlannerStore((s) => s.excluded);
  const setExcluded = usePlannerStore((s) => s.setExcluded);
  const toggleExcluded = usePlannerStore((s) => s.toggleExcluded);
  const customItems = usePlannerStore((s) => s.customItems);
  const unplacedItemIds = usePlannerStore((s) => s.unplacedItemIds);
  const addCustomItem = usePlannerStore((s) => s.addCustomItem);
  const placeCustomItem = usePlannerStore((s) => s.placeCustomItem);
  const removeCustomItem = usePlannerStore((s) => s.removeCustomItem);
  const initLayout = usePlannerStore((s) => s.initLayout);
  const moveItem = usePlannerStore((s) => s.moveItem);
  const rotateItem = usePlannerStore((s) => s.rotateItem);
  const resetLayout = usePlannerStore((s) => s.resetLayout);

  const { profile, loading: authLoading, refreshProfile } = useAuth();
  const { openUpgrade } = useUpgrade();
  const isCustom = style === "custom";

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
    // Custom vibe is Pro-only: a non-Pro who reached it (stale store / shared
    // link) is sent back to the picker with the Pro prompt.
    else if (!authLoading && style === "custom" && !isPro(profile)) {
      openUpgrade("custom-vibe");
      router.replace("/plan/style");
    }
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
    // Custom vibe: the pipeline already produced the products (not the catalog),
    // so swaps/extras don't apply, render them straight through.
    if (style === "custom") return customProducts ?? [];
    const core = productsFor(style, tierForBudget(budget), room?.bedSize).map((p) => {
      const swapId = swaps[p.category];
      return (swapId && productById(swapId)) || p;
    });
    // Catalog-only "extras": genuinely new categories the auto-list never uses.
    // They're appended so the whole add/remove machinery works uniformly, and
    // the seed below always parks them so they start in the Catalog, not the cart.
    return [...core, ...extrasFor(style)];
  }, [style, budget, swaps, room?.bedSize, customProducts]);

  // Seed the cart / "Things to add" split once per plan: walk the auto-list in
  // priority order, keeping pieces while they fit the budget and parking the
  // overflow. Resets to null (re-seeds) whenever the style, budget, or room
  // changes; the user's manual add/remove is preserved otherwise.
  useEffect(() => {
    if (!hydrated || excluded !== null || products.length === 0) return;
    let remaining = budget;
    const overflow: ProductCategory[] = [];
    for (const p of products) {
      // Extras never auto-seed into the cart: they always start parked in the
      // Catalog so adding one is a deliberate, budget-affecting choice.
      if (isExtraCategory(p.category)) {
        overflow.push(p.category);
        continue;
      }
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
  // Custom ("Add your own item") products always ride in the cart regardless of
  // the category-based excluded split, and count toward the budget.
  const allCartProducts = [...cartProducts, ...customItems];
  const unplacedCustomItems = customItems.filter((cp) => unplacedItemIds.includes(cp.id));
  const total = totalFor(allCartProducts);

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

  // "Add your own item": a confident category match auto-places it on the canvas;
  // otherwise it lands in the unplaced tray for the user to place by hand.
  function handleOwnResolved(product: Product, category: ProductCategory | null) {
    const place = category !== null;
    if (total + product.price <= budget) {
      addCustomItem(product, place);
      track("own_item_added", { category: category ?? "uncategorized", placed: place });
    } else {
      setPendingOwn({ product, place });
    }
  }
  function confirmOwn() {
    if (!pendingOwn) return;
    addCustomItem(pendingOwn.product, pendingOwn.place);
    track("own_item_added", { over_budget: true, placed: pendingOwn.place });
    setPendingOwn(null);
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
      onDeleteItem={(f) => {
        const cat = furnitureCategory(f);
        if (cat) handleRemove(cat);
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

  // One free regeneration per vibe (same description, new pass); after that each
  // pass spends a plan credit via the existing logic. Pro is unlimited, so the
  // credit branch is a no-op for the only audience today.
  async function handleRegenerate() {
    if (regenerating || !isCustom || !customVibe || !room) return;
    const free = !customRegenUsed;
    if (!free && isPlanMetered(profile)) {
      const { blocked } = await consumePlanCredit();
      if (blocked) {
        openUpgrade("plan-credits");
        return;
      }
      await refreshProfile();
    }
    setRegenerating(true);
    const result = await generateVibe({
      vibe: customVibe,
      budget,
      bedSize: room.bedSize,
      seed: free ? 1 : Math.floor(Math.random() * 4) + 2,
    });
    setRegenerating(false);
    if (result.ok && result.products && result.products.length > 0) {
      if (free) markCustomRegen();
      setCustomResult(customVibe, result.products, result.mock ?? false);
      track("custom_vibe_regenerated", { free });
    }
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

        {/* Custom vibe: the user's own words stand in for a style name, plus the
            one-free-regeneration control and an honest sample-data note. */}
        {isCustom && customVibe && (
          <div className="mt-3">
            <p className="max-w-xl font-display text-base font-semibold italic leading-snug text-ink">
              &ldquo;{customVibe}&rdquo;
            </p>
            {customMock && (
              <p className="mt-2 max-w-xl text-[11px] leading-snug text-ink-soft/90">
                Sample matches for now. Live Amazon results switch on once
                Product Advertising API access is enabled.
              </p>
            )}
          </div>
        )}
      </header>

      {/* Item 6: the one free regeneration, a standalone centered control just
          below the header. */}
      {isCustom && customVibe && (
        <div className="mt-5 flex flex-col items-center gap-1.5 rise">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-cobalt hover:text-cobalt disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v5h-5" />
            </svg>
            {regenerating ? "Regenerating…" : "Regenerate matches"}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
            {customRegenUsed ? "New matches, same vibe" : "One free regeneration"}
          </span>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Canvas panel */}
        <section className="rise" style={{ animationDelay: "80ms" }}>
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white p-1.5 sm:p-2">
            {!fullscreen && canvas}
          </div>
          {/* Unplaced tray: custom items we couldn't confidently categorize.
              "Place" drops the item on the canvas (centered); the existing drag
              handles then let the user position it exactly. */}
          {unplacedCustomItems.length > 0 && (
            <div className="mt-2 rounded-xl border border-amber/40 bg-amber/[0.06] p-2.5">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
                Unplaced items · drop onto your room
              </p>
              <div className="flex flex-wrap gap-2">
                {unplacedCustomItems.map((cp) => (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => {
                      placeCustomItem(cp.id);
                      track("layout_edited", { item: cp.id, action: "place" });
                    }}
                    title={`Place ${cp.name} on your room`}
                    className="flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-2 py-1.5 text-left transition-colors hover:border-cobalt"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cp.image_url} alt="" className="h-8 w-8 shrink-0 rounded border border-ink/5 object-contain" />
                    <span className="max-w-[9rem] truncate text-xs font-medium text-ink">{cp.name}</span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt">Place →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
            Drag furniture to rearrange · click an item, then use the toolbar to
            rotate, hide, lock, or delete it · items snap to a 6-inch grid · red
            outline means it doesn&apos;t fit there
          </p>
          {/* Honest, matter-of-fact placement disclaimer, same spirit as the
              estimated-dimensions note. ToS is cross-referenced, not duplicated. */}
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft/90">
            <svg viewBox="0 0 24 24" className="mt-px h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11.5v4.5" strokeLinecap="round" />
              <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
            </svg>
            <span>
              Placement and fit shown here are a guide, not a guarantee. Your real
              room may vary with the exact pieces you buy, how you arrange them,
              and layout quirks our data can&apos;t capture. See our{" "}
              <a href="/terms" className="underline underline-offset-2 hover:text-ink">Terms</a>.
            </span>
          </p>
        </section>

        {/* Products panel. Wrapped in the buy gate so its Buy / Buy all links
            require sign-in for logged-out users and resume straight to Amazon
            afterward (lib/buy-gate). */}
        <BuyGateProvider>
          <section className="rise flex flex-col gap-3" style={{ animationDelay: "160ms" }}>
            {/* Budget total + progress: always visible above the tabs, and always
                reflecting the shopping list specifically (not the catalog). */}
            <BudgetTracker total={total} budget={budget} />
            {/* Island-style tab switcher, directly above Buy all. */}
            <ProductTabSwitcher active={activeTab} onChange={setActiveTab} />
            {/* Add-your-own-item: paste an Amazon link to pull a real product into
                the list + budget (Part 2). Sits right under the tabs. */}
            <button
              type="button"
              onClick={() => setShowAddOwn(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-cobalt/40 bg-cobalt/[0.05] px-4 py-2.5 text-sm font-semibold text-cobalt transition-colors hover:border-cobalt hover:bg-cobalt/10"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add your own item
            </button>
            {/* Prominent "Buy all": stays visible on either tab (it reflects the
                cart total). Hidden only when the cart itself is empty. */}
            {allCartProducts.length > 0 && (
              <BuyAllButton products={allCartProducts} total={total} />
            )}
            {/* Active tab body. Keyed on the tab so switching re-triggers the
                quick fade rather than swapping abruptly. */}
            <div className="lg:max-h-[62vh] lg:overflow-y-auto lg:pr-1">
              <div key={activeTab} className="fade-in">
                {activeTab === "list" ? (
                  <div className="space-y-4">
                    <ProductPanel
                      products={cartProducts}
                      bedSize={room.bedSize}
                      onRemove={handleRemove}
                    />
                    {customItems.length > 0 && (
                      <div className="space-y-2.5">
                        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-cobalt">
                          Your added items
                        </p>
                        {customItems.map((cp) => (
                          <div key={cp.id}>
                            {unplacedItemIds.includes(cp.id) && (
                              <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-amber">
                                Unplaced · drop it from the tray onto your room
                              </p>
                            )}
                            <ProductCard product={cp} onRemove={() => removeCustomItem(cp.id)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <ThingsToAddPanel items={availableProducts} onAdd={handleAdd} />
                )}
              </div>
            </div>
          </section>
        </BuyGateProvider>
      </div>

      <ActionBar products={allCartProducts} getPng={() => canvasRef.current?.exportPNG() ?? null} />
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

      {pendingOwn && (
        <AddOverBudgetModal
          product={pendingOwn.product}
          budget={budget}
          newTotal={total + pendingOwn.product.price}
          onConfirm={confirmOwn}
          onCancel={() => setPendingOwn(null)}
        />
      )}
      {showAddOwn && (
        <AddOwnItemModal onClose={() => setShowAddOwn(false)} onAdd={handleOwnResolved} />
      )}

      {regenerating && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-paper/95 px-6 text-center backdrop-blur-sm">
          <BrandLoader label="Re-matching your vibe…" />
        </div>
      )}
    </div>
  );
}

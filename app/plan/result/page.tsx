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
import { placeInPolygon } from "@/lib/place-in-polygon";
import type RoomCanvasType from "@/components/canvas/RoomCanvas";
import type { RoomCanvasHandle } from "@/components/canvas/RoomCanvas";
import { useLayoutHistory } from "@/components/canvas/useLayoutHistory";
import Modal from "@/components/site/Modal";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import BudgetTracker from "@/components/products/BudgetTracker";
import ProductPanel from "@/components/products/ProductPanel";
import ThingsToAddPanel from "@/components/products/ThingsToAddPanel";
import ProductTabSwitcher, { type ProductTab } from "@/components/products/ProductTabSwitcher";
import AddOverBudgetModal from "@/components/products/AddOverBudgetModal";
import AddOwnItemModal from "@/components/products/AddOwnItemModal";
import ProductCard from "@/components/products/ProductCard";
import PlannerStudio from "@/components/studio/PlannerStudio";
import { roomOutline } from "@/lib/studio";
import BuyAllButton from "@/components/products/BuyAllButton";
import PurchaseSurvey from "@/components/products/PurchaseSurvey";
import SavePrompt from "@/components/planner/SavePrompt";
import VibeLoading from "@/components/planner/VibeLoading";
import { BuyGateProvider } from "@/lib/buy-gate";
import type { Product, ProductCategory } from "@/lib/types";

// react-konva can't render on the server, so load the canvas client-side only.
const RoomCanvas = dynamic(() => import("@/components/canvas/RoomCanvas"), {
  ssr: false,
  loading: () => <div className="grid min-h-[360px] place-items-center"><BrandLoader label="Opening your 2D plan…"/></div>,
}) as unknown as typeof RoomCanvasType;

function Skeleton() {
  return <div className="grid min-h-[60svh] place-items-center px-5"><BrandLoader label="Bringing your room together…"/></div>;
}

export default function ResultPage() {
  const layoutHistory = useLayoutHistory();
  const router = useRouter();
  const canvasRef = useRef<RoomCanvasHandle>(null);
  const [hydrated, setHydrated] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
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

  // A hand-drawn, non-rectangular room (L / T / U): the box templates can't lay
  // it out, so we place furniture against the drawn walls instead. A drawn
  // *rectangle* still uses the polished template pipeline (its outline is a plain
  // box). `match.template.furniture` is just the parts list for the occupancy.
  const drawnOutline =
    room?.source === "drawn" && room.outline && room.outline.points.length > 4
      ? room.outline
      : null;

  // Initialize only when furniture is absent. setRoom clears the previous layout;
  // editing walls and reopening saved rooms must keep their arrangement.
  // refit to the actual room size: templates are authored at nominal dims.
  useEffect(() => {
    if (!hydrated || !match || !room) return;
    const wantId = drawnOutline ? "custom-drawn" : match.template_id;
    if (!furniture) {
      const placed = drawnOutline
        ? placeInPolygon(match.template.furniture, drawnOutline, room.lengthFt, room.widthFt)
        : fitTemplateToRoom(match.template.furniture, match.template_id, room.lengthFt, room.widthFt);
      initLayout(wantId, placed);
    }
  }, [hydrated, match, room, templateId, furniture, initLayout, drawnOutline]);

  useEffect(() => {
    if (hydrated && room && style && !trackedRef.current) {
      trackedRef.current = true;
      track("design_completed");
    }
  }, [hydrated, room, style]);

  // The shared Modal handles focus and scroll locking; Escape exits the studio.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
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
  // "Add your own item" is a Plus feature: Plus + Pro only. Free/Flex see a lock
  // and get the Plus prompt on click.
  const ownItemLocked = !authLoading && !isPaid(profile);
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
      outline={roomOutline(room)}
      hiddenCategories={excluded ?? []}
      crossHighlight={!fullscreen}
      history={layoutHistory}
      fullscreen={fullscreen}
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

  function handleReset() {
    // Drawn polygon: re-run the wall placer. Otherwise restore the template.
    if (drawnOutline && match && room) {
      resetLayout(placeInPolygon(match.template.furniture, drawnOutline, room.lengthFt, room.widthFt));
      return;
    }
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
    <div>
      <PlannerStudio canvas={canvas} get2DPng={()=>canvasRef.current?.exportPNG()??null}
        products={allCartProducts} total={total} budget={budget} history={layoutHistory} onReset={handleReset}
        subtitle={[college?.name,dorm?.name,roomTypeLabel(room),dims,room.dimsEstimated?"Estimated room size":null].filter(Boolean).join(" · ")}
        extras={isCustom&&customVibe?<div className="dm-regenerate-row flex flex-wrap items-center gap-3">
          <p className="text-sm italic">{customVibe}</p>
          <button type="button" onClick={handleRegenerate} disabled={regenerating} className="border border-ink/20 px-3 py-2 text-xs">{regenerating?"Regenerating…":"Regenerate matches"}</button>
          <span className="text-xs text-ink-soft">{customRegenUsed?"New matches, same vibe":"One free regeneration"}</span>
          {customMock&&<p className="basis-full text-xs text-ink-soft">Sample matches. Live results appear when product access is available.</p>}
        </div>:null}
        unplaced={unplacedCustomItems.length>0?<div><p className="mb-2 text-xs font-semibold">Unplaced items</p><div className="flex flex-wrap gap-2">{unplacedCustomItems.map(cp=><button key={cp.id} type="button" onClick={()=>placeCustomItem(cp.id)} className="border border-ink/20 px-3 py-2 text-xs">Place {cp.name} ↗</button>)}</div></div>:null}
        shopping={<BuyGateProvider>
          <section className="dm-shopping-panel rise flex flex-col gap-3" style={{ animationDelay: "160ms" }}>
            {/* Budget total + progress: always visible above the tabs, and always
                reflecting the shopping list specifically (not the catalog). */}
            <BudgetTracker total={total} budget={budget} />
            {/* Island-style tab switcher, directly above Buy all. */}
            <ProductTabSwitcher active={activeTab} onChange={setActiveTab} />
            {/* Add-your-own-item: paste an Amazon link to pull a real product into
                the list + budget (Part 2). Sits right under the tabs. */}
            <button
              type="button"
              onClick={() => {
                if (!isPaid(profile)) {
                  openUpgrade("own-item");
                  return;
                }
                setShowAddOwn(true);
              }}
              aria-label={ownItemLocked ? "Add your own item (Plus feature)" : "Add your own item"}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-cobalt/40 bg-cobalt/[0.05] px-4 py-2.5 text-sm font-semibold text-cobalt transition-colors hover:border-cobalt hover:bg-cobalt/10"
            >
              {ownItemLocked ? (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              )}
              Add your own item
              {ownItemLocked && (
                <span className="ml-1 inline-flex items-center rounded-full bg-highlight px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink">
                  Plus
                </span>
              )}
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
        </BuyGateProvider>}
      />
      <PurchaseSurvey cartTotal={total} />
      <SavePrompt />
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
        <VibeLoading description={customVibe ?? ""} budget={budget} regenerating />
      )}

    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { matchTemplate } from "@/templates/template-matcher";
import { productsFor, productById, tierForBudget, totalFor, extrasFor, isExtraCategory } from "@/lib/catalog";
import { isPlusStyle } from "@/lib/styles";
import { useAuth } from "@/lib/auth-context";
import { isPaid, isPro, canGeneratePlan } from "@/lib/plan";
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
import { syncProductFurniture } from "@/lib/product-model";
import type RoomCanvasType from "@/components/canvas/RoomCanvas";
import type { RoomCanvasHandle } from "@/components/canvas/RoomCanvas";
import { useLayoutHistory } from "@/components/canvas/useLayoutHistory";
import Modal from "@/components/site/Modal";
import EstimatedDimsNote from "@/components/room/EstimatedDimsNote";
import AddOverBudgetModal from "@/components/products/AddOverBudgetModal";
import AddOwnItemModal from "@/components/products/AddOwnItemModal";
import ShoppingList from "@/components/products/ShoppingList";
import WorkspaceStudio from "@/components/studio/WorkspaceStudio";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import OpenWorkspaceButton from "@/components/workspace/OpenWorkspaceButton";
import PlannerStudio from "@/components/studio/PlannerStudio";
import { roomOutline } from "@/lib/studio";
import PurchaseSurvey from "@/components/products/PurchaseSurvey";
import SavePrompt from "@/components/planner/SavePrompt";
import VibeLoading from "@/components/planner/VibeLoading";
import { BuyGateProvider } from "@/lib/buy-gate";
import { assignedCosts, mergeArrangement, shoppingProducts } from "@/lib/planning";
import { ShoppingOwnership } from "@/components/studio/PlanningPanels";
import { StudioUIContext, entryMatcher, type StudioUIValue, type SwapGhost } from "@/components/studio-ui/StudioUI";
import { numberEntries, type ListEntry } from "@/components/studio-ui/list";
import { PlusIcon } from "@/components/studio-ui/icons";
import { placementIssues, studioSettings } from "@/lib/studio";
import r from "@/components/studio-ui/Result.module.css";
import type { Product, ProductCategory } from "@/lib/types";

// react-konva can't render on the server, so load the canvas client-side only.
const RoomCanvas = dynamic(() => import("@/components/canvas/RoomCanvas"), {
  ssr: false,
  loading: () => <div className="grid min-h-[360px] place-items-center"><BrandLoader label="Opening your 2D plan…"/></div>,
}) as unknown as typeof RoomCanvasType;

function Skeleton({ shell }: { shell: boolean }) {
  const loader = <BrandLoader label="Bringing your room together…"/>;
  return shell ? <main id="page-content" tabIndex={-1} className={r.skeleton}>{loader}</main> : <div className={r.skeleton}>{loader}</div>;
}

/**
 * The plan result: canvas and shopping list as one object. `shell` renders the
 * planner's own app bar and <main> (the /plan/result page); inside a My Room
 * workspace the room header around it belongs to the workspace page.
 */
export default function PlanResult({ shell = false }: { shell?: boolean }) {
  const workspace=useWorkspace();
  const Studio=workspace?WorkspaceStudio:PlannerStudio;
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
  // Swap sheet and its canvas ghost, the phone sheet, and the Add more section (UI only).
  const [swapTarget, setSwapTarget] = useState<Product | null>(null);
  const [ghostProduct, setGhostProduct] = useState<Product | null>(null);
  const [sheet, setSheet] = useState<"min" | "peek" | "full">(workspace ? "full" : "peek");
  const [addMoreOpen, setAddMoreOpen] = useState(false);
  const closeSwap = useCallback(() => { setSwapTarget(null); setGhostProduct(null); }, []);
  const previewSwap = useCallback((product: Product | null) => setGhostProduct(product), []);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const regeneratingRef = useRef(false);
  const trackedRef = useRef(false);

  const planning = usePlannerStore(s=>s.planning);
  const manual = planning.mode === "manual";
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
  const setItemRotation = usePlannerStore((s) => s.setItemRotation);
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
    else if (!workspace && !manual && !authLoading && style === "custom" && !isPro(profile)) {
      openUpgrade("custom-vibe");
      router.replace("/plan/style");
    }
    // Defense in depth: a free user who reached a Plus-gated style (e.g. a
    // stale store or a saved design) is sent back to the picker with the
    // upgrade prompt, rather than served a room they can't actually use.
    else if (!workspace && !manual && !authLoading && isPlusStyle(style) && !isPaid(profile)) {
      openUpgrade("style");
      router.replace("/plan/style");
    }
  }, [hydrated, room, style, authLoading, profile, router, openUpgrade, manual, workspace]);

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
      initLayout(wantId, manual ? placed.filter(f=>f.built_in).map((f,i)=>({...f,inventory:true,supply:"school",dimensions_source:"generic",assigned_to:planning.roommates.length?planning.roommates[Math.max(0,"ABCDEFGH".indexOf(f.owner))%planning.roommates.length].id:"shared"})) : placed);
    }
  }, [hydrated, match, room, templateId, furniture, initLayout, drawnOutline, manual, planning.roommates]);

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
    if(manual){setExcluded(products.map(p=>p.category));return;}
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
  }, [hydrated, excluded, products, budget, setExcluded, manual]);

  const cartProducts = useMemo(
    () => products.filter((p) => !(excluded ?? []).includes(p.category)),
    [products, excluded]
  );
  const availableProducts = useMemo(
    () => products.filter((p) => (excluded ?? []).includes(p.category)),
    [products, excluded]
  );

  useEffect(() => {
    if (!room || !furniture || excluded === null) return;
    const placedCustom = customItems.filter(p => furniture.some(f => f.id === p.id));
    const next = syncProductFurniture(furniture, [...cartProducts, ...placedCustom], room);
    if (next !== furniture) usePlannerStore.setState({furniture:next});
  }, [room, furniture, cartProducts, customItems, excluded]);

  // List numbers shared by the rows and the canvas pins.
  const entries = useMemo(() => numberEntries(cartProducts, customItems), [cartProducts, customItems]);
  const entryFor = useMemo(() => entryMatcher(entries), [entries]);

  // The swap preview: where the alternative would sit, and whether it still fits.
  const ghost = useMemo<SwapGhost | null>(() => {
    if (!ghostProduct || !room || !furniture) return null;
    const next = syncProductFurniture(furniture, [ghostProduct], room);
    const items = next.filter((f, i) => f !== furniture[i]);
    if (!items.length) return null;
    const ids = new Set(items.map((f) => f.id));
    const fits = !placementIssues(next, room, studioSettings(room.studio)).some((issue) => ids.has(issue.id));
    return { product: ghostProduct, items, replaces: furniture.filter((f) => ids.has(f.id)).map((f) => f.id), fits };
  }, [ghostProduct, room, furniture]);

  if (!hydrated || !room || !style || !furniture || !templateId) {
    return <Skeleton shell={shell} />;
  }

  const dims = formatDims(room.lengthFt, room.widthFt);
  // Custom ("Add your own item") products always ride in the cart regardless of
  // the category-based excluded split, and count toward the budget.
  const allCartProducts = [...cartProducts, ...customItems];
  const unplacedCustomItems = customItems.filter((cp) => unplacedItemIds.includes(cp.id));
  // "Add your own item" is a Plus feature: Plus + Pro only. Free/Flex see a lock
  // and get the Plus prompt on click.
  const ownItemLocked = !authLoading && !isPaid(profile) && !workspace?.ownerPro;
  const buyingProducts=shoppingProducts(allCartProducts,planning);
  const total = Object.values(assignedCosts(furniture,allCartProducts,planning)).reduce((a,b)=>a+b,0);

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

  function handleSwap(next: Product) {
    if (!swapTarget) return;
    const state=usePlannerStore.getState(),assignment=state.planning.productSupply[swapTarget.id];
    if(assignment){const supply={...state.planning.productSupply};delete supply[swapTarget.id];supply[next.id]=assignment;state.updatePlanning({productSupply:supply});}
    usePlannerStore.getState().swapProduct(swapTarget.category, next.id);
    track("product_swapped", { old: swapTarget.id, new: next.id });
    closeSwap();
    // Phone: drop the sheet back so the plan shows the new piece.
    setSheet("peek");
  }

  function handleEntryRemove(entry: ListEntry) {
    if (entry.custom) removeCustomItem(entry.product.id);
    else handleRemove(entry.product.category);
    usePlannerStore.getState().clearSelectedCategory();
  }

  function openAddOwn() {
    if (!isPaid(profile) && !workspace?.ownerPro) {
      openUpgrade("own-item");
      return;
    }
    setShowAddOwn(true);
  }

  const ui: StudioUIValue = {
    variant: workspace ? "workspace" : "planner",
    entries, entryFor, swapTarget,
    openSwap: (product) => { setGhostProduct(null); setSwapTarget(product); setSheet("full"); },
    closeSwap, ghost, previewSwap, applySwap: handleSwap, remove: handleEntryRemove,
    addOwn: openAddOwn, ownLocked: ownItemLocked, sheet, setSheet, addMoreOpen, setAddMoreOpen,
    showAddMore: () => { closeSwap(); setAddMoreOpen(true); setSheet("full"); },
  };

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
      onSetRotation={(id, degrees) => {
        setItemRotation(id, degrees);
        track("layout_edited", { item: id, action: "rotate" });
      }}
      onDeleteItem={(f) => {
        if(f.inventory){usePlannerStore.getState().removeInventoryItem(f.id);return;}
        const cat = furnitureCategory(f);
        if (cat) handleRemove(cat);
      }}
      onReset={handleReset}
    />
  );

  function handleReset() {
    if (!match || !room) return;
    const placed = drawnOutline
      ? placeInPolygon(match.template.furniture, drawnOutline, room.lengthFt, room.widthFt)
      : fitTemplateToRoom(match.template.furniture, match.template_id, room.lengthFt, room.widthFt);
    usePlannerStore.setState({templateId:drawnOutline ? "custom-drawn" : match.template_id});
    resetLayout(mergeArrangement(furniture!,placed,usePlannerStore.getState().lockedItemIds));
  }

  // One free regeneration per vibe; each subsequent pass uses one plan credit.
  async function handleRegenerate() {
    if (regeneratingRef.current || !isCustom || !customVibe || !room) return;
    if (!isPro(profile)) { openUpgrade("custom-vibe"); return; }
    const free = !customRegenUsed;
    setRegenError(null);
    if (!free && !canGeneratePlan(profile)) { openUpgrade("pro-credits"); return; }
    regeneratingRef.current = true;
    setRegenerating(true);
    try {
      const result = await generateVibe({
        vibe: customVibe, budget, bedSize: room.bedSize,
        seed: free ? 1 : Math.floor(Math.random() * 4) + 2,
      });
      if (result.ok && result.products?.length) {
        if (!free) {
          const { blocked } = await consumePlanCredit();
          void refreshProfile();
          if (blocked) { openUpgrade("pro-credits"); return; }
        }
        if (free) markCustomRegen();
        setCustomResult(customVibe, result.products, result.mock ?? false);
        track("custom_vibe_regenerated", { free });
      } else {
        setRegenError(result.error ?? "Couldn't find new matches. Your current room is unchanged.");
      }
    } catch (error) {
      setRegenError(error instanceof Error ? error.message : "Couldn't regenerate. Please try again.");
    } finally {
      regeneratingRef.current = false;
      setRegenerating(false);
    }
  }

  // Custom vibes: one free regeneration, then each pass uses a plan credit.
  const regen = !workspace&&isCustom&&customVibe?<div className={r.regen}>
          <p className={r.regenVibe}><span className={r.regenLabel}>Your vibe</span>{customVibe}</p>
          <button type="button" onClick={handleRegenerate} disabled={regenerating} className={r.regenButton}>
            <span>{regenerating?"Regenerating…":"Regenerate matches"}</span>
            <small>{customRegenUsed?"Uses 1 plan credit":"One free regeneration"}</small>
          </button>
          {regenError&&<p role="alert" className={r.regenError}>{regenError}</p>}
          {customMock&&<p className={r.regenNote}>Sample matches. Live results appear when product access is available.</p>}
        </div>:null;

  return (
    <StudioUIContext.Provider value={ui}>
    <BuyGateProvider>
      <Studio canvas={canvas} get2DPng={()=>canvasRef.current?.exportPNG()??null} focus2D={id=>canvasRef.current?.focusItem(id)} shell={shell}
        products={allCartProducts} total={total} budget={budget} history={layoutHistory} onReset={handleReset}
        subtitle={[college?.name,dorm?.name,roomTypeLabel(room),dims,room.dimsEstimated?"Estimated room size":null].filter(Boolean).join(" · ")}
        extras={null}
        headerAction={!workspace?<OpenWorkspaceButton/>:undefined}
        unplaced={unplacedCustomItems.length>0?<div className={r.unplaced}><p>Not on the plan yet</p><div>{unplacedCustomItems.map(cp=><button key={cp.id} type="button" onClick={()=>placeCustomItem(cp.id)}><PlusIcon size={14}/>Place {cp.name}</button>)}</div></div>:null}
        shopping={<ShoppingList total={total} budget={budget} bedSize={room.bedSize}
          available={availableProducts} onAdd={handleAdd}
          buying={buyingProducts} buyingTotal={totalFor(buyingProducts)}
          unplacedIds={unplacedItemIds} onPlace={placeCustomItem}
          ownership={workspace?<ShoppingOwnership products={allCartProducts}/>:undefined}
          extras={regen}/>}
      />
    </BuyGateProvider>
      <PurchaseSurvey cartTotal={total} />
      {!workspace&&<SavePrompt />}
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
    </StudioUIContext.Provider>
  );
}

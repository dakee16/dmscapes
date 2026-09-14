"use client";

import { useEffect, useRef, useState } from "react";
import { usePlannerStore } from "@/lib/store";
import type { FurnitureItem } from "@/lib/types";

type Snapshot = { furniture: FurnitureItem[] | null; hiddenItemIds: string[]; lockedItemIds: string[]; room: ReturnType<typeof usePlannerStore.getState>["room"] };
const LIMIT = 50;

/** Lives with the result page, so entering fullscreen keeps the undo history. */
export function useLayoutHistory() {
  const furniture = usePlannerStore(s => s.furniture);
  const hiddenItemIds = usePlannerStore(s => s.hiddenItemIds);
  const lockedItemIds = usePlannerStore(s => s.lockedItemIds);
  const excluded = usePlannerStore(s => s.excluded);
  const room = usePlannerStore(s => s.room);
  const previous = useRef<Snapshot>({ furniture, hiddenItemIds, lockedItemIds, room });
  const boundary = JSON.stringify([room?.lengthFt, room?.widthFt, room?.type, furniture?.map(f => f.id).sort(), excluded]);
  const previousBoundary = useRef(boundary);
  const restoring = useRef<string | null>(null);
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  useEffect(() => {
    const next = { furniture, hiddenItemIds, lockedItemIds, room };
    const key = JSON.stringify(next);
    if (boundary !== previousBoundary.current) {
      // Product additions/removals change the cart. Never resurrect them via undo.
      setPast([]); setFuture([]); restoring.current = null;
    } else if (key !== JSON.stringify(previous.current)) {
      if (key === restoring.current) restoring.current = null;
      else {
        const old = previous.current;
        setPast(items => [...items.slice(-(LIMIT - 1)), old]);
        setFuture([]);
      }
    }
    previous.current = next;
    previousBoundary.current = boundary;
  }, [furniture, hiddenItemIds, lockedItemIds, room, boundary]);

  function restore(snapshot: Snapshot) {
    restoring.current = JSON.stringify(snapshot);
    usePlannerStore.setState(snapshot);
  }
  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo() {
      const target = past.at(-1);
      if (!target) return;
      setPast(past.slice(0, -1));
      setFuture([previous.current, ...future]);
      restore(target);
    },
    redo() {
      const target = future[0];
      if (!target) return;
      setFuture(future.slice(1));
      setPast([...past, previous.current]);
      restore(target);
    },
  };
}

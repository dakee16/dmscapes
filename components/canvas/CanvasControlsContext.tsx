"use client";
import { createContext, useContext } from "react";
import type { OpeningControls } from "@/lib/room-editing";

export interface CanvasDock {
  host: HTMLElement | null;
  active: boolean;
  expanded: boolean;
  editOpenings: () => void;
  openings: OpeningControls;
  expand: () => void;
  reset: () => void;
  shop: () => void;
}
export const CanvasControlsContext = createContext<CanvasDock | null>(null);
export const useCanvasDock = () => useContext(CanvasControlsContext);

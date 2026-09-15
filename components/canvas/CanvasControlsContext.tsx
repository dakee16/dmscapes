"use client";
import { createContext, useContext } from "react";

export interface CanvasDock {
  host: HTMLElement | null;
  active: boolean;
  expanded: boolean;
  editRoom: () => void;
  expand: () => void;
  reset: () => void;
  shop: () => void;
}
export const CanvasControlsContext = createContext<CanvasDock | null>(null);
export const useCanvasDock = () => useContext(CanvasControlsContext);

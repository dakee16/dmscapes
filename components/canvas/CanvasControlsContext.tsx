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
  /** "Add a piece" in the tool rail: the list's Add more, or the furniture library. */
  addPiece?: () => void;
  /** The planner has undo/redo in its app bar; the workspace keeps them in the rail. */
  variant?: "planner" | "workspace";
}
export const CanvasControlsContext = createContext<CanvasDock | null>(null);
export const useCanvasDock = () => useContext(CanvasControlsContext);

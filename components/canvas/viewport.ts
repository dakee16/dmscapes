import { clamp } from "./geometry";

/** Fit both axes, keeping drawing dimensions independent from screen size. */
export function fitViewport(width: number, height: number, lengthFt: number, widthFt: number, padding = 46) {
  const scale = Math.max(0, Math.min((width - padding * 2) / lengthFt, (height - padding * 2) / widthFt));
  return { scale, x: (width - lengthFt * scale) / 2, y: (height - widthFt * scale) / 2 };
}

export function zoomAt(position: { x: number; y: number }, from: number, to: number, anchor: { x: number; y: number }) {
  return { x: anchor.x - (anchor.x - position.x) / from * to, y: anchor.y - (anchor.y - position.y) / from * to };
}

export function placedCoordinate(value: number, size: number, limit: number, snap: boolean) {
  const step = snap ? 2 : 12;
  return clamp(Math.round(value * step) / step, 0, Math.max(0, limit - size));
}

export function feetLabel(value: number) {
  const inches = Math.round(value * 12);
  return `${Math.floor(inches / 12)}′${inches % 12 ? `${inches % 12}″` : ""}`;
}

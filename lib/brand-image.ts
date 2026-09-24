export const BRAND_MARK_URL = "/brand/dormscape-mark.png?v=folded-room";

let image: HTMLImageElement | null = null;
/** Preload once for synchronous canvas exports. Never draw an old fallback mark. */
export function brandImage(): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (!image) { image = new Image(); image.src = BRAND_MARK_URL; }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

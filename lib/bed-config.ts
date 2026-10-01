import type { FurnitureItem } from "./types";

export type BedMode = NonNullable<FurnitureItem["bed_mode"]>;
export const BED_MODES: Record<BedMode, { label: string; height: number; underside: number; mattress: number; capacity: number }> = {
  standard: { label: "Standard", height: 2, underside: 1.3, mattress: 1.915, capacity: 1 },
  raised: { label: "Raised", height: 3.2, underside: 2.5, mattress: 3.115, capacity: 1 },
  lofted: { label: "Lofted", height: 6.2, underside: 4.65, mattress: 5.03, capacity: 1 },
  bunked: { label: "Bunked", height: 5.7, underside: 1.15, mattress: 4.641, capacity: 2 },
};
export function bedMode(f: FurnitureItem): BedMode | null {
  if (f.bed_mode) return f.bed_mode;
  if (/bunk/i.test([f.type, f.id, f.label].join(" "))) return "bunked";
  return f.type === "bed" ? "standard" : null;
}
export function bedMetrics(f: FurnitureItem) {
  const mode = bedMode(f);
  if (!mode) return null;
  const config = BED_MODES[mode], height = f.height_ft ?? config.height;
  const scale = height / config.height;
  return { ...config, height, underside: config.underside * scale, mattress: config.mattress * scale, mode };
}

"use client";

import { CampusMap, PaletteStudy } from "./StudioMotion";

export default function StudioPreview({
  vibe = "cozy",
  label,
  caption,
  variant = "campus",
}: {
  vibe?: string;
  label?: string;
  caption?: string;
  variant?: "campus" | "palette";
}) {
  return (
    <aside className="dm-studio-preview">
      <div className="dm-preview-top">
        <span className="dm-eyebrow">Dormscape / Studio</span>
        <span aria-hidden="true">✳︎</span>
      </div>
      <h2>{label ?? (variant === "palette" ? "Your palette" : "Find your campus")}</h2>
      {variant === "palette" ? <PaletteStudy vibe={vibe} /> : <CampusMap />}
      {caption && <div className="dm-preview-bottom"><span>{caption}</span></div>}
      {variant === "palette" && <p className="dm-preview-note">Style preview, not your room layout.</p>}
    </aside>
  );
}

"use client";

import { CampusMap, PaletteStudy } from "./StudioMotion";

export default function StudioPreview({
  vibe = "cozy",
  label = "A little room. A lot of possibility.",
  caption = "Your next chapter, taking shape.",
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
      <h2>{label}</h2>
      {variant === "palette" ? <PaletteStudy vibe={vibe} /> : <CampusMap />}
      <div className="dm-preview-bottom">
        <span>{caption}</span>
      </div>
      <p className="dm-preview-note">
        {variant === "palette" ? "Material study · Your exact floor plan comes next." : "Find your school, choose your hall, make it yours."}
      </p>
    </aside>
  );
}

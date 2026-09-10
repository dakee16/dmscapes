"use client";

import RoomModel from "./RoomModel";

export default function StudioPreview({
  vibe = "cozy",
  label = "A little room. A lot of possibility.",
  caption = "Your next chapter, taking shape.",
}: {
  vibe?: string;
  label?: string;
  caption?: string;
}) {
  return (
    <aside className="dm-studio-preview">
      <div className="dm-preview-top">
        <span className="dm-eyebrow">Dormscape / Studio</span>
        <span aria-hidden="true">✳</span>
      </div>
      <h2>{label}</h2>
      <RoomModel vibe={vibe} />
      <div className="dm-preview-bottom">
        <span>{caption}</span>
        <span className="dm-room-interaction-hint">↔ Drag to explore</span>
      </div>
      <p className="dm-preview-note">
        Style study · Your exact floor plan comes next.
      </p>
    </aside>
  );
}

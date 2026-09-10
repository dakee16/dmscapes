import RoomModel from "@/components/experience/RoomModel";

export default function Room3DScene({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`dm-room-scene ${className}`}>
      <RoomModel />
      <p className="dm-eyebrow text-center text-ink-soft">
        Concept preview <span className="dm-room-interaction-hint">· Drag to explore</span>
      </p>
    </div>
  );
}

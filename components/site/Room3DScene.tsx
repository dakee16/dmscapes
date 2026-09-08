import RoomModel from "@/components/experience/RoomModel";

export default function Room3DScene({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <RoomModel />
      <p className="dm-eyebrow text-center text-ink-soft">
        Concept preview · Drag to explore
      </p>
    </div>
  );
}

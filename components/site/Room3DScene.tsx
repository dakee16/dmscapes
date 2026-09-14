import { DesignStack } from "@/components/experience/StudioMotion";

export default function Room3DScene({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`dm-room-scene ${className}`}>
      <DesignStack />
      <p className="dm-eyebrow text-center text-ink-soft">
        Your floor plan. Your style. Your shopping list.
      </p>
    </div>
  );
}

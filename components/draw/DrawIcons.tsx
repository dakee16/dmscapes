/**
 * Line icons for the 2D drawing tool and the 3D builder (design-handoff
 * designs/site/Draw: 24px grid, round caps). Decorative: the buttons that use
 * them carry their own labels.
 */
type P = { size?: number; className?: string };

function Svg({ size = 20, className, children, strokeWidth = 2.2 }: P & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export const WallsIcon = (p: P) => <Svg {...p} strokeWidth={2.4}><path d="M4 20V4h12v8h4v8z" /></Svg>;
export const ShapeIcon = (p: P) => <Svg {...p}><path d="M5 3l14 8-6 2-2 6L5 3z" /></Svg>;
export const DoorIcon = (p: P) => <Svg {...p}><path d="M4 20h16M6 20V6" /><path d="M6 6a14 14 0 0 1 14 14" /></Svg>;
export const WindowIcon = (p: P) => <Svg {...p}><path d="M3 10h18M3 14h18" /></Svg>;
export const ClosetIcon = (p: P) => <Svg {...p}><rect x="4" y="8" width="16" height="8" /><path d="M8 8l4 8M12 8l4 8" /></Svg>;
export const HandIcon = (p: P) => <Svg {...p}><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 10.5v-6a1.5 1.5 0 0 1 3 0V11" /><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5a6.5 6.5 0 0 1-6.5 6.5h-.6a6 6 0 0 1-4.6-2.2L3 14.6a1.5 1.5 0 0 1 2.3-1.9L8 15.5" /></Svg>;
export const FloorIcon = (p: P) => <Svg {...p}><path d="M3 15l9-5 9 5-9 5z" /><path d="M3 15v1.5l9 5 9-5V15" /></Svg>;
export const OrbitIcon = (p: P) => <Svg {...p}><ellipse cx="12" cy="12" rx="9" ry="4" /><path d="M16.5 4.5A9 4 90 0 1 12 21" /><circle cx="12" cy="12" r="1.5" /></Svg>;
export const UndoIcon = (p: P) => <Svg {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>;
export const RedoIcon = (p: P) => <Svg {...p}><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Svg>;
export const InfoIcon = (p: P) => <Svg {...p} strokeWidth={2.4}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.5" /></Svg>;
export const SwingIcon = (p: P) => <Svg {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></Svg>;
export const TrashIcon = (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>;
export const PlusIcon = (p: P) => <Svg {...p} strokeWidth={2.6}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: P) => <Svg {...p} strokeWidth={2.6}><path d="M5 12h14" /></Svg>;

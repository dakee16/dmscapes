/**
 * Stroke icons for the studio (planner canvas, list, 3D). Drawn from the
 * design handoff (designs/planner/Planner.dc.html). Fonts carry no arrows, so
 * every arrow in the studio comes from here or components/ds/Icons.
 */
import type { ReactNode } from "react";

type P = { size?: number; className?: string; strokeWidth?: number };

function I({ size = 20, className, strokeWidth = 2.2, children }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

export const SelectIcon = (p: P) => <I {...p}><path d="M5 3l14 8-6 2-2 6L5 3z" /></I>;
export const PanIcon = (p: P) => <I {...p}><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" /></I>;
export const RulerIcon = (p: P) => <I {...p}><rect x="2" y="8" width="20" height="8" rx="1" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></I>;
export const PlusIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></I>;
export const MinusIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M5 12h14" /></I>;
export const RoomIcon = (p: P) => <I {...p}><path d="M4 4h16v16H4z" /><path d="M4 14h5M15 4v5" /></I>;
export const FitIcon = (p: P) => <I {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></I>;
export const UndoIcon = (p: P) => <I {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></I>;
export const RedoIcon = (p: P) => <I {...p}><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></I>;
export const RotateIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></I>;
export const SwapIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M7 7h13l-4-4M17 17H4l4 4" /></I>;
export const TrashIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></I>;
export const ShareIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 14v6h14v-6" /></I>;
export const PencilIcon = (p: P) => <I {...p}><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /></I>;
export const ChevronRight = (p: P) => <I strokeWidth={3} {...p}><path d="M9 6l6 6-6 6" /></I>;
export const ChevronDownIcon = (p: P) => <I strokeWidth={3} {...p}><path d="M6 9l6 6 6-6" /></I>;
export const ChevronLeft = (p: P) => <I strokeWidth={2.6} {...p}><path d="M15 6l-6 6 6 6" /></I>;
export const CheckIcon = (p: P) => <I strokeWidth={3.4} {...p}><path d="M5 12l5 5 9-10" /></I>;
export const AlertIcon = (p: P) => <I strokeWidth={2.6} {...p}><path d="M12 8v5M12 16.5h.01" /><circle cx="12" cy="12" r="9" /></I>;
export const UpRightIcon = (p: P) => <I strokeWidth={2.6} {...p}><path d="M7 17L17 7M9 7h8v8" /></I>;
export const GridIcon = (p: P) => <I {...p}><path d="M4 4h16v16H4zM4 12h16M12 4v16" /></I>;
export const MagnetIcon = (p: P) => <I {...p}><path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3Z" /><path d="M6 7h4m4 0h4" /></I>;
export const ExpandIcon = (p: P) => <I {...p}><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" /></I>;
export const MoreIcon = (p: P) => <I strokeWidth={3} {...p}><path d="M5 12h.01M12 12h.01M19 12h.01" /></I>;
export const LockIcon = (p: P) => <I {...p}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></I>;
export const UnlockIcon = (p: P) => <I {...p}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></I>;
export const EyeIcon = (p: P) => <I {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></I>;
export const EyeOffIcon = (p: P) => <I {...p}><path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.5 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></I>;
export const HelpIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .2c0 1.8-2.5 2.1-2.5 3.8M12 16.5h.01" /></I>;
export const ResetIcon = (p: P) => <I {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></I>;
export const CloseIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const BagIcon = (p: P) => <I {...p}><path d="M5 8h14l-1 13H6Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></I>;
export const PlanIcon = (p: P) => <I strokeWidth={2.4} {...p}><rect x="4" y="4" width="16" height="16" /><path d="M4 12h8V4" /></I>;
export const MoveIcon = PanIcon;
/** Lift a piece up / set it down (3D). */
export const RaiseIcon = (p: P) => <I {...p}><path d="M12 20V8M7 12.5l5-5 5 5M5 4h14" /></I>;
export const LowerIcon = (p: P) => <I {...p}><path d="M12 4v12M7 11.5l5 5 5-5M5 20h14" /></I>;
export const DownloadIcon = (p: P) => <I strokeWidth={2.4} {...p}><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></I>;
export const LinkIcon = (p: P) => <I {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></I>;
export const CompareIcon = (p: P) => <I {...p}><rect x="3" y="5" width="7" height="14" rx="1" /><rect x="14" y="5" width="7" height="14" rx="1" /></I>;
export const SunIcon = (p: P) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>;
export const SunsetIcon = (p: P) => <I {...p}><path d="M7 17a5 5 0 0 1 10 0M3 17h18M5 21h14M12 3v5M9 6l3 3 3-3M4.2 11.2l1.4 1.4M18.4 12.6l1.4-1.4" /></I>;
export const MoonIcon = (p: P) => <I {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></I>;
export const CameraIcon = (p: P) => <I {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></I>;
export const BookmarkIcon =(p: P) => <I {...p}><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z" /></I>;

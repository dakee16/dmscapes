import type { CSSProperties } from "react";
import Image from "next/image";
import st from "./SplitRoomArt.module.css";

/**
 * The My Room render: a double split down the middle by painter's tape, with
 * the room-call chip and Cooper's note (both decorative). Used by the /my-room
 * hero and the homepage's My Room section; each page sizes and places the
 * frame through `className`. `pop` pops the chip and note in on scroll
 * (data-pop); the /my-room hero shows them still.
 */
export default function SplitRoomArt({ className, sizes, preload = false, pop = false }: {
  className?: string;
  sizes: string;
  /** Above the fold (the /my-room hero): load it first. Otherwise it lazy-loads. */
  preload?: boolean;
  pop?: boolean;
}) {
  const reveal = pop ? { "data-pop": "" } : {};
  return (
    <div className={className ? `${st.art} ${className}` : st.art}>
      <Image src="/redesign/myroom-split-room-luke-cooper.jpg" alt="A dorm double split down the middle by a strip of blue painter's tape. One bed on the left, one on the right, and a shared mini fridge and round yellow rug in the middle, each tagged with its owner." fill preload={preload} quality={80} sizes={sizes} />
      <div className={st.callChip} aria-hidden="true" {...reveal}><span className={st.callFaces}><i>L</i><i>C</i></span>Room call<span className={st.callBars}><b /><b /><b /><b /></span></div>
      <div className={st.noteCard} aria-hidden="true" {...reveal} style={pop ? ({ "--i": 2 } as CSSProperties) : undefined}><i>C</i><span><span><strong>Cooper</strong> is bringing the <strong>mini fridge</strong> from home.</span><small>Shared · $0 to buy</small></span></div>
    </div>
  );
}

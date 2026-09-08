"use client";

import { useEffect, useRef, useState } from "react";
import { useExperienceMotion } from "./MotionProvider";

/** Native scrolling keeps touch, keyboard focus, and browser scrolling intact. */
export default function StyleGallery({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { paused } = useExperienceMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const first = node.firstElementChild as HTMLElement | null;
      if (first)
        setIndex(
          Math.min(
            count - 1,
            Math.round(node.scrollLeft / (first.offsetWidth + 24)),
          ),
        );
    };
    node.addEventListener("scroll", update, { passive: true });
    return () => node.removeEventListener("scroll", update);
  }, [count]);
  function move(direction: number) {
    const node = ref.current;
    const card = node?.firstElementChild as HTMLElement | null;
    if (node && card)
      node.scrollBy({
        left: direction * (card.offsetWidth + 24),
        behavior: paused ? "instant" : "smooth",
      });
  }
  return (
    <>
      <div
        className="dm-vibe-track"
        ref={ref}
        tabIndex={0}
        role="region"
        aria-label="Dorm styles. Scroll horizontally to explore."
      >
        {children}
      </div>
      <div className="dm-gallery-controls">
        <span className="dm-eyebrow">
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(count).padStart(2, "0")}
        </span>
        <span className="dm-gallery-rule">
          <i style={{ width: `${((index + 1) / count) * 100}%` }} />
        </span>
        <div>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Previous styles"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="Next styles"
          >
            →
          </button>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import { useExperienceMotion } from "./MotionProvider";

type RoomView = {
  setVibe: (value: string) => void;
  setProgress: (value: number) => void;
  setPaused: (value: boolean) => void;
  destroy: () => void;
};
type RoomModule = {
  createRoomView: (
    container: HTMLElement,
    options: { assembly: boolean; reduced: boolean },
  ) => RoomView;
};

/** A decorative style study; the planner's actual geometry stays in RoomCanvas. */
export default function RoomModel({
  className = "",
  vibe = "cozy",
  progress,
  assembly = false,
}: {
  className?: string;
  vibe?: string;
  progress?: MotionValue<number>;
  assembly?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<RoomView | null>(null);
  const { paused } = useExperienceMotion();
  const current = useRef({ vibe, paused, progress });
  current.current = { vibe, paused, progress };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let disposed = false;
    let loading = false;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        loading = true;
        observer.disconnect();
        try {
          const modulePath = "/experience/room.js";
          const module = (await import(
            /* webpackIgnore: true */ /* turbopackIgnore: true */ modulePath
          )) as RoomModule;
          if (disposed) return;
          const state = current.current;
          view.current = module.createRoomView(node, {
            assembly,
            reduced: state.paused,
          });
          view.current.setVibe(state.vibe);
          view.current.setProgress(
            state.paused ? 1 : (state.progress?.get() ?? 1),
          );
        } catch {
          // The local image remains a complete, useful fallback without WebGL.
          node.classList.remove("has-webgl");
          node.querySelector("canvas")?.remove();
          node.removeAttribute("tabindex");
          node.setAttribute(
            "aria-label",
            "Illustrative dorm room with blue bedding and warm wood furniture",
          );
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => {
      disposed = true;
      observer.disconnect();
      view.current?.destroy();
      view.current = null;
      node.classList.remove("has-webgl");
    };
  }, [assembly]);

  useEffect(() => {
    view.current?.setVibe(vibe);
  }, [vibe]);
  useEffect(() => {
    view.current?.setPaused(paused);
    view.current?.setProgress(paused ? 1 : (progress?.get() ?? 1));
    return progress?.on("change", (value) =>
      view.current?.setProgress(paused ? 1 : value),
    );
  }, [paused, progress]);

  return (
    <div
      ref={ref}
      className={`dm-room-model ${className}`}
      role="img"
      tabIndex={assembly ? undefined : 0}
      aria-label={
        assembly
          ? "Illustrative dorm room assembling as you scroll"
          : "Interactive dorm style study. Drag horizontally or use left and right arrow keys to rotate."
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/experience/room-diorama.webp"
        alt=""
        width={1536}
        height={1024}
        className="dm-room-fallback"
      />
    </div>
  );
}

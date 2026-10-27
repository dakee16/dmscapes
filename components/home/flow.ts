"use client";

import { useEffect } from "react";
import { useStill } from "@/components/ds/useStill";

type Events = typeof import("animejs/events");
type Animation = typeof import("animejs/animation");
export type Anime = { onScroll: Events["onScroll"]; animate: Animation["animate"] };
type ScrollParams = Parameters<Events["onScroll"]>[0];

let loading: Promise<Anime> | null = null;
/** anime.js loads after hydration and only on the homepage: just the scroll and animation modules. */
export function loadAnime(): Promise<Anime> {
  return (loading ??= Promise.all([import("animejs/events"), import("animejs/animation")]).then(([e, a]) => ({
    onScroll: e.onScroll,
    animate: a.animate,
  })));
}

/** Scrub one CSS variable on `el` from 0 to 1 with scroll (anime.js onScroll, synced). Returns its cleanup. */
export function scrub(A: Anime, el: HTMLElement | null, prop: string, params: ScrollParams) {
  if (!el) return () => {};
  const obs = A.onScroll({ sync: 0.2, ...params });
  const anim = A.animate(el, { [prop]: [0, 1], ease: "linear", duration: 1000, autoplay: obs });
  return () => {
    anim.revert();
    obs.revert();
  };
}

/**
 * Run a scroll scene once motion is allowed (not Motion off, not reduced
 * motion). `setup` gets anime.js and returns its cleanup. Returns whether the
 * page is still, so the scene can show its finished state instead.
 */
export function useScene(setup: (A: Anime) => (() => void) | void, deps: unknown[] = []) {
  const still = useStill();
  useEffect(() => {
    if (still) return;
    let dead = false;
    let off: (() => void) | void;
    loadAnime().then((A) => {
      if (!dead) off = setup(A);
    });
    return () => {
      dead = true;
      off?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, ...deps]);
  return still;
}

/** Wide screens pin the stepped scenes (the design's 1024 px break). */
export const isWide = () => window.innerWidth >= 1024;

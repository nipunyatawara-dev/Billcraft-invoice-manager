"use client";

import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export type PageEnterPhase =
  | "header"
  | "stats"
  | "section"
  | "actions"
  | "footer"
  | "stagger";

/** Soft decelerating ease — reads like the Autumn dashboard reveal. */
export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

const PHASE_DELAYS: Record<Exclude<PageEnterPhase, "stagger">, number> = {
  header: 0.04,
  stats: 0.12,
  section: 0.26,
  actions: 0.34,
  footer: 0.4,
};

type RevealMotion = {
  initial: false | { opacity: number; y: number; filter: string };
  animate?: { opacity: number; y: number; filter: string };
  transition?: {
    duration: number;
    delay: number;
    ease: typeof REVEAL_EASE;
  };
};

function buildReveal(
  skip: boolean,
  delay: number,
  y = 14,
  blur = 8,
  duration = 0.55,
): RevealMotion {
  if (skip) {
    return { initial: false as const };
  }

  return {
    initial: { opacity: 0, y, filter: `blur(${blur}px)` },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: {
      duration,
      delay,
      ease: REVEAL_EASE,
    },
  };
}

/**
 * Page-section entrance. Replays on every visit to the route (not session-gated)
 * so navigation always feels intentional. Respects prefers-reduced-motion.
 */
export function usePageEnterMotion(phase: Exclude<PageEnterPhase, "stagger">) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const skip = Boolean(reduced);

  return useMemo(
    () =>
      buildReveal(
        skip,
        PHASE_DELAYS[phase],
        phase === "header" ? 10 : 16,
        phase === "header" ? 6 : 8,
        phase === "header" ? 0.48 : 0.58,
      ),
    // pathname keeps motion identity stable per route mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, phase, skip],
  );
}

/**
 * Staggered children (stat cards, list rows, quick actions).
 * `baseDelay` is absolute seconds from page mount.
 */
export function useStaggerEnterMotion(index: number, baseDelay = 0.12, step = 0.07) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const skip = Boolean(reduced);

  return useMemo(
    () => buildReveal(skip, baseDelay + index * step, 14, 8, 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, index, baseDelay, step, skip],
  );
}

export function useRevealEnabled() {
  return !useReducedMotion();
}

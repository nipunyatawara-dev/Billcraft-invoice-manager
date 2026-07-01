"use client";

import { useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

export type PageEnterPhase = "header" | "section" | "actions" | "footer" | "stagger";

const PHASE_DELAYS: Record<Exclude<PageEnterPhase, "stagger">, number> = {
  header: 0.12,
  section: 0.2,
  actions: 0.26,
  footer: 0.32,
};

const STORAGE_PREFIX = "billcraft.motion.";

function motionKey(pathname: string, phase: PageEnterPhase) {
  return `${pathname}:${phase}`;
}

function hasPlayed(key: string) {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return sessionStorage.getItem(`${STORAGE_PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

function markPlayed(key: string) {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, "1");
  } catch {
    // ignore storage failures
  }
}

export function usePageEnterMotion(phase: Exclude<PageEnterPhase, "stagger">) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const key = motionKey(pathname, phase);
  const skip = reduced || hasPlayed(key);

  const onAnimationComplete = useCallback(() => {
    markPlayed(key);
  }, [key]);

  return useMemo(() => {
    if (skip) {
      return { initial: false as const };
    }

    return {
      initial: { opacity: 0, y: phase === "header" ? 8 : 14 },
      animate: { opacity: 1, y: 0 },
      transition: {
        duration: 0.32,
        delay: PHASE_DELAYS[phase],
        ease: [0.4, 0, 0.2, 1] as const,
      },
      onAnimationComplete,
    };
  }, [onAnimationComplete, phase, skip]);
}

export function useStaggerEnterMotion(index: number, baseDelay = 0.08) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const key = motionKey(pathname, "stagger");
  const skip = reduced || hasPlayed(key);

  const onAnimationComplete = useCallback(() => {
    if (index === 0) {
      markPlayed(key);
    }
  }, [index, key]);

  return useMemo(() => {
    if (skip) {
      return { initial: false as const };
    }

    return {
      initial: { opacity: 0, x: -6 },
      animate: { opacity: 1, x: 0 },
      transition: {
        duration: 0.24,
        delay: baseDelay + index * 0.05,
        ease: [0.4, 0, 0.2, 1] as const,
      },
      onAnimationComplete: index === 0 ? onAnimationComplete : undefined,
    };
  }, [baseDelay, index, onAnimationComplete, skip]);
}

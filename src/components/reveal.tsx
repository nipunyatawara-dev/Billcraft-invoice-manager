"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import {
  usePageEnterMotion,
  useStaggerEnterMotion,
  type PageEnterPhase,
} from "@/hooks/use-page-enter-motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Named page phase delays (header → stats → section → …). */
  phase?: Exclude<PageEnterPhase, "stagger">;
  /** When set, uses stagger timing instead of phase delay. */
  index?: number;
  /** Absolute base delay for stagger items (seconds). */
  baseDelay?: number;
  /** Gap between stagger items (seconds). */
  step?: number;
} & Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "transition">;

/**
 * Autumn-style blur + lift reveal. Wrap page sections / cards.
 * Prefer `phase` for major blocks; `index` for grids of peers.
 */
export function Reveal({
  children,
  className,
  phase = "section",
  index,
  baseDelay = 0.12,
  step = 0.07,
  ...rest
}: RevealProps) {
  const phaseMotion = usePageEnterMotion(phase);
  const staggerMotion = useStaggerEnterMotion(index ?? 0, baseDelay, step);
  const motionProps = index != null ? staggerMotion : phaseMotion;

  return (
    <motion.div className={cn(className)} {...motionProps} {...rest}>
      {children}
    </motion.div>
  );
}

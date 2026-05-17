"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createElement, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AnimatedTextEffect =
  | "soft-blur-in"
  | "micro-scale-fade"
  | "fade-through"
  | "per-word-crossfade"
  | "mask-reveal-up";

type AnimatedTextSplit = "auto" | "none" | "characters" | "words" | "lines";

type AnimatedTextProps<TElement extends ElementType = "span"> = {
  as?: TElement;
  text: string;
  effect?: AnimatedTextEffect;
  className?: string;
  delayMs?: number;
  split?: AnimatedTextSplit;
  ariaLabel?: string;
  replayKey?: string | number;
};

type MotionFrame = {
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  filter?: string;
};

type EffectSpec = {
  defaultSplit: Exclude<AnimatedTextSplit, "auto">;
  duration: number;
  stagger: number;
  easing: [number, number, number, number];
  from: MotionFrame;
  to: MotionFrame;
  exit: MotionFrame;
  exitDuration: number;
  exitEasing: [number, number, number, number];
};

const EFFECTS: Record<AnimatedTextEffect, EffectSpec> = {
  "soft-blur-in": {
    defaultSplit: "characters",
    duration: 0.9,
    stagger: 0.025,
    easing: [0.22, 1, 0.36, 1],
    from: { opacity: 0, y: 16, filter: "blur(12px)" },
    to: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -16, filter: "blur(12px)" },
    exitDuration: 0.6,
    exitEasing: [0.64, 0, 0.78, 0],
  },
  "micro-scale-fade": {
    defaultSplit: "none",
    duration: 0.6,
    stagger: 0,
    easing: [0.32, 0.72, 0, 1],
    from: { opacity: 0, scale: 0.96 },
    to: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    exitDuration: 0.4,
    exitEasing: [0.7, 0, 0.84, 0],
  },
  "fade-through": {
    defaultSplit: "none",
    duration: 0.42,
    stagger: 0,
    easing: [0.2, 0, 0, 1],
    from: { opacity: 0, y: 6, scale: 0.99, filter: "blur(2px)" },
    to: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, y: -4, scale: 1, filter: "blur(0px)" },
    exitDuration: 0.26,
    exitEasing: [0.4, 0, 1, 1],
  },
  "per-word-crossfade": {
    defaultSplit: "words",
    duration: 0.7,
    stagger: 0.07,
    easing: [0.16, 1, 0.3, 1],
    from: { opacity: 0, y: 8 },
    to: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    exitDuration: 0.5,
    exitEasing: [0.7, 0, 0.84, 0],
  },
  "mask-reveal-up": {
    defaultSplit: "lines",
    duration: 0.76,
    stagger: 0.09,
    easing: [0.22, 1, 0.36, 1],
    from: { opacity: 0, y: 30, filter: "blur(6px)" },
    to: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -22, filter: "blur(6px)" },
    exitDuration: 0.52,
    exitEasing: [0.64, 0, 0.78, 0],
  },
};

function getSplitMode(effect: AnimatedTextEffect, split: AnimatedTextSplit) {
  return split === "auto" ? EFFECTS[effect].defaultSplit : split;
}

function splitText(text: string, split: Exclude<AnimatedTextSplit, "auto">) {
  if (split === "none") {
    return [{ text, animated: true, breakAfter: false }];
  }

  if (split === "characters") {
    return Array.from(text).map((character) => ({
      text: character === " " ? "\u00a0" : character,
      animated: character !== " ",
      breakAfter: false,
    }));
  }

  if (split === "lines") {
    return text.split("\n").map((line, index, lines) => ({
      text: line,
      animated: line.length > 0,
      breakAfter: index < lines.length - 1,
    }));
  }

  return text.split(/(\s+)/).map((token) => ({
    text: token,
    animated: !/^\s+$/.test(token),
    breakAfter: false,
  }));
}

function withTransition(
  frame: MotionFrame,
  duration: number,
  ease: [number, number, number, number],
  delay: number,
) {
  return {
    ...frame,
    transition: { duration, ease, delay },
  };
}

export function AnimatedText<TElement extends ElementType = "span">({
  as,
  text,
  effect = "micro-scale-fade",
  className,
  delayMs = 0,
  split = "auto",
  ariaLabel,
  replayKey,
}: AnimatedTextProps<TElement>) {
  const shouldReduceMotion = useReducedMotion();
  const Tag = as || "span";
  const spec = EFFECTS[effect];
  const splitMode = getSplitMode(effect, split);
  const label = ariaLabel || text;
  const key = `${effect}-${splitMode}-${replayKey ?? text}`;

  if (shouldReduceMotion) {
    return createElement(Tag, { className, "aria-label": label }, text);
  }

  const delay = delayMs / 1000;
  const content = splitText(text, splitMode);
  let animatedIndex = 0;

  const visualContent = splitMode === "none" ? (
    <AnimatePresence mode="wait">
      <motion.span
        key={key}
        aria-hidden="true"
        className="inline-block whitespace-pre-wrap"
        initial={spec.from}
        animate={withTransition(spec.to, spec.duration, spec.easing, delay)}
        exit={withTransition(spec.exit, spec.exitDuration, spec.exitEasing, delay)}
      >
        {text}
      </motion.span>
    </AnimatePresence>
  ) : (
    <AnimatePresence mode="wait">
      <motion.span
        key={key}
        aria-hidden="true"
        className={cn(
          "inline-block whitespace-pre-wrap",
          splitMode === "lines" && "overflow-hidden",
        )}
      >
        {content.map((unit, index) => {
          const currentAnimatedIndex = unit.animated ? animatedIndex++ : -1;
          const unitNode: ReactNode = unit.animated ? (
            <motion.span
              key={`${unit.text}-${index}`}
              className={cn(
                "inline-block whitespace-pre-wrap will-change-transform",
                splitMode === "lines" && "block overflow-hidden",
              )}
              initial={spec.from}
              animate={withTransition(spec.to, spec.duration, spec.easing, delay + currentAnimatedIndex * spec.stagger)}
              exit={withTransition(spec.exit, spec.exitDuration, spec.exitEasing, delay + currentAnimatedIndex * spec.stagger * 0.6)}
            >
              {unit.text}
            </motion.span>
          ) : (
            <span key={`${unit.text}-${index}`} className="whitespace-pre-wrap">
              {unit.text}
            </span>
          );

          return (
            <span key={`${unit.text}-${index}-wrap`}>
              {unitNode}
              {unit.breakAfter && <br />}
            </span>
          );
        })}
      </motion.span>
    </AnimatePresence>
  );

  return createElement(
    Tag,
    {
      className,
      "aria-label": label,
    },
    visualContent,
  );
}

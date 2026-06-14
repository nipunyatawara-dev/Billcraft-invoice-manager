"use client";

import "slot-text/style.css";
import { SlotText } from "slot-text/react";

type AnimatedNumberProps = {
  value: number | string;
  className?: string;
  ariaLabel?: string;
};

export function AnimatedNumber({ value, className = "", ariaLabel }: AnimatedNumberProps) {
  const text = String(value);

  return (
    <SlotText
      text={text}
      className={className}
      aria-label={ariaLabel || text}
      role="text"
    />
  );
}

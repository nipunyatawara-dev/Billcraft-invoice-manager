"use client";

import "slot-text/style.css";
import { SlotText } from "slot-text/react";

type AnimatedNumberProps = {
  value: number | string;
  className?: string;
  ariaLabel?: string;
  title?: string;
};

export function AnimatedNumber({ value, className = "", ariaLabel, title }: AnimatedNumberProps) {
  const text = String(value);

  return (
    <SlotText
      text={text}
      className={`tabular-nums min-w-0 max-w-full truncate inline-block align-bottom ${className}`.trim()}
      aria-label={ariaLabel || text}
      title={title || ariaLabel || text}
      role="text"
    />
  );
}

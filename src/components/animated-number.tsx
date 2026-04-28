"use client";

type AnimatedNumberProps = {
  value: number | string;
  className?: string;
  ariaLabel?: string;
};

export function AnimatedNumber({ value, className = "", ariaLabel }: AnimatedNumberProps) {
  const text = String(value);

  return (
    <span className={`t-digit-group is-animating ${className}`.trim()} aria-label={ariaLabel || text} role="text">
      {Array.from(text).map((character, index) => (
        <span
          key={`${text}-${character}-${index}`}
          aria-hidden="true"
          className="t-digit"
          data-stagger={index}
          style={{ animationDelay: `calc(var(--digit-stagger) * ${index})` }}
        >
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </span>
  );
}

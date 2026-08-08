"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import BrightnessDownIcon from "@/components/icons/brightness-down-icon";
import MoonIcon from "@/components/icons/moon-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import { useAstryxAppearance } from "@/hooks/use-astryx-appearance";

type ThemeMode = "light" | "dark";

type ViewTransition = {
  finished: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransition;
};

export function ThemeToggle() {
  const { mode, setMode, darkOnly, hydrated } = useAstryxAppearance();
  const [isAnimating, setIsAnimating] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const sunIconRef = React.useRef<AnimatedIconHandle>(null);
  const moonIconRef = React.useRef<AnimatedIconHandle>(null);

  const activeTheme: ThemeMode =
    mode === "dark" ||
    (mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : mode === "light"
        ? "light"
        : typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

  const nextTheme: ThemeMode = activeTheme === "dark" ? "light" : "dark";

  const applyThemeToDocument = React.useCallback((theme: ThemeMode) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme !== "dark");
  }, []);

  const handleToggle = React.useCallback(
    (targetTheme: ThemeMode) => {
      if (darkOnly || isAnimating || activeTheme === targetTheme) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setMode(targetTheme);
        applyThemeToDocument(targetTheme);
        return;
      }

      const documentWithTransition = document as DocumentWithViewTransition;
      const startViewTransition = documentWithTransition.startViewTransition?.bind(
        documentWithTransition,
      );

      if (!startViewTransition) {
        setMode(targetTheme);
        applyThemeToDocument(targetTheme);
        return;
      }

      const root = document.documentElement;
      root.classList.remove("theme-to-dark", "theme-to-light");
      root.classList.add(targetTheme === "dark" ? "theme-to-dark" : "theme-to-light");
      setIsAnimating(true);

      const transition = startViewTransition(() => {
        flushSync(() => {
          setMode(targetTheme);
        });
        applyThemeToDocument(targetTheme);
      });

      transition.finished.catch(() => undefined).finally(() => {
        root.classList.remove("theme-to-dark", "theme-to-light");
        setIsAnimating(false);
      });
    },
    [activeTheme, applyThemeToDocument, darkOnly, isAnimating, setMode],
  );

  if (!hydrated) {
    return (
      <button className="h-10 w-10 shrink-0 flex items-center justify-center border border-card-border bg-card rounded-xl text-muted hover:text-foreground hover:border-foreground/20 transition-all shadow-xs">
        <BrightnessDownIcon size={20} />
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => handleToggle(nextTheme)}
      onMouseEnter={() => {
        if (activeTheme === "light") {
          sunIconRef.current?.startAnimation();
        } else {
          moonIconRef.current?.startAnimation();
        }
      }}
      onMouseLeave={() => {
        if (activeTheme === "light") {
          sunIconRef.current?.stopAnimation();
        } else {
          moonIconRef.current?.stopAnimation();
        }
      }}
      disabled={isAnimating || darkOnly}
      className="h-10 w-10 shrink-0 flex items-center justify-center border border-card-border bg-card rounded-xl text-muted hover:text-foreground hover:border-foreground/20 transition-all shadow-xs relative disabled:opacity-50"
      aria-label={darkOnly ? "Dark mode locked for Gothic theme" : `Switch to ${nextTheme} mode`}
      title={darkOnly ? "Gothic is dark-only" : undefined}
    >
      {activeTheme === "light" ? (
        <BrightnessDownIcon ref={sunIconRef} size={20} />
      ) : (
        <MoonIcon ref={moonIconRef} size={20} />
      )}
    </button>
  );
}

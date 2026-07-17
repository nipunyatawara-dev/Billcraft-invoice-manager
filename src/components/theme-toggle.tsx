"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import BrightnessDownIcon from "@/components/icons/brightness-down-icon";
import MoonIcon from "@/components/icons/moon-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";

type ThemeMode = "light" | "dark";

type ViewTransition = {
  finished: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (update: () => void | Promise<void>) => ViewTransition;
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const sunIconRef = React.useRef<AnimatedIconHandle>(null);
  const moonIconRef = React.useRef<AnimatedIconHandle>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";
  const nextTheme = activeTheme === "dark" ? "light" : "dark";

  const applyThemeToDocument = React.useCallback((theme: ThemeMode) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, []);

  const handleToggle = React.useCallback((targetTheme: ThemeMode) => {
    if (isAnimating || activeTheme === targetTheme) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(targetTheme);
      applyThemeToDocument(targetTheme);
      return;
    }

    const documentWithTransition = document as DocumentWithViewTransition;
    const startViewTransition = documentWithTransition.startViewTransition?.bind(documentWithTransition);

    if (!startViewTransition) {
      setTheme(targetTheme);
      applyThemeToDocument(targetTheme);
      return;
    }

    const root = document.documentElement;
    root.classList.remove("theme-to-dark", "theme-to-light");
    root.classList.add(targetTheme === "dark" ? "theme-to-dark" : "theme-to-light");
    setIsAnimating(true);

    const transition = startViewTransition(() => {
      flushSync(() => {
        setTheme(targetTheme);
      });
      applyThemeToDocument(targetTheme);
    });

    transition.finished.catch(() => undefined).finally(() => {
      root.classList.remove("theme-to-dark", "theme-to-light");
      setIsAnimating(false);
    });
  }, [applyThemeToDocument, isAnimating, activeTheme, setTheme]);

  if (!mounted) {
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
      disabled={isAnimating}
      className="h-10 w-10 shrink-0 flex items-center justify-center border border-card-border bg-card rounded-xl text-muted hover:text-foreground hover:border-foreground/20 transition-all shadow-xs relative"
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {activeTheme === "light" ? (
        <BrightnessDownIcon ref={sunIconRef} size={20} />
      ) : (
        <MoonIcon ref={moonIconRef} size={20} />
      )}
    </button>
  );
}

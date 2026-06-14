"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

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

  // Avoid hydration mismatch by only rendering after mounting
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";
  const nextTheme = activeTheme === "dark" ? "light" : "dark";

  const applyThemeToDocument = React.useCallback((theme: ThemeMode) => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
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

    const button = buttonRef.current;
    const documentWithTransition = document as DocumentWithViewTransition;
    const startViewTransition = documentWithTransition.startViewTransition?.bind(documentWithTransition);

    if (!button || !startViewTransition) {
      setTheme(targetTheme);
      applyThemeToDocument(targetTheme);
      return;
    }

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const endRadius = Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(window.innerWidth - centerX, centerY),
      Math.hypot(centerX, window.innerHeight - centerY),
      Math.hypot(window.innerWidth - centerX, window.innerHeight - centerY),
    );
    const root = document.documentElement;

    root.style.setProperty("--theme-wipe-x", `${centerX}px`);
    root.style.setProperty("--theme-wipe-y", `${centerY}px`);
    root.style.setProperty("--theme-wipe-radius", `${endRadius}px`);
    setIsAnimating(true);

    const transition = startViewTransition(() => {
      flushSync(() => {
        setTheme(targetTheme);
      });
      applyThemeToDocument(targetTheme);
    });

    transition.finished.catch(() => undefined).finally(() => {
      root.style.removeProperty("--theme-wipe-x");
      root.style.removeProperty("--theme-wipe-y");
      root.style.removeProperty("--theme-wipe-radius");
      setIsAnimating(false);
    });
  }, [applyThemeToDocument, isAnimating, activeTheme, setTheme]);

  if (!mounted) {
    return (
      <button className="relative p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded-full hover:bg-[var(--foreground)]/[0.04]">
        <i className="ph ph-sun text-2xl"></i>
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => handleToggle(nextTheme)}
      disabled={isAnimating}
      className="relative p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded-full hover:bg-[var(--foreground)]/[0.04]"
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <i className={`ph text-2xl ${activeTheme === "light" ? "ph-sun ph-fill" : "ph-moon ph-fill"}`}></i>
    </button>
  );
}

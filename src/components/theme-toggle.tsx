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
    root.style.colorScheme = theme;
  }, []);

  const handleToggle = React.useCallback(() => {
    if (isAnimating) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(nextTheme);
      return;
    }

    const button = buttonRef.current;
    const documentWithTransition = document as DocumentWithViewTransition;
    const startViewTransition = documentWithTransition.startViewTransition?.bind(documentWithTransition);

    if (!button || !startViewTransition) {
      setTheme(nextTheme);
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
        setTheme(nextTheme);
      });
      applyThemeToDocument(nextTheme);
    });

    transition.finished.catch(() => undefined).finally(() => {
      root.style.removeProperty("--theme-wipe-x");
      root.style.removeProperty("--theme-wipe-y");
      root.style.removeProperty("--theme-wipe-radius");
      setIsAnimating(false);
    });
  }, [applyThemeToDocument, isAnimating, nextTheme, setTheme]);

  if (!mounted) {
    return (
      <button className="p-2 flex items-center justify-center rounded-xl border border-[#212842]/10 dark:border-[#F0E7D5]/10 transition-all active:scale-95">
        <span className="material-symbols-outlined text-[#212842] dark:text-[#F0E7D5]">light_mode</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      ref={buttonRef}
      onClick={handleToggle}
      className="p-2 flex items-center justify-center rounded-xl border border-[#212842]/10 dark:border-[#F0E7D5]/10 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all active:scale-95 disabled:cursor-not-allowed"
      disabled={isAnimating}
      aria-label="Toggle Theme"
      aria-disabled={isAnimating}
    >
      <span className="material-symbols-outlined text-[#212842] dark:text-[#F0E7D5]">
        {activeTheme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}

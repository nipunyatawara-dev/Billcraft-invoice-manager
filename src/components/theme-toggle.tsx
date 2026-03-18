"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mounting
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="comic-button comic-border-sm bg-white dark:bg-slate-800 p-2 flex items-center justify-center">
        <span className="material-symbols-outlined text-black dark:text-white">light_mode</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="comic-button comic-border-sm bg-white dark:bg-slate-800 p-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle Theme"
    >
      <span className="material-symbols-outlined text-black dark:text-white">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}

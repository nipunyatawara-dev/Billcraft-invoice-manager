"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ASTRYX_MODE_STORAGE_KEY,
  ASTRYX_THEME_STORAGE_KEY,
  ASTRYX_THEMES,
  DEFAULT_ASTRYX_MODE,
  DEFAULT_ASTRYX_THEME_ID,
  isAstryxColorMode,
  isAstryxThemeId,
  resolveAstryxMode,
  type AstryxColorMode,
  type AstryxThemeId,
} from "@/lib/astryx-themes";

const CHANGE_EVENT = "billcraft:astryx-appearance-change";

function readStoredThemeId(): AstryxThemeId {
  if (typeof window === "undefined") return DEFAULT_ASTRYX_THEME_ID;
  const stored = window.localStorage.getItem(ASTRYX_THEME_STORAGE_KEY);
  return isAstryxThemeId(stored) ? stored : DEFAULT_ASTRYX_THEME_ID;
}

function readStoredMode(): AstryxColorMode {
  if (typeof window === "undefined") return DEFAULT_ASTRYX_MODE;
  const stored = window.localStorage.getItem(ASTRYX_MODE_STORAGE_KEY);
  return isAstryxColorMode(stored) ? stored : DEFAULT_ASTRYX_MODE;
}

function applyDocumentMode(themeId: AstryxThemeId, mode: AstryxColorMode) {
  if (typeof document === "undefined") return;

  const effective = resolveAstryxMode(themeId, mode);
  const isDark =
    effective === "dark" ||
    (effective === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
  document.documentElement.dataset.astryxTheme = themeId;
  document.documentElement.dataset.astryxMode = effective;
}

export function useAstryxAppearance() {
  const [themeId, setThemeIdState] = useState<AstryxThemeId>(DEFAULT_ASTRYX_THEME_ID);
  const [mode, setModeState] = useState<AstryxColorMode>(DEFAULT_ASTRYX_MODE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function sync() {
      const nextThemeId = readStoredThemeId();
      const nextMode = readStoredMode();
      setThemeIdState(nextThemeId);
      setModeState(nextMode);
      applyDocumentMode(nextThemeId, nextMode);
      setHydrated(true);
    }

    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyDocumentMode(themeId, mode);

    if (resolveAstryxMode(themeId, mode) !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentMode(themeId, mode);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [hydrated, mode, themeId]);

  const setThemeId = useCallback((next: AstryxThemeId) => {
    window.localStorage.setItem(ASTRYX_THEME_STORAGE_KEY, next);
    setThemeIdState(next);
    applyDocumentMode(next, readStoredMode());
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const setMode = useCallback((next: AstryxColorMode) => {
    const themeId = readStoredThemeId();
    const effective = resolveAstryxMode(themeId, next);
    window.localStorage.setItem(ASTRYX_MODE_STORAGE_KEY, effective);
    setModeState(effective);
    applyDocumentMode(themeId, effective);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const themeMeta = ASTRYX_THEMES[themeId];
  const effectiveMode = resolveAstryxMode(themeId, mode);

  return useMemo(
    () => ({
      themeId,
      setThemeId,
      mode: effectiveMode,
      setMode,
      theme: themeMeta.theme,
      themeMeta,
      darkOnly: Boolean(themeMeta.darkOnly),
      hydrated,
    }),
    [effectiveMode, hydrated, setMode, setThemeId, themeId, themeMeta],
  );
}

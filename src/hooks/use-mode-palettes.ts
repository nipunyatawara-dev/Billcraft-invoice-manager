"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export const COLOR_PALETTES = [
  {
    id: "palette-6",
    label: "Default Light",
    name: "Default Light",
    colors: ["#FFFFFF", "#F7F7F7", "#E2E2E2", "#111111", "#7A7A7A", "#A9D5FF", "#12B886", "#FF3B55"],
  },
  {
    id: "palette-7",
    label: "Default Dark",
    name: "Default Dark",
    colors: ["#080808", "#111111", "#181818", "#2B2B2B", "#F5F5F5", "#9A9A9A", "#00C48C", "#FF3B55"],
  },
  {
    id: "palette-1",
    label: "Palette 1",
    name: "Violet Frost",
    colors: ["#FFDBFD", "#C9BEFF", "#8494FF", "#6367FF"],
  },
  {
    id: "palette-2",
    label: "Palette 2",
    name: "Blush Dusk",
    colors: ["#FDE2F3", "#E5BEEC", "#917FB3", "#2A2F4F"],
  },
  {
    id: "palette-3",
    label: "Palette 3",
    name: "Amber Night",
    colors: ["#FFC85C", "#FF653F", "#452E5A", "#1E104E"],
  },
  {
    id: "palette-4",
    label: "Palette 4",
    name: "Warm Clay",
    colors: ["#FCDEC0", "#E5B299", "#B4846C", "#7D5A50"],
  },
  {
    id: "palette-5",
    label: "Palette 5",
    name: "Sage Grove",
    colors: ["#E5D9B6", "#A4BE7B", "#5F8D4E", "#285430"],
  },
] as const;

export type ColorPaletteId = (typeof COLOR_PALETTES)[number]["id"];

const DEFAULT_LIGHT_PALETTE: ColorPaletteId = "palette-6";
const DEFAULT_DARK_PALETTE: ColorPaletteId = "palette-7";
const LIGHT_PALETTE_STORAGE_KEY = "billcraft.light-palette.v1";
const DARK_PALETTE_STORAGE_KEY = "billcraft.dark-palette.v1";

const CHANGE_EVENT = "billcraft:mode-palette-change";
const PALETTE_IDS = COLOR_PALETTES.map((palette) => palette.id);

function isColorPaletteId(value: string | null): value is ColorPaletteId {
  return PALETTE_IDS.some((paletteId) => paletteId === value);
}

function getStoredPalette(key: string, fallback: ColorPaletteId): ColorPaletteId {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedPalette = window.localStorage.getItem(key);
  return isColorPaletteId(storedPalette) ? storedPalette : fallback;
}

function applyModePalettes(lightPalette: ColorPaletteId, darkPalette: ColorPaletteId) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.lightPalette = lightPalette;
  document.documentElement.dataset.darkPalette = darkPalette;
}

function getStoredModePalettes() {
  return {
    lightPalette: getStoredPalette(LIGHT_PALETTE_STORAGE_KEY, DEFAULT_LIGHT_PALETTE),
    darkPalette: getStoredPalette(DARK_PALETTE_STORAGE_KEY, DEFAULT_DARK_PALETTE),
  };
}

export function useModePalettes() {
  const [lightPalette, setLightPaletteState] = useState<ColorPaletteId>(DEFAULT_LIGHT_PALETTE);
  const [darkPalette, setDarkPaletteState] = useState<ColorPaletteId>(DEFAULT_DARK_PALETTE);

  useEffect(() => {
    function syncModePalettes() {
      const storedPalettes = getStoredModePalettes();
      setLightPaletteState(storedPalettes.lightPalette);
      setDarkPaletteState(storedPalettes.darkPalette);
      applyModePalettes(storedPalettes.lightPalette, storedPalettes.darkPalette);
    }

    syncModePalettes();
    window.addEventListener(CHANGE_EVENT, syncModePalettes);
    window.addEventListener("storage", syncModePalettes);

    return () => {
      window.removeEventListener(CHANGE_EVENT, syncModePalettes);
      window.removeEventListener("storage", syncModePalettes);
    };
  }, []);

  const setLightPalette = useCallback((nextPalette: ColorPaletteId) => {
    window.localStorage.setItem(LIGHT_PALETTE_STORAGE_KEY, nextPalette);
    const darkPalette = getStoredPalette(DARK_PALETTE_STORAGE_KEY, DEFAULT_DARK_PALETTE);
    setLightPaletteState(nextPalette);
    applyModePalettes(nextPalette, darkPalette);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const setDarkPalette = useCallback((nextPalette: ColorPaletteId) => {
    window.localStorage.setItem(DARK_PALETTE_STORAGE_KEY, nextPalette);
    const lightPalette = getStoredPalette(LIGHT_PALETTE_STORAGE_KEY, DEFAULT_LIGHT_PALETTE);
    setDarkPaletteState(nextPalette);
    applyModePalettes(lightPalette, nextPalette);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return useMemo(
    () => ({
      lightPalette,
      darkPalette,
      setLightPalette,
      setDarkPalette,
    }),
    [darkPalette, lightPalette, setDarkPalette, setLightPalette],
  );
}

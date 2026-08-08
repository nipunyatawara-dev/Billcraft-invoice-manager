import { butterTheme } from "@astryxdesign/theme-butter";
import { chocolateTheme } from "@astryxdesign/theme-chocolate";
import { gothicTheme } from "@astryxdesign/theme-gothic";
import { matchaTheme } from "@astryxdesign/theme-matcha";
import { neutralTheme } from "@astryxdesign/theme-neutral";
import { stoneTheme } from "@astryxdesign/theme-stone";
import { y2kTheme } from "@astryxdesign/theme-y2k";
import type { DefinedTheme } from "@astryxdesign/core/theme";

export const ASTRYX_THEME_IDS = [
  "neutral",
  "butter",
  "chocolate",
  "matcha",
  "stone",
  "gothic",
  "y2k",
] as const;

export type AstryxThemeId = (typeof ASTRYX_THEME_IDS)[number];

export type AstryxColorMode = "light" | "dark" | "system";

export type AstryxThemeMeta = {
  id: AstryxThemeId;
  label: string;
  description: string;
  /** Gothic is dark-only. */
  darkOnly?: boolean;
  preview: string[];
  theme: DefinedTheme;
};

export const ASTRYX_THEMES: Record<AstryxThemeId, AstryxThemeMeta> = {
  neutral: {
    id: "neutral",
    label: "Neutral",
    description: "Muted minimal with system fonts",
    preview: ["#F5F5F5", "#E8E8E8", "#111111", "#6B6B6B"],
    theme: neutralTheme,
  },
  butter: {
    id: "butter",
    label: "Butter",
    description: "Golden surfaces with blue accents",
    preview: ["#F7E7C6", "#E8D4A8", "#1A1A1A", "#2F6FED"],
    theme: butterTheme,
  },
  chocolate: {
    id: "chocolate",
    label: "Chocolate",
    description: "Warm brown and cozy beige",
    preview: ["#F3E6D8", "#D4B48C", "#3B2416", "#8B5E3C"],
    theme: chocolateTheme,
  },
  matcha: {
    id: "matcha",
    label: "Matcha",
    description: "Earthy green with Figtree",
    preview: ["#E8F0E0", "#C5D9B0", "#1F2E1A", "#5F8D4E"],
    theme: matchaTheme,
  },
  stone: {
    id: "stone",
    label: "Stone",
    description: "Warm stone and slate",
    preview: ["#F0EDE8", "#D6D0C8", "#1C1C1C", "#6B7280"],
    theme: stoneTheme,
  },
  gothic: {
    id: "gothic",
    label: "Gothic",
    description: "Dark-only atmospheric blue-gray",
    darkOnly: true,
    preview: ["#0D1117", "#161B22", "#8B949E", "#58A6FF"],
    theme: gothicTheme,
  },
  y2k: {
    id: "y2k",
    label: "Y2K",
    description: "Playful pop with holographic accents",
    preview: ["#E8E4FF", "#C9C0FF", "#1A1030", "#FF6BCB"],
    theme: y2kTheme,
  },
};

export const DEFAULT_ASTRYX_THEME_ID: AstryxThemeId = "neutral";
export const DEFAULT_ASTRYX_MODE: AstryxColorMode = "system";

export const ASTRYX_THEME_STORAGE_KEY = "billcraft.astryx-theme.v1";
export const ASTRYX_MODE_STORAGE_KEY = "billcraft.astryx-mode.v1";

export function isAstryxThemeId(value: string | null | undefined): value is AstryxThemeId {
  return ASTRYX_THEME_IDS.some((id) => id === value);
}

export function isAstryxColorMode(value: string | null | undefined): value is AstryxColorMode {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveAstryxMode(
  themeId: AstryxThemeId,
  mode: AstryxColorMode,
): AstryxColorMode {
  if (ASTRYX_THEMES[themeId].darkOnly) {
    return "dark";
  }
  return mode;
}

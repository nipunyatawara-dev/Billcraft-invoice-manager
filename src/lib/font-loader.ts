export const FONT_IDS = [
  "inter",
  "open-sans",
  "google-sans-flex",
  "outfit",
  "plus-jakarta-sans",
] as const;

export type FontId = (typeof FONT_IDS)[number];

const FONT_STORAGE_KEY = "billcraft.font.v1";

const GOOGLE_FONT_URLS: Partial<Record<FontId, string>> = {
  "open-sans":
    "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap",
  outfit:
    "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap",
  "plus-jakarta-sans":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
};

const loadedFonts = new Set<FontId>();

function injectGoogleSansFlexFaces() {
  if (loadedFonts.has("google-sans-flex")) {
    return;
  }

  const style = document.createElement("style");
  style.dataset.billcraftFont = "google-sans-flex";
  style.textContent = `
    @font-face {
      font-family: "Google Sans Flex";
      src: url("/fonts/google-sans-flex/google-sans-flex-latin-400-normal.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Google Sans Flex";
      src: url("/fonts/google-sans-flex/google-sans-flex-latin-600-normal.ttf") format("truetype");
      font-weight: 600;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: "Google Sans Flex";
      src: url("/fonts/google-sans-flex/google-sans-flex-latin-700-normal.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
  loadedFonts.add("google-sans-flex");
}

export function readStoredFontId(): FontId {
  if (typeof window === "undefined") {
    return "inter";
  }

  try {
    const stored = window.localStorage.getItem(FONT_STORAGE_KEY);
    return FONT_IDS.includes(stored as FontId) ? (stored as FontId) : "inter";
  } catch {
    return "inter";
  }
}

export function ensureFontLoaded(fontId: FontId) {
  if (typeof document === "undefined" || fontId === "inter" || loadedFonts.has(fontId)) {
    return;
  }

  if (fontId === "google-sans-flex") {
    injectGoogleSansFlexFaces();
    return;
  }

  const href = GOOGLE_FONT_URLS[fontId];
  if (!href || document.querySelector(`link[data-billcraft-font="${fontId}"]`)) {
    loadedFonts.add(fontId);
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.billcraftFont = fontId;
  document.head.appendChild(link);
  loadedFonts.add(fontId);
}

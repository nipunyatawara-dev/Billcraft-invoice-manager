"use client";

import { useEffect } from "react";
import { ensureFontLoaded, readStoredFontId } from "@/lib/font-loader";

export function useFontLoader() {
  useEffect(() => {
    ensureFontLoaded(readStoredFontId());
  }, []);
}

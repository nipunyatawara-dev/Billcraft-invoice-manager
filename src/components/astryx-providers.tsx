"use client";

import Link from "next/link";
import { Theme } from "@astryxdesign/core/theme";
import { LinkProvider } from "@astryxdesign/core/Link";
import { useAstryxAppearance } from "@/hooks/use-astryx-appearance";

export function AstryxProviders({ children }: { children: React.ReactNode }) {
  const { theme, mode } = useAstryxAppearance();

  return (
    <Theme theme={theme} mode={mode}>
      <LinkProvider component={Link}>{children}</LinkProvider>
    </Theme>
  );
}

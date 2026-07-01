/* eslint-disable @next/next/no-page-custom-font, @next/next/google-font-display */
import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastViewport } from "@/components/toast-viewport";
import { UserDataProvider } from "@/hooks/use-user-data";
import "./globals.css";
import "./palette.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BillCraft | Premium Invoice Management",
  description: "Craft professional invoices with ease using BillCraft's powerful management engine.",
  keywords: ["invoice", "billing", "saas", "payment", "management"],
  icons: {
    icon: [
      {
        url: "/billcraft-light-circle.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    shortcut: "/billcraft-light-circle.png",
    apple: "/billcraft-light-circle.png",
  },
};

const paletteBootstrapScript = `
(() => {
  const paletteIds = new Set(["palette-1", "palette-2", "palette-3", "palette-4", "palette-5", "palette-6", "palette-7"]);
  const lightKey = "billcraft.light-palette.v1";
  const darkKey = "billcraft.dark-palette.v1";
  const fontKey = "billcraft.font.v1";
  const fontIds = new Set(["inter", "open-sans", "google-sans-flex", "outfit", "plus-jakarta-sans"]);
  const radiusKey = "billcraft.radius.v1";
  const radiusIds = new Set(["squircle", "rounded"]);
  const densityKey = "billcraft.density.v1";
  const densityIds = new Set(["compact", "standard", "spacious"]);

  const readPalette = (key, fallback) => {
    try {
      const storedPalette = window.localStorage.getItem(key);
      return paletteIds.has(storedPalette) ? storedPalette : fallback;
    } catch {
      return fallback;
    }
  };

  const readFont = (key, fallback) => {
    try {
      const storedFont = window.localStorage.getItem(key);
      return fontIds.has(storedFont) ? storedFont : fallback;
    } catch {
      return fallback;
    }
  };

  const readRadius = (key, fallback) => {
    try {
      const storedRadius = window.localStorage.getItem(key);
      return radiusIds.has(storedRadius) ? storedRadius : fallback;
    } catch {
      return fallback;
    }
  };

  const readDensity = (key, fallback) => {
    try {
      const stored = window.localStorage.getItem(key);
      return densityIds.has(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  };

  document.documentElement.dataset.lightPalette = readPalette(lightKey, "palette-6");
  document.documentElement.dataset.darkPalette = readPalette(darkKey, "palette-7");
  document.documentElement.dataset.font = readFont(fontKey, "inter");
  document.documentElement.dataset.radius = readRadius(radiusKey, "rounded");
  document.documentElement.dataset.density = readDensity(densityKey, "standard");

})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${inter.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
        />
        <script dangerouslySetInnerHTML={{ __html: paletteBootstrapScript }} />
      </head>
      <body
        className="font-sans antialiased"
      >
        <Script src="https://unpkg.com/@phosphor-icons/web" strategy="afterInteractive" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <UserDataProvider>
            <DashboardLayout>{children}</DashboardLayout>
            <ToastViewport />
          </UserDataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

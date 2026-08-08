/* eslint-disable @next/next/no-page-custom-font, @next/next/google-font-display */
import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { AstryxProviders } from "@/components/astryx-providers";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ToastViewport } from "@/components/toast-viewport";
import { UserDataProvider } from "@/hooks/use-user-data";
import "./layers.css";
import "./globals.css";
import "./astryx-bridge.css";

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

const astryxBootstrapScript = `
(() => {
  const themeIds = new Set(["neutral", "butter", "chocolate", "matcha", "stone", "gothic", "y2k"]);
  const modeIds = new Set(["light", "dark", "system"]);
  const themeKey = "billcraft.astryx-theme.v1";
  const modeKey = "billcraft.astryx-mode.v1";
  const darkOnly = new Set(["gothic"]);

  const read = (key, allowed, fallback) => {
    try {
      const stored = window.localStorage.getItem(key);
      return allowed.has(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  };

  const themeId = read(themeKey, themeIds, "neutral");
  let mode = read(modeKey, modeIds, "system");
  if (darkOnly.has(themeId)) mode = "dark";

  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
  document.documentElement.dataset.astryxTheme = themeId;
  document.documentElement.dataset.astryxMode = mode;
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
        <script dangerouslySetInnerHTML={{ __html: astryxBootstrapScript }} />
      </head>
      <body className="font-sans antialiased">
        <Script src="https://unpkg.com/@phosphor-icons/web" strategy="afterInteractive" />
        <AstryxProviders>
          <UserDataProvider>
            <DashboardLayout>{children}</DashboardLayout>
            <ToastViewport />
          </UserDataProvider>
        </AstryxProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastViewport } from "@/components/toast-viewport";
import { UserDataProvider } from "@/hooks/use-user-data";
import "./globals.css";
import "./palette.css";

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

  document.documentElement.dataset.lightPalette = readPalette(lightKey, "palette-6");
  document.documentElement.dataset.darkPalette = readPalette(darkKey, "palette-7");
  document.documentElement.dataset.font = readFont(fontKey, "inter");
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@8..144,100..1000&family=Inter:wght@300;400;500;600;700&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500;6..72,600;6..72,700&display=swap" rel="stylesheet" />
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" 
        />
        <script dangerouslySetInnerHTML={{ __html: paletteBootstrapScript }} />
      </head>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
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

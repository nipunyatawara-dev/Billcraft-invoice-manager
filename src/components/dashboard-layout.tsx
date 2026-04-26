"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useModePalettes } from "@/hooks/use-mode-palettes";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/invoices", label: "Invoices", icon: "receipt_long" },
  { href: "/clients", label: "Clients", icon: "group" },
  { href: "/analytics", label: "Analytics", icon: "bar_chart" },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useModePalettes();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--card-border)] bg-[var(--background)]/92 px-4 backdrop-blur-xl sm:px-5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="icon-button active:scale-95"
            aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
          >
            <span className="material-symbols-outlined text-[20px]">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <Link href="/" className="brand-lockup transition-smooth" aria-label="BillCraft dashboard">
            <span className="brand-mark">
              <Image
                src="/billcraft-dark-circle.png"
                alt=""
                fill
                sizes="34px"
                className="object-cover dark:hidden"
              />
              <Image
                src="/billcraft-light-circle.png"
                alt=""
                fill
                sizes="34px"
                className="hidden object-cover dark:block"
              />
            </span>
            <span className="brand-wordmark">BillCraft</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="icon-button active:scale-95 hidden sm:inline-flex relative" aria-label="Notifications">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-[var(--accent)]" />
          </button>
          <button className="size-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center cursor-pointer hover:bg-[var(--accent)]/15 transition-smooth" aria-label="Account">
            <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">person</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 top-16 bg-[var(--foreground)]/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside 
          className={`bg-[var(--background)] flex flex-col fixed lg:sticky top-16 h-[calc(100vh-64px)] z-40 shrink-0 left-0 transition-all duration-300 ease-in-out overflow-hidden border-[var(--card-border)] ${
            isSidebarOpen ? "w-[240px] translate-x-0 border-r" : "w-[240px] lg:w-0 -translate-x-full lg:translate-x-0 border-r-0"
          }`}
        >
          <div className="w-[240px] flex flex-col h-full shrink-0">
            {/* Search */}
            <div className="px-3 pt-4 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--foreground)]/25 text-[16px]">search</span>
                <input
                  type="text"
                  placeholder="Search..."
                  className="field-control bg-[var(--foreground)]/[0.03] pl-8 pr-3 py-2 text-[13px]"
                />
              </div>
            </div>

            <nav className="flex-1 px-3 py-2 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-smooth ${
                      isActive
                        ? 'bg-[var(--action)]/12 text-[var(--action)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 pb-4 pt-2 border-t border-[var(--card-border)] space-y-0.5 bg-transparent shrink-0">
              {BOTTOM_NAV.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-smooth ${
                      isActive
                        ? 'bg-[var(--action)]/12 text-[var(--action)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-smooth text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {children}
        </div>
      </div>
    </div>
  );
}

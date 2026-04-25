"use client";

import { ThemeToggle } from "@/components/theme-toggle";
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
      <header className="flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--background)]/90 backdrop-blur-xl px-5 h-[60px] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/5 transition-smooth active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] text-[var(--foreground)]/60">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <Link href="/" className="flex items-center gap-2" aria-label="BillCraft dashboard">
            <Image
              src="/billcraft-dark-circle.png"
              alt=""
              width={32}
              height={32}
              sizes="32px"
              className="size-8 rounded-full object-cover dark:hidden"
            />
            <Image
              src="/billcraft-light-circle.png"
              alt=""
              width={32}
              height={32}
              sizes="32px"
              className="hidden size-8 rounded-full object-cover dark:block"
            />
            <span className="text-[17px] font-bold tracking-tight text-[var(--foreground)] font-display">BillCraft</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="p-1.5 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/5 transition-smooth active:scale-95 hidden sm:flex relative">
            <span className="material-symbols-outlined text-[20px] text-[var(--foreground)]/50">notifications</span>
            <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-[var(--accent)]" />
          </button>
          <div className="size-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center cursor-pointer hover:bg-[var(--accent)]/15 transition-smooth">
            <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">person</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 top-[60px] bg-[var(--foreground)]/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside 
          className={`bg-[var(--background)] flex flex-col fixed lg:sticky top-[60px] h-[calc(100vh-60px)] z-40 shrink-0 left-0 transition-all duration-300 ease-in-out overflow-hidden border-[var(--card-border)] ${
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
                  className="w-full pl-8 pr-3 py-2 text-[13px] bg-[var(--foreground)]/[0.03] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--foreground)]/30 outline-none focus:border-[var(--foreground)]/15 transition-smooth"
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
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--accent)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
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
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--accent)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
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
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
          {children}
        </div>
      </div>
    </div>
  );
}

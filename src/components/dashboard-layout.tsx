"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 bg-[#F0E7D5]/80 dark:bg-[#212842]/80 backdrop-blur-xl px-6 h-[76px] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 flex items-center justify-center rounded-xl border border-[#212842]/10 dark:border-[#F0E7D5]/10 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[#212842]/70 dark:text-[#F0E7D5]/70">menu</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="size-9 bg-[#212842] dark:bg-[#F0E7D5] rounded-xl shadow-sm flex items-center justify-center hidden sm:flex">
              <span className="material-symbols-outlined font-medium text-lg text-[#F0E7D5] dark:text-[#212842]">receipt_long</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">BillCraft</h2>
          </div>
        </div>
        <div className="flex gap-3">
          <ThemeToggle />
          <button className="p-2 flex items-center justify-center rounded-xl border border-[#212842]/10 dark:border-[#F0E7D5]/10 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all active:scale-95 hidden sm:flex">
            <span className="material-symbols-outlined text-[#212842]/70 dark:text-[#F0E7D5]/70">notifications</span>
          </button>
          <button className="bg-[#212842] dark:bg-[#F0E7D5] p-2 flex items-center justify-center rounded-xl shadow-sm text-[#F0E7D5] dark:text-[#212842] hover:opacity-90 transition-all active:scale-95">
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 top-[76px] bg-[#212842]/40 dark:bg-[#212842]/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside 
          className={`bg-[#F0E7D5]/80 dark:bg-[#212842]/80 backdrop-blur-xl flex flex-col fixed lg:sticky top-[76px] h-[calc(100vh-76px)] z-40 shrink-0 left-0 transition-all duration-300 ease-in-out overflow-hidden border-[#212842]/10 dark:border-[#F0E7D5]/10 ${
            isSidebarOpen ? "w-[260px] translate-x-0 border-r" : "w-[260px] lg:w-0 -translate-x-full lg:translate-x-0 border-r-0"
          }`}
        >
          <div className="w-[260px] flex flex-col h-full shrink-0">
            <nav className="flex-1 p-4 overflow-y-auto space-y-1">
              <Link href="/" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/' ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] shadow-sm' : 'text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 hover:text-[#212842] dark:hover:text-[#F0E7D5]'}`}>
                <span className="material-symbols-outlined text-lg">dashboard</span>
                Dashboard
              </Link>
              <Link href="/invoices" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/invoices' ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] shadow-sm' : 'text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 hover:text-[#212842] dark:hover:text-[#F0E7D5]'}`}>
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                Invoices
              </Link>
              <Link href="/clients" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/clients' ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] shadow-sm' : 'text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 hover:text-[#212842] dark:hover:text-[#F0E7D5]'}`}>
                <span className="material-symbols-outlined text-lg">group</span>
                Clients
              </Link>
              <Link href="/analytics" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/analytics' ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] shadow-sm' : 'text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 hover:text-[#212842] dark:hover:text-[#F0E7D5]'}`}>
                <span className="material-symbols-outlined text-lg">bar_chart</span>
                Analytics
              </Link>
            </nav>

            <div className="p-4 border-t border-[#212842]/10 dark:border-[#F0E7D5]/10 space-y-1 bg-transparent shrink-0">
              <Link href="/settings" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/settings' ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] shadow-sm' : 'text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 hover:text-[#212842] dark:hover:text-[#F0E7D5]'}`}>
                <span className="material-symbols-outlined text-lg">settings</span>
                Settings
              </Link>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 hover:text-[#212842] dark:hover:text-[#F0E7D5]">
                <span className="material-symbols-outlined text-lg">logout</span>
                Logout
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F0E7D5] dark:bg-[#212842]">
          {children}
        </div>
      </div>
    </div>
  );
}

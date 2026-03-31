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
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-6 h-[76px] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 flex items-center justify-center rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 bg-white dark:bg-slate-900"
          >
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">menu</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="size-9 bg-primary rounded-xl shadow-sm flex items-center justify-center text-white hidden sm:flex">
              <span className="material-symbols-outlined font-medium text-lg">receipt_long</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">BillCraft</h2>
          </div>
        </div>
        <div className="flex gap-3">
          <ThemeToggle />
          <button className="bg-white dark:bg-slate-900 p-2 flex items-center justify-center rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 hidden sm:flex">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">notifications</span>
          </button>
          <button className="bg-primary p-2 flex items-center justify-center rounded-xl shadow-sm border border-transparent text-white hover:bg-primary/90 transition-all active:scale-95">
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 top-[76px] bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside 
          className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col fixed lg:sticky top-[76px] h-[calc(100vh-76px)] z-40 shrink-0 left-0 transition-all duration-300 ease-in-out overflow-hidden border-slate-200 dark:border-slate-800 ${
            isSidebarOpen ? "w-[260px] translate-x-0 border-r" : "w-[260px] lg:w-0 -translate-x-full lg:translate-x-0 border-r-0"
          }`}
        >
          <div className="w-[260px] flex flex-col h-full shrink-0">
            <nav className="flex-1 p-4 overflow-y-auto space-y-1">
              <Link href="/" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                <span className="material-symbols-outlined text-lg">dashboard</span>
                Dashboard
              </Link>
              <Link href="/invoices" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/invoices' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                Invoices
              </Link>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100">
                <span className="material-symbols-outlined text-lg">group</span>
                Clients
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100">
                <span className="material-symbols-outlined text-lg">bar_chart</span>
                Analytics
              </button>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1 bg-transparent shrink-0">
              <Link href="/settings" className={`w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all ${pathname === '/settings' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}`}>
                <span className="material-symbols-outlined text-lg">settings</span>
                Settings
              </Link>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 font-medium rounded-xl transition-all text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                <span className="material-symbols-outlined text-lg">logout</span>
                Logout
              </button>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-900/50">
          {children}
        </div>
      </div>
    </div>
  );
}

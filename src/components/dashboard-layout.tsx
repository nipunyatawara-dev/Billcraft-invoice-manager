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
    <div className="flex h-screen bg-[#f3f4f6] dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      {/* Sidebar Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`bg-[#f3f4f6] dark:bg-slate-950 flex flex-col fixed lg:relative h-full z-40 shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-[280px] translate-x-0" : "w-[280px] lg:w-0 -translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="w-[280px] flex flex-col h-full shrink-0 overflow-hidden pt-4">
          {/* User Profile Header */}
          <div className="p-3 mx-3 mb-2 flex items-center justify-between group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-all">
            <div className="flex items-center gap-3">
               <div className="flex items-center justify-center size-10 rounded-full bg-slate-200 border-2 border-white/50 dark:bg-slate-800 dark:border-slate-700 shrink-0 overflow-hidden shadow-sm">
                 <span className="text-xl leading-none">👱🏻‍♂️</span>
               </div>
               <div className="flex flex-col">
                 <span className="font-semibold text-[15px] leading-tight text-slate-900 dark:text-white">Sebastiano Guerrie...</span>
                 <span className="text-[13px] text-slate-500 font-medium">Acme Co.</span>
               </div>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400">unfold_more</span>
          </div>
          
          <div className="mx-4 my-2 h-[1px] bg-slate-200 dark:bg-slate-800 shrink-0" />
          
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {/* General Navigation */}
            <div className="space-y-0.5">
               <Link href="/" className={`w-full flex items-center gap-3 px-3 py-2 font-medium rounded-lg transition-all ${pathname === '/' ? 'bg-white dark:bg-[#1a2233] shadow-sm shadow-black/5 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'}`}>
                 <span className={`material-symbols-outlined text-[20px] ${pathname === '/' ? 'text-black dark:text-white' : ''}`}>dashboard</span>
                 <span className="text-[15px]">Dashboard</span>
               </Link>
               <Link href="/invoices" className={`w-full flex items-center gap-3 px-3 py-2 font-medium rounded-lg transition-all ${pathname === '/invoices' ? 'bg-white dark:bg-[#1a2233] shadow-sm shadow-black/5 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'}`}>
                 <span className={`material-symbols-outlined text-[20px] ${pathname === '/invoices' ? 'text-black dark:text-white' : ''}`}>receipt_long</span>
                 <span className="text-[15px]">Invoices</span>
               </Link>
               <button className="w-full flex items-center gap-3 px-3 py-2 font-medium rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent">
                 <span className="material-symbols-outlined text-[20px]">group</span>
                 <span className="text-[15px]">Clients</span>
               </button>
               <button className="w-full flex items-center gap-3 px-3 py-2 font-medium rounded-lg transition-all hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent">
                 <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                 <span className="text-[15px]">Analytics</span>
               </button>
            </div>
          </nav>
          
          {/* Bottom Section - Pinned to the Left Bottom Corner */}
          <div className="shrink-0 px-3 pb-2 space-y-0.5">
            <Link href="/settings" className={`w-full flex items-center gap-3 px-3 py-2 font-medium rounded-lg transition-all ${pathname === '/settings' ? 'bg-white dark:bg-[#1a2233] shadow-sm shadow-black/5 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'}`}>
              <span className={`material-symbols-outlined text-[20px] ${pathname === '/settings' ? 'text-black dark:text-white' : ''}`}>settings</span>
              <span className="text-[15px]">Settings</span>
            </Link>
            <button className="w-full flex items-center gap-3 px-3 py-2 font-medium rounded-lg transition-all hover:bg-red-500/10 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 border border-transparent mt-1">
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-[15px]">Logout</span>
            </button>
          </div>

          <div className="p-4 w-full border-t border-slate-200 dark:border-slate-800/60 shrink-0">
            <div className="flex items-center justify-between w-full">
              <div className="opacity-50 hover:opacity-100 transition-opacity">
                <ThemeToggle />
              </div>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-500"
              >
                <span className="material-symbols-outlined">menu_open</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content Card */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0a0f18] rounded-tl-xl shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.05)] border-t border-l border-slate-200/60 dark:border-slate-800/60 overflow-hidden mt-3 md:mt-4 relative z-10 transition-all">
         {/* Mobile Menu Toggle Button floating over content when sidebar closed */}
         <div className="absolute top-4 left-4 lg:hidden z-50">
           {!isSidebarOpen && (
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 flex items-center justify-center rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 bg-white dark:bg-slate-900"
             >
               <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">menu</span>
             </button>
           )}
         </div>
         <div className={`flex-1 overflow-auto bg-white dark:bg-[#0a0f18] ${!isSidebarOpen ? 'pt-16 lg:pt-0' : ''}`}>
           {children}
         </div>
      </main>
    </div>
  );
}

"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";
import { INVOICES } from "@/data/invoices";

export default function Home() {
  const recentInvoices = INVOICES.slice(0, 4);

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10">
        
        {/* Minimal Greeting */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-1">Dashboard</p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] leading-[1.1]">
              Good Morning, John
            </h1>
          </div>
          <div className="hidden md:flex gap-3">
            <Link href="/invoices" className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-5 py-2.5 font-medium rounded-full flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.97] text-sm">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Invoice
            </Link>
            <button className="border border-[#212842]/15 dark:border-[#F0E7D5]/15 text-[#212842]/70 dark:text-[#F0E7D5]/70 px-5 py-2.5 font-medium rounded-full hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all active:scale-[0.97] text-sm">
              View Reports
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto">
          
          {/* Revenue — Large Featured Card (spans 2 cols, 2 rows) */}
          <div className="md:col-span-2 md:row-span-2 bg-[#212842] dark:bg-[#F0E7D5] rounded-3xl p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden group min-h-[320px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F0E7D5]/5 to-transparent dark:from-[#212842]/5 pointer-events-none" />
            <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-[#F0E7D5]/5 dark:bg-[#212842]/5 blur-3xl pointer-events-none group-hover:bg-[#F0E7D5]/10 dark:group-hover:bg-[#212842]/10 transition-all duration-700" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-8 rounded-full bg-[#F0E7D5]/10 dark:bg-[#212842]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-[#F0E7D5]/70 dark:text-[#212842]/70">payments</span>
                </div>
                <p className="text-sm font-medium text-[#F0E7D5]/50 dark:text-[#212842]/50 tracking-wide">Total Revenue</p>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-5xl lg:text-6xl font-semibold tracking-tighter text-[#F0E7D5] dark:text-[#212842] mb-3 font-display">
                $45,210
              </h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[#F0E7D5]/50 dark:text-[#212842]/50 font-medium flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  +12.5% from last month
                </span>
              </div>
            </div>
          </div>

          {/* Pending Payments Card */}
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-7 flex flex-col justify-between border border-[#212842]/6 dark:border-[#F0E7D5]/6 relative overflow-hidden group hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all duration-300 min-h-[152px]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Pending</p>
              <div className="size-8 rounded-full bg-[#212842]/6 dark:bg-[#F0E7D5]/6 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-[#212842]/50 dark:text-[#F0E7D5]/50">schedule</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] mb-1 font-display">$12,840</h3>
              <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">14 invoices awaiting</p>
            </div>
          </div>

          {/* Overdue Card */}
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-7 flex flex-col justify-between border border-[#212842]/6 dark:border-[#F0E7D5]/6 relative overflow-hidden group hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all duration-300 min-h-[152px]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Overdue</p>
              <div className="size-8 rounded-full bg-[#212842]/6 dark:bg-[#F0E7D5]/6 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-[#212842]/50 dark:text-[#F0E7D5]/50">warning</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] mb-1 font-display">$3,150</h3>
              <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">Requires attention</p>
            </div>
          </div>

          {/* Quick Actions — Horizontal strip */}
          <div className="md:col-span-2 bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl p-6 lg:p-7 border border-[#212842]/6 dark:border-[#F0E7D5]/6 min-h-[152px] flex flex-col justify-between">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-4">Quick Actions</p>
            <div className="grid grid-cols-3 gap-3">
              <Link href="/invoices" className="flex flex-col items-center gap-2.5 p-4 rounded-2xl hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all group cursor-pointer">
                <div className="size-11 rounded-2xl bg-[#212842]/8 dark:bg-[#F0E7D5]/8 flex items-center justify-center group-hover:bg-[#212842]/12 dark:group-hover:bg-[#F0E7D5]/12 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-[#212842]/60 dark:text-[#F0E7D5]/60">add_circle</span>
                </div>
                <span className="text-xs font-medium text-[#212842]/60 dark:text-[#F0E7D5]/60 text-center">New Invoice</span>
              </Link>
              <button className="flex flex-col items-center gap-2.5 p-4 rounded-2xl hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all group cursor-pointer">
                <div className="size-11 rounded-2xl bg-[#212842]/8 dark:bg-[#F0E7D5]/8 flex items-center justify-center group-hover:bg-[#212842]/12 dark:group-hover:bg-[#F0E7D5]/12 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-[#212842]/60 dark:text-[#F0E7D5]/60">person_add</span>
                </div>
                <span className="text-xs font-medium text-[#212842]/60 dark:text-[#F0E7D5]/60 text-center">Add Client</span>
              </button>
              <button className="flex flex-col items-center gap-2.5 p-4 rounded-2xl hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-all group cursor-pointer">
                <div className="size-11 rounded-2xl bg-[#212842]/8 dark:bg-[#F0E7D5]/8 flex items-center justify-center group-hover:bg-[#212842]/12 dark:group-hover:bg-[#F0E7D5]/12 transition-colors">
                  <span className="material-symbols-outlined text-[20px] text-[#212842]/60 dark:text-[#F0E7D5]/60">description</span>
                </div>
                <span className="text-xs font-medium text-[#212842]/60 dark:text-[#F0E7D5]/60 text-center">Estimates</span>
              </button>
            </div>
          </div>

          {/* Recent Invoices — Full Width */}
          <div className="md:col-span-2 lg:col-span-4 bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-3xl border border-[#212842]/6 dark:border-[#F0E7D5]/6 overflow-hidden">
            <div className="flex items-center justify-between px-7 pt-6 pb-4">
              <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Recent Invoices</p>
              <Link href="/invoices" className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 hover:text-[#212842] dark:hover:text-[#F0E7D5] transition-colors">
                View All →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x-0 sm:divide-x divide-[#212842]/6 dark:divide-[#F0E7D5]/6">
              {recentInvoices.map((inv, i) => (
                <div key={inv.id} className={`px-7 py-5 flex flex-col gap-4 hover:bg-[#212842]/3 dark:hover:bg-[#F0E7D5]/3 transition-colors cursor-pointer group ${i > 0 ? 'border-t sm:border-t-0 border-[#212842]/6 dark:border-[#F0E7D5]/6' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full border border-[#212842]/8 dark:border-[#F0E7D5]/8 overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-[#212842] dark:text-[#F0E7D5] truncate group-hover:opacity-70 transition-opacity">{inv.client}</h4>
                      <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40">{inv.id}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-lg font-semibold text-[#212842] dark:text-[#F0E7D5] tracking-tight font-display">{inv.amount}</p>
                      <p className="text-xs text-[#212842]/30 dark:text-[#F0E7D5]/30 mt-0.5">{inv.date}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase ${inv.statusColor}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="mt-auto border-t border-[#212842]/6 dark:border-[#F0E7D5]/6 p-6 text-center">
        <p className="text-xs font-medium text-[#212842]/30 dark:text-[#F0E7D5]/30">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}

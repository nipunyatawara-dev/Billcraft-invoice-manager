"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";
import { INVOICES } from "@/app/invoices/page";

export default function Home() {
  const recentInvoices = INVOICES.slice(0, 3);

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10 space-y-10">
        
        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-primary/10 dark:bg-primary/10 border border-primary/20 dark:border-primary/20 p-8 lg:p-12 shadow-sm">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">
              Good Morning, John
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-base lg:text-lg mb-8">
              Here's what's happening with your finances today. You have <span className="font-semibold text-slate-900 dark:text-white">3 invoices</span> pending approval and <span className="font-semibold text-red-600 dark:text-red-400">1 overdue</span> payment.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/invoices" className="bg-primary text-white px-6 py-2.5 font-medium rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm active:scale-95">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Invoice
              </Link>
              <button className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-6 py-2.5 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95">
                View Reports
              </button>
            </div>
          </div>
        </section>

        {/* Analytics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900/50 p-6 flex flex-col gap-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-green-200 dark:hover:border-green-900/50 transition-colors">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <div className="size-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center relative z-10">
                <span className="material-symbols-outlined text-[20px] text-green-600 dark:text-green-500">payments</span>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">$45,210.00</h3>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +12.5% from last month
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-6 flex flex-col gap-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-yellow-200 dark:hover:border-yellow-900/50 transition-colors">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl group-hover:bg-yellow-500/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Pending Payments</p>
              <div className="size-10 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center relative z-10">
                <span className="material-symbols-outlined text-[20px] text-yellow-600 dark:text-yellow-500">schedule</span>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">$12,840.00</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                14 invoices pending
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-6 flex flex-col gap-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors pointer-events-none" />
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Overdue Balance</p>
              <div className="size-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center relative z-10">
                <span className="material-symbols-outlined text-[20px] text-red-600 dark:text-red-500">warning</span>
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">$3,150.00</h3>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                Requires immediate action
              </p>
            </div>
          </div>
        </section>

        {/* Lower Grid: Quick Actions & Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Actions */}
          <section className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white px-1">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Link href="/invoices" className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:border-primary dark:hover:border-primary/50 transition-colors group cursor-pointer">
                <div className="size-10 rounded-xl bg-primary/20 dark:bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary dark:text-white/80 text-[20px]">add_circle</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-white transition-colors">New Invoice</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Create and send a new bill</p>
                </div>
              </Link>
              
              <button className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:border-primary dark:hover:border-primary/50 transition-colors group cursor-pointer text-left">
                <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-white transition-colors">Add Client</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Register a new customer</p>
                </div>
              </button>

              <button className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:border-primary dark:hover:border-primary/50 transition-colors group cursor-pointer text-left">
                <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-[20px]">description</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-white transition-colors">Estimates</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Draft an itemized estimate</p>
                </div>
              </button>
            </div>
          </section>

          {/* Recent Invoices */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Invoices</h2>
              <Link href="/invoices" className="text-sm font-medium text-primary dark:text-slate-300 hover:text-primary/80 dark:hover:text-white transition-colors">
                View All
              </Link>
            </div>
            
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 sm:size-12 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 ${inv.clientColor} overflow-hidden shrink-0`}>
                        <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-white transition-colors">{inv.client}</h4>
                        <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                          {inv.id}
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          {inv.date}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 ml-14 sm:ml-0">
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">{inv.amount}</p>
                        <p className="text-xs text-slate-500 mt-0.5">USD</p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${inv.statusColor}`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6 text-center">
        <p className="text-xs font-medium text-slate-500">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}

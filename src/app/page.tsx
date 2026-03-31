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
        <section className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/60 dark:border-slate-800/60 p-8 lg:p-12 shadow-sm shadow-black/5">
          <div className="max-w-2xl">
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">
              Good Morning, John
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-base lg:text-lg mb-8" style={{fontFamily: 'Inter'}}>
              Here's what's happening with your finances today. You have <span className="font-semibold text-slate-900 dark:text-white">3 invoices</span> pending approval and <span className="font-semibold text-red-600 dark:text-red-400">1 overdue</span> payment.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/invoices" className="bg-primary text-white px-6 py-2.5 font-medium rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-all shadow-sm active:scale-95 text-sm">
                <span className="material-symbols-outlined text-[20px]">add</span>
                Create Invoice
              </Link>
              <button className="bg-white dark:bg-[#1f2937] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-6 py-2.5 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm active:scale-95 text-sm">
                View Reports
              </button>
            </div>
          </div>
        </section>

        {/* Analytics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#111827] p-6 flex flex-col gap-4 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 transition-colors hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">payments</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">$45,210.00</h3>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +12.5% from last month
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] p-6 flex flex-col gap-4 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 transition-colors hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Pending Payments</p>
              <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">schedule</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">$12,840.00</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                14 invoices pending
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] p-6 flex flex-col gap-4 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 transition-colors hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Overdue Balance</p>
              <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">warning</span>
              </div>
            </div>
            <div>
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
              <Link href="/invoices" className="bg-white dark:bg-[#111827] p-4 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors group cursor-pointer">
                <div className="size-10 rounded-lg bg-slate-100 dark:bg-[#1f2937] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/50">
                  <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-[20px]">add_circle</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">New Invoice</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Create and send a new bill</p>
                </div>
              </Link>
              
              <button className="bg-white dark:bg-[#111827] p-4 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors group cursor-pointer text-left">
                <div className="size-10 rounded-lg bg-slate-100 dark:bg-[#1f2937] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/50">
                  <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-[20px]">person_add</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Add Client</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Register a new customer</p>
                </div>
              </button>

              <button className="bg-white dark:bg-[#111827] p-4 rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors group cursor-pointer text-left">
                <div className="size-10 rounded-lg bg-slate-100 dark:bg-[#1f2937] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/50">
                  <span className="material-symbols-outlined text-slate-700 dark:text-slate-300 text-[20px]">description</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">Estimates</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Draft an itemized estimate</p>
                </div>
              </button>
            </div>
          </section>

          {/* Recent Invoices */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Invoices</h2>
              <Link href="/invoices" className="text-sm font-medium text-primary hover:text-blue-600 transition-colors">
                View All
              </Link>
            </div>
            
            <div className="bg-white dark:bg-[#111827] rounded-xl shadow-sm shadow-black/5 border border-slate-200/60 dark:border-slate-800/60 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-[#1f2937] transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 sm:size-12 rounded-full border border-slate-200 dark:border-slate-700 ${inv.clientColor} overflow-hidden shrink-0`}>
                        <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-primary transition-colors">{inv.client}</h4>
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
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-md shrink-0 ${inv.statusColor}`}>
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

      <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 bg-transparent p-6 text-center">
        <p className="text-[13px] font-medium text-slate-500">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}

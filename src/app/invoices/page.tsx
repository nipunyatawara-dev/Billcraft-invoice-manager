"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { useState } from "react";
import { INVOICES } from "@/data/invoices";

export { INVOICES };

const STATUS_FILTERS = ["All", "Paid", "Unpaid", "Overdue"] as const;

export default function Invoices() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInvoices = INVOICES.filter((inv) => {
    const matchesStatus = activeFilter === "All" || inv.status === activeFilter;
    const matchesSearch = searchQuery === "" || 
      inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalAmount = INVOICES.reduce((sum, inv) => sum + parseFloat(inv.amount.replace(/[$,]/g, '')), 0);
  const paidCount = INVOICES.filter(inv => inv.status === "Paid").length;
  const unpaidCount = INVOICES.filter(inv => inv.status === "Unpaid").length;
  const overdueCount = INVOICES.filter(inv => inv.status === "Overdue").length;

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-1">Billing</p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] leading-[1.1]">
              Invoices
            </h1>
          </div>
          <button className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-5 py-2.5 font-medium rounded-full flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.97] text-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Invoice
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#212842] dark:bg-[#F0E7D5] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#F0E7D5]/5 dark:bg-[#212842]/5 blur-2xl pointer-events-none" />
            <p className="text-xs font-medium text-[#F0E7D5]/50 dark:text-[#212842]/50 tracking-wide uppercase mb-3">Total Billed</p>
            <p className="text-2xl font-semibold tracking-tight text-[#F0E7D5] dark:text-[#212842] font-display">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Total</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{INVOICES.length} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">invoices</span></p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Paid</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{paidCount} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">cleared</span></p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Attention</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{unpaidCount + overdueCount} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">pending</span></p>
          </div>
        </div>

        {/* Search + Filter Chips */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#212842]/30 dark:text-[#F0E7D5]/30 text-[20px]">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 border border-[#212842]/8 dark:border-[#F0E7D5]/8 rounded-full py-2.5 text-sm bg-transparent outline-none transition-all text-[#212842] dark:text-[#F0E7D5] placeholder:text-[#212842]/30 dark:placeholder:text-[#F0E7D5]/30 focus:border-[#212842]/25 dark:focus:border-[#F0E7D5]/25"
              placeholder="Search invoices..."
              type="text"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all active:scale-[0.95] tracking-wide uppercase ${
                  activeFilter === filter
                    ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842]'
                    : 'text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 border border-[#212842]/8 dark:border-[#F0E7D5]/8'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Cards */}
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div 
              key={inv.id} 
              className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl border border-[#212842]/6 dark:border-[#F0E7D5]/6 p-5 lg:p-6 hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-2xl border border-[#212842]/8 dark:border-[#F0E7D5]/8 overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] text-[#212842] dark:text-[#F0E7D5] group-hover:opacity-70 transition-opacity truncate">{inv.client}</h3>
                  <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-0.5 flex items-center gap-2">
                    <span className="font-medium">{inv.id}</span>
                    <span className="w-1 h-1 rounded-full bg-[#212842]/20 dark:bg-[#F0E7D5]/20"></span>
                    {inv.date}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{inv.amount}</p>
                  <p className="text-[10px] text-[#212842]/30 dark:text-[#F0E7D5]/30 tracking-wide uppercase mt-0.5">USD</p>
                </div>
                <span className={`px-3 py-1.5 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 ${inv.statusColor}`}>
                  {inv.status}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden lg:flex">
                  <button className="size-9 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors" title="View">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                  <button className="size-9 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors" title="Download">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                  <button className="size-9 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors" title="Edit">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 sm:hidden">
                <p className="text-lg font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{inv.amount}</p>
              </div>
            </div>
          ))}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[48px] text-[#212842]/15 dark:text-[#F0E7D5]/15 mb-4 block">search_off</span>
              <p className="text-sm text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">No invoices match your filters</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#212842]/6 dark:border-[#F0E7D5]/6">
          <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">Showing {filteredInvoices.length} of {INVOICES.length} invoices</p>
          <div className="flex gap-1.5">
            <button className="size-9 flex items-center justify-center rounded-full border border-[#212842]/8 dark:border-[#F0E7D5]/8 text-[#212842]/40 dark:text-[#F0E7D5]/40 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors disabled:opacity-30" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="size-9 flex items-center justify-center rounded-full bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] text-xs font-semibold">1</button>
            <button className="size-9 flex items-center justify-center rounded-full border border-[#212842]/8 dark:border-[#F0E7D5]/8 text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors text-xs font-semibold">2</button>
            <button className="size-9 flex items-center justify-center rounded-full border border-[#212842]/8 dark:border-[#F0E7D5]/8 text-[#212842]/40 dark:text-[#F0E7D5]/40 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#212842]/6 dark:border-[#F0E7D5]/6 p-6 text-center">
        <p className="text-xs font-medium text-[#212842]/30 dark:text-[#F0E7D5]/30">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}

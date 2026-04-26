"use client";

import Link from "next/link";
import { formatCurrency, getInvoiceTotals, parseInvoiceAmount } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";

export default function Home() {
  const { invoices } = useInvoices();
  const { currency } = useCurrency();
  const recentInvoices = invoices.slice(0, 4);
  const totals = getInvoiceTotals(invoices);

  return (
    <>
      <main className="app-main flex-1">
        
        {/* Greeting */}
        <div className="page-heading">
          <div>
            <p className="section-eyebrow">Dashboard</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]">
              Good Morning, John
            </h1>
          </div>
          <div className="hidden md:flex gap-2.5">
            <Link href="/invoices" className="btn-primary active:scale-[0.97]">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Invoice
            </Link>
            <button className="btn-secondary active:scale-[0.97]">
              View Reports
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          
          {/* Revenue — Featured Card (spans 2 cols, 2 rows) */}
          <div className="md:col-span-2 md:row-span-2 surface-featured p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group min-h-[280px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--featured-text)]/[0.04] to-transparent pointer-events-none" />
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-[var(--featured-text)]/[0.04] blur-3xl pointer-events-none group-hover:bg-[var(--featured-text)]/[0.06] transition-all duration-700" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="size-7 rounded-lg bg-[var(--featured-text)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-[var(--featured-text)]/60">payments</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--featured-muted)] tracking-wide">Total Revenue</p>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-semibold text-[var(--featured-text)] mb-2 font-display">
                {formatCurrency(totals.paidAmount, currency)}
              </h2>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--positive)] font-medium bg-[var(--positive)]/15 px-2 py-0.5 rounded-md">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  +12.5%
                </span>
                <span className="text-[12px] text-[var(--featured-text)]/35 font-medium">from last month</span>
              </div>
            </div>
          </div>

          {/* Pending Payments Card */}
          <div className="surface-card p-5 lg:p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[var(--foreground)]/12 transition-smooth min-h-[133px]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Pending</p>
              <div className="size-7 rounded-lg bg-[var(--foreground)]/[0.04] flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-[var(--muted)]">schedule</span>
              </div>
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display">{formatCurrency(totals.pendingAmount, currency)}</h3>
              <p className="text-[11px] text-[var(--muted)] font-medium">{totals.unpaidCount} invoices awaiting</p>
            </div>
          </div>

          {/* Overdue Card */}
          <div className="surface-card p-5 lg:p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[var(--foreground)]/12 transition-smooth min-h-[133px]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Overdue</p>
              <div className="size-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-[var(--accent)]">warning</span>
              </div>
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display">{formatCurrency(totals.overdueAmount, currency)}</h3>
              <p className="text-[11px] text-[var(--accent)] font-medium">Requires attention</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="md:col-span-2 surface-card p-5 lg:p-6 min-h-[133px] flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-3">Quick Actions</p>
            <div className="grid grid-cols-3 gap-2">
              <Link href="/invoices" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[var(--foreground)]/[0.03] transition-smooth group cursor-pointer">
                <div className="size-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center group-hover:bg-[var(--accent)]/15 transition-smooth">
                  <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">add_circle</span>
                </div>
                <span className="text-[11px] font-medium text-[var(--muted)] text-center">New Invoice</span>
              </Link>
              <Link href="/clients" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[var(--foreground)]/[0.03] transition-smooth group cursor-pointer">
                <div className="size-9 rounded-lg bg-[var(--positive)]/10 flex items-center justify-center group-hover:bg-[var(--positive)]/15 transition-smooth">
                  <span className="material-symbols-outlined text-[18px] text-[var(--positive)]">person_add</span>
                </div>
                <span className="text-[11px] font-medium text-[var(--muted)] text-center">Add Client</span>
              </Link>
              <button className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-[var(--foreground)]/[0.03] transition-smooth group cursor-pointer">
                <div className="size-9 rounded-lg bg-[var(--foreground)]/[0.06] flex items-center justify-center group-hover:bg-[var(--foreground)]/[0.08] transition-smooth">
                  <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">description</span>
                </div>
                <span className="text-[11px] font-medium text-[var(--muted)] text-center">Estimates</span>
              </button>
            </div>
          </div>

          {/* Recent Invoices — Full Width */}
          <div className="md:col-span-2 lg:col-span-4 surface-card overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Recent Invoices</p>
              <Link href="/invoices" className="text-[12px] font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-smooth">
                View All
              </Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x-0 sm:divide-x divide-[var(--card-border)]">
              {recentInvoices.map((inv, i) => (
                <div key={inv.id} className={`px-6 py-4 flex flex-col gap-3 hover:bg-[var(--foreground)]/[0.02] transition-smooth cursor-pointer group ${i > 0 ? 'border-t sm:border-t-0 border-[var(--card-border)]' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-lg border border-[var(--card-border)] overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-[13px] text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-smooth">{inv.client}</h4>
                      <p className="text-[11px] text-[var(--muted)]">{inv.id}</p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-base font-semibold text-[var(--foreground)] font-display">{formatCurrency(parseInvoiceAmount(inv.amount), currency)}</p>
                      <p className="text-[10px] text-[var(--foreground)]/25 mt-0.5">{inv.date}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md tracking-wide uppercase ${inv.statusColor}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--card-border)] p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2026 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

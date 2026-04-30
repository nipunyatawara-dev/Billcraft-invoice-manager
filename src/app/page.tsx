"use client";

import Link from "next/link";
import { AnimatedNumber } from "@/components/animated-number";
import { formatCurrency, getInvoiceTotal, getInvoiceTotals } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { useUserData } from "@/hooks/use-user-data";

export default function Home() {
  const { invoices } = useInvoices();
  const { currency } = useCurrency();
  const { activeProfile } = useUserData();
  const recentInvoices = invoices.slice(0, 4);
  const totals = getInvoiceTotals(invoices);
  const collectionRate = invoices.length > 0 ? Math.round((totals.paidCount / invoices.length) * 100) : 0;

  return (
    <>
      <main className="app-main flex-1">
        
        {/* Greeting */}
        <div className="page-heading">
          <div>
            <p className="section-eyebrow">Dashboard</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]">
              Good Morning{activeProfile ? `, ${activeProfile.name}` : ""}
            </h1>
          </div>
          <div className="hidden md:flex gap-2.5">
            <Link href="/invoices" className="btn-primary active:scale-[0.97]">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Invoice
            </Link>
            <Link href="/analytics" className="btn-secondary active:scale-[0.97]">
              View Analytics
            </Link>
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
                <p className="text-[13px] font-medium text-[var(--featured-muted)] tracking-wide">Collected Revenue</p>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-semibold text-[var(--featured-text)] mb-2 font-display">
                <AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} />
              </h2>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--positive)] font-medium bg-[var(--positive)]/15 px-2 py-0.5 rounded-md">
                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                  <AnimatedNumber value={totals.paidCount} /> paid
                </span>
                <span className="text-[12px] text-[var(--featured-text)]/35 font-medium">
                  {invoices.length > 0 ? <><AnimatedNumber value={invoices.length} /> total invoices</> : "No invoices yet"}
                </span>
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
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display"><AnimatedNumber value={formatCurrency(totals.pendingAmount, currency)} /></h3>
              <p className="text-[11px] text-[var(--muted)] font-medium"><AnimatedNumber value={totals.unpaidCount} /> invoices awaiting</p>
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
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display"><AnimatedNumber value={formatCurrency(totals.overdueAmount, currency)} /></h3>
              <p className="text-[11px] text-[var(--accent)] font-medium"><AnimatedNumber value={totals.overdueCount} /> invoices overdue</p>
            </div>
          </div>

          {/* Payment Health */}
          <div className="md:col-span-2 surface-card p-5 lg:p-6 min-h-[133px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-1">Payment Health</p>
                <p className="text-[12px] text-[var(--muted)]">
                  {invoices.length > 0 ? <><AnimatedNumber value={`${collectionRate}%`} /> of invoices are paid</> : "Create an invoice to start tracking"}
                </p>
              </div>
              <div className="size-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">query_stats</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-lg font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={totals.paidCount} /></p>
                <p className="text-[10px] font-semibold text-[var(--positive)] tracking-wide uppercase">Paid</p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-lg font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={totals.unpaidCount} /></p>
                <p className="text-[10px] font-semibold text-[var(--muted)] tracking-wide uppercase">Unpaid</p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] p-3">
                <p className="text-lg font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={totals.overdueCount} /></p>
                <p className="text-[10px] font-semibold text-[var(--accent)] tracking-wide uppercase">Overdue</p>
              </div>
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
                      <p className="text-base font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(inv), currency)} /></p>
                      <p className="text-[10px] text-[var(--foreground)]/25 mt-0.5">{inv.date}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md tracking-wide uppercase ${inv.statusColor}`}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
              {recentInvoices.length === 0 && (
                <div className="px-6 py-10 sm:col-span-2 lg:col-span-4 text-center">
                  <span className="material-symbols-outlined text-[38px] text-[var(--foreground)]/10 mb-2 block">receipt_long</span>
                  <p className="text-[13px] text-[var(--muted)] font-medium">No invoices yet</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

    </>
  );
}

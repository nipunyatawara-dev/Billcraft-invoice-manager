"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, getAmountPaid, getBalanceDue, getInvoiceTotal, getInvoiceTotals, getOutsourcingTotals, getPaymentState } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { useUserData } from "@/hooks/use-user-data";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "Good Evening";
  }

  return "Good Night";
}

export default function Home() {
  const { invoices } = useInvoices();
  const { currency } = useCurrency();
  const { activeProfile, outsourcingInvoices } = useUserData();
  const [greeting, setGreeting] = useState("Good Morning");
  const [hasSyncedGreeting, setHasSyncedGreeting] = useState(false);
  const recentInvoices = invoices.slice(0, 4);
  const totals = getInvoiceTotals(invoices);
  const payableTotals = getOutsourcingTotals(outsourcingInvoices);
  const outstandingAmount = totals.pendingAmount + totals.overdueAmount;
  const outstandingCount = totals.unpaidCount + totals.overdueCount;
  const openPayables = payableTotals.pendingAmount + payableTotals.overdueAmount;
  const expectedCash = outstandingAmount - openPayables;
  const firstName = activeProfile?.name.trim().split(/\s+/)[0];
  const greetingText = `${greeting}${firstName ? `, ${firstName}` : ""}`;

  useEffect(() => {
    const syncGreeting = () => {
      setGreeting(getTimeBasedGreeting());
      setHasSyncedGreeting(true);
    };
    const frame = window.requestAnimationFrame(syncGreeting);

    const interval = window.setInterval(() => {
      syncGreeting();
    }, 60_000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <main className="app-main flex-1">
        
        {/* Greeting */}
        <div className="page-heading">
          <div>
            <AnimatedText as="p" text="Dashboard" effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text={greetingText}
              effect={hasSyncedGreeting ? "fade-through" : "soft-blur-in"}
              className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
              delayMs={70}
              replayKey={greetingText}
            />
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
          
          {/* Outstanding — Featured Card (spans 2 cols, 2 rows) */}
          <div className="md:col-span-2 md:row-span-2 surface-featured p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden min-h-[280px]">
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="size-7 rounded-xl bg-[var(--featured-text)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-[var(--featured-text)]/60">account_balance_wallet</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--featured-muted)] tracking-wide">Outstanding</p>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl lg:text-5xl font-semibold text-[var(--featured-text)] mb-2 font-display">
                <AnimatedNumber value={formatCurrency(outstandingAmount, currency)} />
              </h2>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-[12px] text-[var(--positive)] font-medium bg-[var(--positive)]/15 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                  <AnimatedNumber value={outstandingCount} /> open
                </span>
                <span className="text-[12px] text-[var(--featured-text)]/35 font-medium">
                  {openPayables > 0 ? <>After vendor payables: <AnimatedNumber value={formatCurrency(expectedCash, currency)} /></> : "Client money still to collect"}
                </span>
              </div>
            </div>
          </div>

          {/* Collected Card */}
          <div className="surface-card p-5 lg:p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[var(--foreground)]/12 transition-smooth min-h-[133px]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Collected</p>
              <div className="size-7 rounded-lg bg-[var(--foreground)]/[0.04] flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-[var(--muted)]">payments</span>
              </div>
            </div>
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display"><AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} /></h3>
              <p className="text-[11px] text-[var(--muted)] font-medium"><AnimatedNumber value={totals.paidCount} /> paid invoices</p>
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

          {/* Expected Cash */}
          <div className="md:col-span-2 surface-card p-5 lg:p-6 min-h-[133px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-1">Expected Cash</p>
                <p className="text-[12px] text-[var(--muted)]">
                  {outstandingAmount > 0 || openPayables > 0 ? (
                    <>
                      <AnimatedNumber value={formatCurrency(expectedCash, currency)} />{" "}
                      <AnimatedText
                        text="after unpaid vendor payables"
                        effect="fade-through"
                        replayKey={`expected-cash-${expectedCash}`}
                      />
                    </>
                  ) : (
                    <AnimatedText text="Create invoices and payables to forecast cash" effect="fade-through" />
                  )}
                </p>
              </div>
              <div className="size-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">savings</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[var(--card-border)] p-3">
                <p className="truncate text-sm font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(outstandingAmount, currency)} /></p>
                <p className="text-[10px] font-semibold text-[var(--positive)] tracking-wide uppercase">Receivable</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] p-3">
                <p className="truncate text-sm font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(openPayables, currency)} /></p>
                <p className="text-[10px] font-semibold text-[var(--muted)] tracking-wide uppercase">Payable</p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] p-3">
                <p className={`truncate text-sm font-semibold font-display ${expectedCash < 0 ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}><AnimatedNumber value={formatCurrency(expectedCash, currency)} /></p>
                <p className="text-[10px] font-semibold text-[var(--accent)] tracking-wide uppercase">Net Open</p>
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
                    <div className="size-9 rounded-xl border border-[var(--card-border)] overflow-hidden shrink-0">
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
                      <p className="text-[10px] text-[var(--foreground)]/25 mt-0.5">
                        <AnimatedNumber value={formatCurrency(getAmountPaid(inv), currency)} /> collected
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide uppercase ${inv.statusColor}`}>
                      {getPaymentState(inv)}
                    </span>
                  </div>
                  {getBalanceDue(inv) > 0 && (
                    <p className="text-[10px] font-medium text-[var(--muted)]">
                      <AnimatedNumber value={formatCurrency(getBalanceDue(inv), currency)} /> still due
                    </p>
                  )}
                </div>
              ))}
              {recentInvoices.length === 0 && (
                <div className="px-6 py-10 sm:col-span-2 lg:col-span-4 text-center">
                  <span className="material-symbols-outlined text-[38px] text-[var(--foreground)]/10 mb-2 block">receipt_long</span>
                  <AnimatedText as="p" text="No invoices yet" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

    </>
  );
}

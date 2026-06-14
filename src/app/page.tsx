"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
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
  const [expectedTimeframe, setExpectedTimeframe] = useState("30days");
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (timeframeRef.current && !timeframeRef.current.contains(event.target as Node)) {
        setIsTimeframeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const timeframeOptions = [
    { value: "thismonth", label: "This Month" },
    { value: "30days", label: "Next 30 Days" },
    { value: "90days", label: "Next 90 Days" },
    { value: "all", label: "All Time" },
  ];

  const recentInvoices = invoices.slice(0, 4);
  const totals = getInvoiceTotals(invoices);
  const payableTotals = getOutsourcingTotals(outsourcingInvoices);
  const outstandingAmount = totals.pendingAmount + totals.overdueAmount;
  const outstandingCount = totals.unpaidCount + totals.overdueCount;
  const openPayables = payableTotals.pendingAmount + payableTotals.overdueAmount;
  const expectedCash = outstandingAmount - openPayables;
  
  const filterByTimeframe = <T extends { dueDate?: string; date: string }>(items: T[], timeframe: string): T[] => {
    if (timeframe === "all") return items;
    const now = new Date();
    return items.filter(item => {
      const itemDate = new Date(item.dueDate || item.date);
      if (timeframe === "30days") {
        const future = new Date(now); future.setDate(now.getDate() + 30);
        return itemDate <= future;
      }
      if (timeframe === "90days") {
        const future = new Date(now); future.setDate(now.getDate() + 90);
        return itemDate <= future;
      }
      if (timeframe === "thismonth") {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const expectedTotals = getInvoiceTotals(filterByTimeframe(invoices, expectedTimeframe));
  const expectedPayableTotals = getOutsourcingTotals(filterByTimeframe(outsourcingInvoices, expectedTimeframe));
  const expectedOutstandingAmount = expectedTotals.pendingAmount + expectedTotals.overdueAmount;
  const expectedOpenPayablesAmount = expectedPayableTotals.pendingAmount + expectedPayableTotals.overdueAmount;
  const expectedCashNet = expectedOutstandingAmount - expectedOpenPayablesAmount;

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
    <main className="app-main flex-1">
      
      {/* Page Header Area */}
      <div className="page-heading">
          <div>
              <AnimatedText as="p" text="Overview" effect="micro-scale-fade" className="section-eyebrow" />
              <AnimatedText
                as="h1"
                text={hasSyncedGreeting ? greetingText : "Good Morning"}
                effect="micro-scale-fade"
                className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
                delayMs={70}
              />
              <AnimatedText as="p" text="Here's what's happening with your business today." effect="micro-scale-fade" className="text-[var(--muted)] mt-2 text-sm font-medium" delayMs={140} />
          </div>
          
          <div className="flex items-center gap-3">
              <Link href="/invoices?action=new" className="flex items-center gap-2 bg-[var(--action)] hover:bg-[var(--action-hover)] text-[var(--action-text)] hover:text-[var(--action-hover-text)] px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm">
                  <i className="ph ph-plus text-lg"></i>
                  New Invoice
              </Link>
              <Link href="/analytics" className="flex items-center gap-2 bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--foreground)]/20 hover:bg-[var(--foreground)]/[0.02] text-[var(--foreground)] px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm">
                  <i className="ph ph-trend-up text-lg"></i>
                  View Analytics
              </Link>
          </div>
      </div>

      {/* Top Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Outstanding Card (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                      <i className="ph ph-receipt text-xl"></i>
                  </div>
                  <h2 className="font-semibold text-[var(--foreground)]">Outstanding</h2>
              </div>
              
              <div className="relative z-10">
                  <p className="text-[var(--muted)] text-sm font-medium mb-2">Total outstanding</p>
                  <div className="text-5xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
                    <AnimatedNumber value={formatCurrency(outstandingAmount, currency)} />
                  </div>
                  
                  <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-semibold">
                          <i className="ph ph-file-text"></i> <AnimatedNumber value={outstandingCount} /> open
                      </span>
                      <span className="text-sm text-[var(--muted)] font-medium">After vendor payables: <strong className="text-[var(--foreground)]"><AnimatedNumber value={formatCurrency(expectedCash, currency)} /></strong></span>
                  </div>
              </div>

              {/* Abstract Graphic SVG */}
              <div className="absolute right-6 bottom-6 w-48 h-32 opacity-90 pointer-events-none hidden sm:block">
                  <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M141.5 125.5C163.591 125.5 181.5 107.591 181.5 85.5C181.5 63.4086 163.591 45.5 141.5 45.5C136.216 45.5 131.171 46.5242 126.541 48.3749C119.829 27.653 100.286 12.5 77 12.5C46.6244 12.5 22 37.1244 22 67.5C22 97.8756 46.6244 122.5 77 122.5C81.8213 122.5 86.4975 121.879 90.963 120.73C99.2778 135.253 115.118 145 133 145C155.091 145 173 127.091 173 105C173 99.414 171.854 94.0954 169.789 89.2847C171.161 88.1633 172.43 86.9189 173.575 85.5684C178.694 92.5181 181.5 100.999 181.5 109.5C181.5 131.591 163.591 149.5 141.5 149.5C119.409 149.5 101.5 131.591 101.5 109.5C101.5 108.575 101.531 107.658 101.593 106.749C96.7937 110.158 91.0665 112.148 85 112.148C70.6406 112.148 59 100.507 59 86.148C59 71.7886 70.6406 60.148 85 60.148C87.218 60.148 89.3664 60.4258 91.4137 60.9472C94.2762 49.6202 104.536 41.148 116.5 41.148C130.859 41.148 142.5 52.7886 142.5 67.148C142.5 70.6385 141.811 73.9686 140.569 77.0275C140.876 77.0093 141.187 77 141.5 77C163.591 77 181.5 94.9086 181.5 117C181.5 139.091 163.591 157 141.5 157C119.409 157 101.5 139.091 101.5 117H141.5V125.5Z" fill="currentColor" className="text-[var(--foreground)]/5"/>
                      <rect x="50" y="20" width="100" height="110" rx="20" fill="currentColor" className="text-[var(--background)]"/>
                      <path d="M50 40C50 28.9543 58.9543 20 70 20H130C141.046 20 150 28.9543 150 40V130C150 141.046 141.046 150 130 150H70C58.9543 150 50 141.046 50 130V40Z" fill="currentColor" className="text-[var(--card)]"/>
                      
                      <rect x="70" y="50" width="60" height="8" rx="4" fill="currentColor" className="text-[var(--card-border)]"/>
                      <rect x="70" y="70" width="60" height="8" rx="4" fill="currentColor" className="text-[var(--card-border)]"/>
                      <rect x="70" y="90" width="40" height="8" rx="4" fill="currentColor" className="text-[var(--card-border)]"/>
                      <rect x="70" y="110" width="30" height="8" rx="4" fill="currentColor" className="text-[var(--card-border)]"/>

                      <circle cx="140" cy="100" r="22" fill="currentColor" className="text-[var(--accent)]"/>
                      <text x="140" y="101" fontSize="26" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="central" fill="currentColor" className="text-[var(--card)]">$</text>
                      
                      <circle cx="170" cy="50" r="3" fill="currentColor" className="text-[var(--accent)]/30"/>
                      <circle cx="40" cy="90" r="4" fill="currentColor" className="text-[var(--accent)]/30"/>
                      <circle cx="160" cy="130" r="2" fill="currentColor" className="text-[var(--accent)]/30"/>
                  </svg>
              </div>
          </div>

          {/* Right Column Stack (Collected & Overdue) */}
          <div className="flex flex-col gap-6">
              {/* Collected Card */}
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-5 flex items-center justify-between group cursor-pointer hover:border-[var(--accent)]/30 transition-colors">
                  <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--foreground)]/5 flex items-center justify-center text-[var(--foreground)] mt-1">
                          <i className="ph ph-wallet text-xl"></i>
                      </div>
                      <div>
                          <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Collected</h3>
                          <div className="text-2xl font-bold text-[var(--foreground)] mb-0.5"><AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} /></div>
                          <p className="text-xs text-[var(--muted)] font-medium opacity-80"><AnimatedNumber value={totals.paidCount} /> paid invoices</p>
                      </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--foreground)]/[0.04] group-hover:text-[var(--foreground)] transition-all">
                      <i className="ph ph-caret-right"></i>
                  </div>
              </div>

              {/* Overdue Card */}
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-5 flex items-center justify-between group cursor-pointer hover:border-[var(--negative)]/30 transition-colors">
                  <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--negative)]/10 flex items-center justify-center text-[var(--negative)] mt-1">
                          <i className="ph ph-warning text-xl"></i>
                      </div>
                      <div>
                          <h3 className="text-sm font-medium text-[var(--muted)] mb-1">Overdue</h3>
                          <div className="text-2xl font-bold text-[var(--foreground)] mb-0.5"><AnimatedNumber value={formatCurrency(totals.overdueAmount, currency)} /></div>
                          <p className="text-xs text-[var(--negative)] font-medium"><AnimatedNumber value={totals.overdueCount} /> invoices overdue</p>
                      </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] group-hover:bg-[var(--foreground)]/[0.04] group-hover:text-[var(--negative)] transition-all">
                      <i className="ph ph-caret-right"></i>
                  </div>
              </div>
          </div>
      </div>

      {/* Expected Cash Section */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                      <i className="ph ph-trend-up text-xl"></i>
                  </div>
                  <div>
                      <h2 className="font-semibold text-[var(--foreground)] text-lg">Expected Cash</h2>
                      <p className="text-xs text-[var(--muted)] font-medium mt-0.5"><AnimatedNumber value={formatCurrency(expectedCashNet, currency)} /> after unpaid vendor payables</p>
                  </div>
              </div>
              
              <div className="relative" ref={timeframeRef}>
                <button
                  type="button"
                  onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                  className="flex items-center justify-between gap-2 border border-[var(--card-border)] rounded-lg pl-9 pr-8 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] transition-colors min-w-[150px] bg-[var(--card)] outline-none cursor-pointer relative z-10"
                >
                  <span>{timeframeOptions.find(o => o.value === expectedTimeframe)?.label}</span>
                  <i className="ph ph-calendar-blank text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                  <i className={`ph ph-caret-down text-[var(--muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${isTimeframeOpen ? 'rotate-180' : ''}`}></i>
                </button>

                <AnimatePresence>
                  {isTimeframeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-2 w-full min-w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1.5 shadow-xl z-50 origin-top"
                    >
                      {timeframeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setExpectedTimeframe(option.value);
                            setIsTimeframeOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-between group ${
                            expectedTimeframe === option.value
                              ? "bg-[var(--accent)]/[0.08] text-[var(--accent)]"
                              : "text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04]"
                          }`}
                        >
                          {option.label}
                          {expectedTimeframe === option.value && (
                            <i className="ph-fill ph-check text-[14px]"></i>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>

          {/* Three Columns Data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-[var(--card-border)]">
              <div className="pt-4 md:pt-0 md:pl-0">
                  <div className="text-2xl font-bold text-[var(--accent)] mb-1"><AnimatedNumber value={formatCurrency(expectedOutstandingAmount, currency)} /></div>
                  <div className="text-[11px] font-bold tracking-wider text-[var(--accent)] uppercase">Receivable</div>
              </div>
              <div className="pt-4 md:pt-0 md:pl-8">
                  <div className="text-2xl font-bold text-[var(--muted)] mb-1"><AnimatedNumber value={formatCurrency(expectedOpenPayablesAmount, currency)} /></div>
                  <div className="text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">Payable</div>
              </div>
              <div className="pt-4 md:pt-0 md:pl-8">
                  <div className={`text-2xl font-bold mb-1 ${expectedCashNet < 0 ? 'text-[var(--negative)]' : 'text-[var(--foreground)]'}`}><AnimatedNumber value={formatCurrency(expectedCashNet, currency)} /></div>
                  <div className="text-[11px] font-bold tracking-wider text-[var(--foreground)]/60 uppercase">Net Open</div>
              </div>
          </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Invoices Table (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-5 flex items-center justify-between border-b border-[var(--card-border)]">
                  <h2 className="font-semibold text-[var(--foreground)] text-lg">Recent Invoices</h2>
                  <Link href="/invoices" className="text-[var(--accent)] font-semibold text-sm hover:opacity-80 px-4 py-2 border border-[var(--card-border)] rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-colors">View All</Link>
              </div>
              
              <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-sm">
                      <thead className="text-xs text-[var(--muted)] bg-[var(--card)] font-medium border-b border-[var(--card-border)]">
                          <tr>
                              <th className="px-6 py-4 font-medium">Invoice</th>
                              <th className="px-6 py-4 font-medium">Status</th>
                              <th className="px-6 py-4 font-medium">Amount</th>
                              <th className="px-6 py-4 font-medium">Due Date</th>
                              <th className="px-6 py-4 font-medium text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                          {recentInvoices.map((inv) => (
                              <tr key={inv.id} className="hover:bg-[var(--foreground)]/[0.02] transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-full border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                              <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                                          </div>
                                          <div>
                                              <div className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{inv.id}</div>
                                              <div className="text-xs text-[var(--muted)] mt-0.5">{inv.client}</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${inv.statusColor}`}>
                                          {getPaymentState(inv)}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="font-semibold text-[var(--foreground)]"><AnimatedNumber value={formatCurrency(getInvoiceTotal(inv), currency)} /></div>
                                      <div className="text-xs text-[var(--muted)] mt-0.5"><AnimatedNumber value={formatCurrency(getAmountPaid(inv), currency)} /> collected</div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-[var(--foreground)] font-medium">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "-"}</div>
                                      {getBalanceDue(inv) > 0 && (
                                        <div className="text-xs text-[var(--negative)] font-medium mt-0.5"><AnimatedNumber value={formatCurrency(getBalanceDue(inv), currency)} /> off due</div>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <button className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-transparent text-[var(--muted)] hover:border-[var(--card-border)] hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)] transition-colors">
                                          <i className="ph ph-dots-three-vertical text-lg"></i>
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {recentInvoices.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-10 text-center">
                                    <span className="material-symbols-outlined text-[38px] text-[var(--foreground)]/10 mb-2 block">receipt_long</span>
                                    <AnimatedText as="p" text="No invoices yet" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
                                </td>
                            </tr>
                          )}
                      </tbody>
                  </table>
              </div>
              
              {/* Table Footer Summary */}
              {recentInvoices.length > 0 && (
                <div className="mt-auto px-6 py-4 border-t border-[var(--card-border)] bg-[var(--foreground)]/[0.02] flex items-center justify-center gap-3 text-sm rounded-b-2xl">
                    <div className="w-6 h-6 rounded bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-xs">
                        <i className="ph ph-arrows-clockwise"></i>
                    </div>
                    <div>
                        <span className="font-semibold text-[var(--foreground)]">{totals.unpaidCount + totals.overdueCount} open</span>
                        <span className="text-[var(--muted)] ml-2">Total outstanding: <AnimatedNumber value={formatCurrency(outstandingAmount, currency)} /></span>
                    </div>
                </div>
              )}
          </div>

          {/* Quick Actions List */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-sm p-6 flex flex-col">
              <h2 className="font-semibold text-[var(--foreground)] text-lg mb-4">Quick Actions</h2>
              
              <div className="space-y-3 flex-1">
                  {/* Action Item 1 */}
                  <Link href="/invoices?action=new" className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--card-border)] hover:border-[var(--foreground)]/20 hover:bg-[var(--foreground)]/[0.02] transition-all group">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                              <i className="ph ph-file-plus text-xl"></i>
                          </div>
                          <div>
                              <div className="font-semibold text-[var(--foreground)] text-sm">Create Invoice</div>
                              <div className="text-xs text-[var(--muted)] mt-0.5">Send a new invoice</div>
                          </div>
                      </div>
                      <i className="ph ph-caret-right text-[var(--muted)] group-hover:text-[var(--foreground)]"></i>
                  </Link>

                  {/* Action Item 2 */}
                  <Link href="/expenses" className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--card-border)] hover:border-[var(--foreground)]/20 hover:bg-[var(--foreground)]/[0.02] transition-all group">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center">
                              <i className="ph ph-receipt text-xl"></i>
                          </div>
                          <div>
                              <div className="font-semibold text-[var(--foreground)] text-sm">Add Expense</div>
                              <div className="text-xs text-[var(--muted)] mt-0.5">Track a business expense</div>
                          </div>
                      </div>
                      <i className="ph ph-caret-right text-[var(--muted)] group-hover:text-[var(--foreground)]"></i>
                  </Link>

                  {/* Action Item 3 */}
                  <Link href="/clients" className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--card-border)] hover:border-[var(--foreground)]/20 hover:bg-[var(--foreground)]/[0.02] transition-all group">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6] flex items-center justify-center">
                              <i className="ph ph-user-plus text-xl"></i>
                          </div>
                          <div>
                              <div className="font-semibold text-[var(--foreground)] text-sm">Add Client</div>
                              <div className="text-xs text-[var(--muted)] mt-0.5">Create a new client profile</div>
                          </div>
                      </div>
                      <i className="ph ph-caret-right text-[var(--muted)] group-hover:text-[var(--foreground)]"></i>
                  </Link>

                  {/* Action Item 4 */}
                  <Link href="/analytics" className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--card-border)] hover:border-[var(--foreground)]/20 hover:bg-[var(--foreground)]/[0.02] transition-all group">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center">
                              <i className="ph ph-squares-four text-xl"></i>
                          </div>
                          <div>
                              <div className="font-semibold text-[var(--foreground)] text-sm">View Reports</div>
                              <div className="text-xs text-[var(--muted)] mt-0.5">Explore insights & analytics</div>
                          </div>
                      </div>
                      <i className="ph ph-caret-right text-[var(--muted)] group-hover:text-[var(--foreground)]"></i>
                  </Link>
              </div>
          </div>

      </div>
    </main>
  );
}

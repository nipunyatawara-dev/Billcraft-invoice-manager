"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, getAmountPaid, getBalanceDue, getInvoiceTotal, getPaymentState } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { useUserData } from "@/hooks/use-user-data";
import { useExpectedCashflow } from "@/hooks/use-expected-cashflow";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 22) return "Good Evening";
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

  const {
    totals,
    outstandingAmount,
    outstandingCount,
    expectedCash,
    expectedOutstandingAmount,
    expectedOpenPayablesAmount,
    expectedCashNet,
  } = useExpectedCashflow({
    invoices,
    outsourcingInvoices,
    expectedTimeframe,
  });

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
  const firstName = activeProfile?.name.trim().split(/\s+/)[0];
  const greetingText = `${greeting}${firstName ? `, ${firstName}` : ""}`;

  useEffect(() => {
    const syncGreeting = () => {
      setGreeting(getTimeBasedGreeting());
      setHasSyncedGreeting(true);
    };
    const frame = window.requestAnimationFrame(syncGreeting);
    const interval = window.setInterval(syncGreeting, 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="app-main flex-1 p-6 sm:p-10">
      {/* Page Header Area */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <AnimatedText as="p" text="Overview" effect="micro-scale-fade" className="text-xs font-bold uppercase tracking-widest text-accent mb-2" />
          <AnimatedText
            as="h1"
            text={hasSyncedGreeting ? greetingText : "Good Morning"}
            effect="micro-scale-fade"
            className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
            delayMs={70}
          />
          <AnimatedText as="p" text="Here's what's happening with your business today." effect="micro-scale-fade" className="text-muted mt-2 text-base font-medium" delayMs={140} />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="flex items-center gap-3"
        >
          <Link href="/analytics" className="flex items-center gap-2 bg-card border border-card-border hover:border-foreground/20 text-foreground px-5 py-2.5 rounded-2xl font-medium transition-all shadow-sm group">
            <i className="ph ph-trend-up text-lg group-hover:scale-110 transition-transform"></i>
            Analytics
          </Link>
          <Link href="/invoices?action=new" className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-action-text px-5 py-2.5 rounded-2xl font-medium transition-all shadow-md shadow-accent/20 group">
            <i className="ph ph-plus text-lg group-hover:rotate-90 transition-transform"></i>
            New Invoice
          </Link>
        </motion.div>
      </header>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
        
        {/* Outstanding Bento Box - Large Hero Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="md:col-span-6 lg:col-span-8 bg-gradient-to-br from-card to-card/50 backdrop-blur-xl rounded-3xl border border-card-border p-8 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl hover:shadow-accent/10 transition-all duration-500"
        >
          {/* Glass glare effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20">
              <i className="ph ph-receipt text-2xl"></i>
            </div>
            <h2 className="font-bold text-foreground text-xl">Outstanding Revenue</h2>
          </div>
          
          <div className="relative z-10">
            <div className="text-6xl sm:text-7xl font-extrabold text-foreground tracking-tighter mb-4 drop-shadow-sm">
              <AnimatedNumber value={formatCurrency(outstandingAmount, currency)} />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-semibold ring-1 ring-accent/20">
                <i className="ph-fill ph-file-text"></i> <AnimatedNumber value={outstandingCount} /> open invoices
              </span>
              <span className="px-4 py-2 rounded-xl bg-foreground/5 text-foreground text-sm font-medium border border-card-border">
                Expected after payables: <strong className="text-accent ml-1"><AnimatedNumber value={formatCurrency(expectedCash, currency)} /></strong>
              </span>
            </div>
          </div>

          {/* Decorative Background Blob */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl group-hover:bg-accent/20 transition-colors duration-700 pointer-events-none"></div>
        </motion.div>

        {/* Collected & Overdue Stacked Bento Boxes */}
        <div className="md:col-span-6 lg:col-span-4 flex flex-col gap-6">
          {/* Collected Box */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="flex-1 bg-card/80 backdrop-blur-xl rounded-3xl border border-card-border p-6 flex flex-col justify-center relative overflow-hidden group hover:border-foreground/20 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                <i className="ph ph-wallet text-xl"></i>
              </div>
              <div className="w-8 h-8 rounded-full border border-card-border flex items-center justify-center text-muted group-hover:bg-foreground group-hover:text-background transition-colors">
                <i className="ph ph-arrow-up-right"></i>
              </div>
            </div>
            <h3 className="text-muted font-medium mb-1">Total Collected</h3>
            <div className="text-3xl font-bold text-foreground mb-1">
              <AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} />
            </div>
            <p className="text-xs font-semibold text-accent"><AnimatedNumber value={totals.paidCount} /> paid invoices</p>
          </motion.div>

          {/* Overdue Box */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="flex-1 bg-negative/5 backdrop-blur-xl rounded-3xl border border-negative/20 p-6 flex flex-col justify-center relative overflow-hidden group hover:bg-negative/10 hover:border-negative/30 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-xl bg-negative/10 flex items-center justify-center text-negative group-hover:scale-110 transition-transform">
                <i className="ph ph-warning-circle text-xl"></i>
              </div>
              <div className="w-8 h-8 rounded-full border border-negative/20 flex items-center justify-center text-negative group-hover:bg-negative group-hover:text-white transition-colors">
                <i className="ph ph-arrow-right"></i>
              </div>
            </div>
            <h3 className="text-negative/80 font-medium mb-1">Overdue Amount</h3>
            <div className="text-3xl font-bold text-negative mb-1">
              <AnimatedNumber value={formatCurrency(totals.overdueAmount, currency)} />
            </div>
            <p className="text-xs font-semibold text-negative/70"><AnimatedNumber value={totals.overdueCount} /> invoices overdue</p>
          </motion.div>
        </div>

        {/* Expected Cashflow Interactive Bento */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="md:col-span-12 lg:col-span-8 h-fit bg-card rounded-3xl border border-card-border p-8 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-20">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <i className="ph-fill ph-chart-line-up text-accent"></i> Expected Cashflow
              </h2>
              <p className="text-sm text-muted mt-1">Projected net cash after settling vendor payables.</p>
            </div>
            
            <div className="relative" ref={timeframeRef}>
              <button
                type="button"
                onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                className="flex items-center gap-3 bg-foreground/5 hover:bg-foreground/10 border border-card-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-all outline-none"
              >
                <span>{timeframeOptions.find(o => o.value === expectedTimeframe)?.label}</span>
                <i className={`ph ph-caret-down text-muted transition-transform duration-300 ${isTimeframeOpen ? 'rotate-180' : ''}`}></i>
              </button>

              <AnimatePresence>
                {isTimeframeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-card border border-card-border rounded-xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                  >
                    {timeframeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setExpectedTimeframe(option.value);
                          setIsTimeframeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                          expectedTimeframe === option.value
                            ? "bg-accent/10 text-accent"
                            : "text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        {option.label}
                        {expectedTimeframe === option.value && <i className="ph-fill ph-check-circle"></i>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
            <div className="bg-foreground/[0.02] rounded-2xl p-5 border border-card-border">
              <div className="text-xs font-bold tracking-widest text-accent uppercase mb-2">Receivable</div>
              <div className="text-3xl font-bold text-foreground">
                <AnimatedNumber value={formatCurrency(expectedOutstandingAmount, currency)} />
              </div>
            </div>
            <div className="bg-foreground/[0.02] rounded-2xl p-5 border border-card-border">
              <div className="text-xs font-bold tracking-widest text-muted uppercase mb-2">Payable</div>
              <div className="text-3xl font-bold text-muted">
                <AnimatedNumber value={formatCurrency(expectedOpenPayablesAmount, currency)} />
              </div>
            </div>
            <div className={`rounded-2xl p-5 border ${expectedCashNet < 0 ? 'bg-negative/5 border-negative/20' : 'bg-accent/5 border-accent/20'}`}>
              <div className={`text-xs font-bold tracking-widest uppercase mb-2 ${expectedCashNet < 0 ? 'text-negative' : 'text-accent'}`}>Net Open</div>
              <div className={`text-4xl font-extrabold ${expectedCashNet < 0 ? 'text-negative' : 'text-foreground'}`}>
                <AnimatedNumber value={formatCurrency(expectedCashNet, currency)} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions Bento */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="md:col-span-12 lg:col-span-4 h-fit bg-card rounded-3xl border border-card-border p-8 hover:shadow-xl transition-shadow duration-300"
        >
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <i className="ph-fill ph-lightning text-accent"></i> Quick Actions
            </h2>
            <p className="text-sm text-muted mt-1">Access your most frequent tasks instantly.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { href: "/invoices?action=new", icon: "ph-file-plus", color: "text-accent", bg: "bg-accent/10", label: "Invoice" },
              { href: "/expenses", icon: "ph-receipt", color: "text-blue-500", bg: "bg-blue-500/10", label: "Expense" },
              { href: "/clients", icon: "ph-user-plus", color: "text-purple-500", bg: "bg-purple-500/10", label: "Client" },
              { href: "/analytics", icon: "ph-squares-four", color: "text-amber-500", bg: "bg-amber-500/10", label: "Reports" },
            ].map((action, i) => (
              <Link key={i} href={action.href} className="flex flex-col items-center justify-center h-[100px] rounded-2xl border border-transparent bg-foreground/[0.02] hover:bg-foreground/[0.04] hover:border-card-border transition-all group text-center">
                <div className={`w-12 h-12 mb-3 rounded-xl ${action.bg} ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <i className={`ph ${action.icon} text-2xl`}></i>
                </div>
                <div className="font-semibold text-foreground text-xs">{action.label}</div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent Invoices Bento (Full Width at Bottom) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="md:col-span-12 lg:col-span-12 bg-card rounded-3xl border border-card-border shadow-sm flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div className="px-8 py-6 flex items-center justify-between border-b border-card-border bg-foreground/[0.01]">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <i className="ph-fill ph-clock-counter-clockwise text-muted"></i> Recent Invoices
            </h2>
            <Link href="/invoices" className="text-accent font-semibold text-sm hover:text-accent/80 transition-colors flex items-center gap-1 group">
              View All <i className="ph ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
          
          <div className="overflow-x-auto flex-1 p-2">
            <table className="w-full text-left text-sm border-separate border-spacing-y-2 px-6">
              <thead className="text-xs text-muted font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="bg-foreground/[0.015] hover:bg-foreground/[0.04] transition-colors group rounded-2xl">
                    <td className="px-4 py-4 rounded-l-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full border border-card-border bg-foreground/[0.03] flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-sm">
                          <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-accent transition-colors">{inv.id}</div>
                          <div className="text-xs font-medium text-muted mt-0.5">{inv.client}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${inv.statusColor}`}>
                        {getPaymentState(inv)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-foreground text-base"><AnimatedNumber value={formatCurrency(getInvoiceTotal(inv), currency)} /></div>
                      <div className="text-xs font-medium text-muted mt-0.5"><AnimatedNumber value={formatCurrency(getAmountPaid(inv), currency)} /> collected</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-foreground font-semibold">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "-"}
                      </div>
                      {getBalanceDue(inv) > 0 && (
                        <div className="text-xs font-bold text-negative mt-0.5"><AnimatedNumber value={formatCurrency(getBalanceDue(inv), currency)} /> remaining</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right rounded-r-2xl">
                      <button className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-sm transition-all">
                        <i className="ph ph-caret-right text-lg"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center rounded-2xl bg-foreground/[0.02]">
                      <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4">
                        <i className="ph-fill ph-receipt text-3xl text-muted"></i>
                      </div>
                      <h3 className="font-bold text-foreground mb-1">No invoices yet</h3>
                      <p className="text-sm text-muted font-medium">Create your first invoice to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </main>
  );
}

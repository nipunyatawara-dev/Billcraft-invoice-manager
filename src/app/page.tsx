"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getInvoiceTotal,
  getPaymentState,
  CURRENCY_RATES,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { useExpectedCashflow } from "@/hooks/use-expected-cashflow";
import { usePageEnterMotion } from "@/hooks/use-page-enter-motion";
import { cn } from "@/lib/utils";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
import ChartLineIcon from "@/components/icons/chart-line-icon";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import {
  TrendingDown,
  TrendingUp,
  ChevronDown,
  CheckCircle2,
  History,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { QuickActionsCard } from "@/components/quick-actions-card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 22) return "Good Evening";
  return "Good Night";
}

function getMonthlyRevenue(invoices: any[], targetDate: Date, globalCurrency: string) {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  let total = 0;

  for (const inv of invoices) {
    const invCurrency = inv.currency || "USD";
    const amtPaid = getAmountPaid(inv);
    if (amtPaid <= 0) continue;

    const rateFrom = CURRENCY_RATES[invCurrency] || 1.0;
    const rateTo = CURRENCY_RATES[globalCurrency] || 1.0;
    const toGlobal = (val: number) => (val / rateFrom) * rateTo;

    if (inv.payments && inv.payments.length > 0) {
      for (const p of inv.payments) {
        if (p.paidAt) {
          const pDate = new Date(p.paidAt);
          if (pDate.getFullYear() === targetYear && pDate.getMonth() === targetMonth) {
            total += toGlobal(p.amount);
          }
        }
      }
    } else {
      const dateStr = inv.paidAt || inv.date;
      if (dateStr) {
        const pDate = new Date(dateStr);
        if (pDate.getFullYear() === targetYear && pDate.getMonth() === targetMonth) {
          total += toGlobal(amtPaid);
        }
      }
    }
  }
  return total;
}

function getProjectionData(
  invoices: any[],
  outsourcingInvoices: any[],
  timeframe: string,
  globalCurrency: string
) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const toGlobal = (amount: number, fromCurrency: string) => {
    const rateFrom = fromCurrency ? (CURRENCY_RATES[fromCurrency] || 1.0) : 1.0;
    const rateTo = globalCurrency ? (CURRENCY_RATES[globalCurrency] || 1.0) : 1.0;
    return (amount / rateFrom) * rateTo;
  };

  interface Point {
    label: string;
    startDate: Date;
    endDate: Date;
    receivable: number;
    payable: number;
    net: number;
  }

  const points: Point[] = [];

  if (timeframe === "thismonth") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const interval = 5;
    for (let day = 1; day <= totalDays; day += interval) {
      const endDay = Math.min(day + interval - 1, totalDays);
      const start = new Date(year, month, day);
      const end = new Date(year, month, endDay, 23, 59, 59);
      points.push({
        label: `${start.toLocaleDateString("en-US", { month: "short" })} ${day}-${endDay}`,
        startDate: start,
        endDate: end,
        receivable: 0,
        payable: 0,
        net: 0,
      });
    }
  } else if (timeframe === "30days") {
    for (let i = 0; i < 30; i += 5) {
      const start = new Date(now);
      start.setDate(now.getDate() + i);
      const end = new Date(now);
      end.setDate(now.getDate() + i + 4);
      end.setHours(23, 59, 59);
      points.push({
        label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.getDate()}`,
        startDate: start,
        endDate: end,
        receivable: 0,
        payable: 0,
        net: 0,
      });
    }
  } else if (timeframe === "90days") {
    for (let i = 0; i < 90; i += 15) {
      const start = new Date(now);
      start.setDate(now.getDate() + i);
      const end = new Date(now);
      end.setDate(now.getDate() + i + 14);
      end.setHours(23, 59, 59);
      points.push({
        label: `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        startDate: start,
        endDate: end,
        receivable: 0,
        payable: 0,
        net: 0,
      });
    }
  } else {
    const year = now.getFullYear();
    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59);
      points.push({
        label: start.toLocaleDateString("en-US", { month: "short" }),
        startDate: start,
        endDate: end,
        receivable: 0,
        payable: 0,
        net: 0,
      });
    }
  }

  for (const point of points) {
    for (const inv of invoices) {
      const dueStr = inv.dueDate || inv.date;
      if (dueStr) {
        const d = new Date(dueStr);
        if (d >= point.startDate && d <= point.endDate) {
          const balance = getBalanceDue(inv);
          if (balance > 0) {
            point.receivable += toGlobal(balance, inv.currency || "USD");
          }
        }
      }
    }

    for (const out of outsourcingInvoices) {
      const dueStr = out.dueDate || out.date;
      if (dueStr) {
        const d = new Date(dueStr);
        if (d >= point.startDate && d <= point.endDate) {
          const balance = getBalanceDue(out);
          if (balance > 0) {
            point.payable += toGlobal(balance, out.currency || "USD");
          }
        }
      }
    }

    point.net = point.receivable - point.payable;
    point.receivable = Math.round(point.receivable * 100) / 100;
    point.payable = Math.round(point.payable * 100) / 100;
    point.net = Math.round(point.net * 100) / 100;
  }

  return points;
}

export default function Home() {
  const outstandingBilledRef = useRef<AnimatedIconHandle>(null);
  const totalCollectedRef = useRef<AnimatedIconHandle>(null);
  const revenueGrowthRef = useRef<AnimatedIconHandle>(null);

  const { currency } = useCurrency();
  const { invoices, activeProfile, outsourcingInvoices } = useUserData();
  const [greeting, setGreeting] = useState("Good Morning");
  const [hasSyncedGreeting, setHasSyncedGreeting] = useState(false);
  const [expectedTimeframe, setExpectedTimeframe] = useState("30days");
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [mounted, setMounted] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);
  const recentInvoicesMotion = usePageEnterMotion("section");
  const cashflowMotion = usePageEnterMotion("footer");

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Month-over-month revenue growth calculation
  const { currentMonthRevenue, lastMonthRevenue, revenueGrowthPercent } = useMemo(() => {
    const now = new Date();
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentRev = getMonthlyRevenue(invoices, currentMonthDate, currency);
    const lastRev = getMonthlyRevenue(invoices, lastMonthDate, currency);

    let growthPercent = 0;
    if (lastRev > 0) {
      growthPercent = ((currentRev - lastRev) / lastRev) * 100;
    } else if (currentRev > 0) {
      growthPercent = 100.0;
    }

    return {
      currentMonthRevenue: currentRev,
      lastMonthRevenue: lastRev,
      revenueGrowthPercent: growthPercent,
    };
  }, [invoices, currency]);

  // Chart projection calculation
  const projectionData = useMemo(() => {
    return getProjectionData(invoices, outsourcingInvoices, expectedTimeframe, currency);
  }, [invoices, outsourcingInvoices, expectedTimeframe, currency]);

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

  const recentInvoices = invoices.slice(0, 3);
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

  const isPositive = revenueGrowthPercent > 0;
  const isNegative = revenueGrowthPercent < 0;
  const growthText = isPositive 
    ? `+${revenueGrowthPercent.toFixed(1)}%` 
    : `${revenueGrowthPercent.toFixed(1)}%`;

  const subtext = `${formatCurrency(currentMonthRevenue, currency)} this month vs ${formatCurrency(lastMonthRevenue, currency)} last month`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-card-border p-3 rounded-xl shadow-xl text-xs font-semibold text-foreground">
          <p className="mb-2 text-muted uppercase tracking-wider">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-6 mb-1 last:mb-0">
              <span className="flex items-center gap-1.5 text-muted">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || item.fill }} />
                {item.name}
              </span>
              <span className="font-mono">{formatCurrency(item.value, currency)}</span>
            </div>
          ))}
          {payload.length >= 2 && (
            <div className="border-t border-card-border mt-2 pt-2 flex items-center justify-between gap-6">
              <span className="text-muted">Net Cash</span>
              <span className={cn(
                "font-mono font-bold",
                (payload[0].value - payload[1].value) < 0 ? 'text-negative' : 'text-positive'
              )}>
                {formatCurrency(payload[0].value - payload[1].value, currency)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="app-main flex-1">
      {/* Page Header Area */}
      <header className="mb-8">
        <AnimatedText as="p" text={PAGE_EYEBROWS["/"]} effect="micro-scale-fade" className="section-eyebrow" />
        <AnimatedText
          as="h1"
          text={hasSyncedGreeting ? greetingText : "Good Morning"}
          effect="micro-scale-fade"
          className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          delayMs={70}
        />
        <AnimatedText as="p" text="Here's what's happening with your business today." effect="micro-scale-fade" className="text-muted mt-2 text-base font-medium" delayMs={140} />
      </header>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Outstanding Revenue Card */}
        <div 
          onMouseEnter={() => outstandingBilledRef.current?.startAnimation()}
          onMouseLeave={() => outstandingBilledRef.current?.stopAnimation()}
          className="bg-card text-card-foreground rounded-xl border border-card-border p-4 group/card transition-all hover:border-accent/30 hover:shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted">Outstanding Revenue</span>
            <FileDescriptionIcon ref={outstandingBilledRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
          </div>

          <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground currency-value">
                <AnimatedNumber value={formatCurrency(outstandingAmount, currency)} />
              </span>

              <div className="flex items-center gap-3">
                <div className="h-9 w-px bg-card-border" />
                <div className="text-xs font-semibold text-accent leading-tight select-none">
                  <div>{outstandingCount} open</div>
                  <div className="text-[10px] text-muted font-normal mt-0.5">invoices</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Collected Card */}
        <div 
          onMouseEnter={() => totalCollectedRef.current?.startAnimation()}
          onMouseLeave={() => totalCollectedRef.current?.stopAnimation()}
          className="bg-card text-card-foreground rounded-xl border border-card-border p-4 group/card transition-all hover:border-accent/30 hover:shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted">Total Collected</span>
            <WalletIcon ref={totalCollectedRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
          </div>

          <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground currency-value">
                <AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} />
              </span>

              <div className="flex items-center gap-3">
                <div className="h-9 w-px bg-card-border" />
                <div className="text-xs font-semibold text-accent leading-tight select-none">
                  <div>{totals.paidCount} paid</div>
                  <div className="text-[10px] text-muted font-normal mt-0.5">settled</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Growth Card */}
        <div 
          onMouseEnter={() => revenueGrowthRef.current?.startAnimation()}
          onMouseLeave={() => revenueGrowthRef.current?.stopAnimation()}
          className="bg-card text-card-foreground rounded-xl border border-card-border p-4 group/card transition-all hover:border-accent/30 hover:shadow-xs"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted">Revenue Growth (MoM)</span>
            <ChartLineIcon ref={revenueGrowthRef} size={20} className={cn("transition-colors", isNegative ? "text-negative" : "text-positive")} />
          </div>

          <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground currency-value">
                <AnimatedNumber value={formatCurrency(currentMonthRevenue, currency)} />
              </span>

              <div className="flex items-center gap-3">
                <div className="h-9 w-px bg-card-border" />
                <div className={cn(
                  "text-xs font-bold flex items-center gap-1 leading-none select-none",
                  isPositive ? "text-positive" : isNegative ? "text-negative" : "text-muted"
                )}>
                  {isNegative ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                  <span>{revenueGrowthPercent.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT INVOICES — above chart so activity stays above the fold */}
      <motion.div 
        {...recentInvoicesMotion}
        className="w-full bg-card rounded-xl border border-card-border shadow-xs flex flex-col overflow-hidden mb-4"
      >
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-card-border bg-foreground/[0.01]">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <History className="size-4 text-muted" /> Recent Invoices
          </h2>
          <Link href="/invoices" className="text-accent font-semibold text-sm hover:text-accent/80 transition-colors flex items-center gap-1 group">
            View All <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="overflow-x-auto flex-1 px-1 py-1">
          <table className="w-full text-left text-sm border-separate border-spacing-y-1 px-4">
            <thead className="text-[10px] text-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv.id} className="bg-foreground/[0.015] hover:bg-foreground/[0.04] transition-colors group rounded-xl">
                  <td className="px-3 py-2.5 rounded-l-xl">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full border border-card-border bg-accent/10 text-accent flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 shadow-xs">
                        {inv.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="w-full h-full object-cover" alt={inv.client} src={inv.avatar} />
                        ) : (
                          (inv.client || "C")[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">{inv.id}</div>
                        <div className="text-xs font-medium text-muted">{inv.client}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                      inv.status === "Paid" 
                        ? "bg-positive/10 border-positive/20 text-positive" 
                        : inv.status === "Overdue" 
                          ? "bg-negative/10 border-negative/20 text-negative" 
                          : "bg-foreground/[0.03] border-card-border text-muted"
                    )}>
                      {getPaymentState(inv)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-sm text-foreground">
                      <AnimatedNumber value={formatCurrency(getInvoiceTotal(inv), currency)} />
                    </div>
                    <div className="text-[11px] font-medium text-muted">
                      <AnimatedNumber value={formatCurrency(getAmountPaid(inv), currency)} /> collected
                    </div>
                  </td>
                  <td className="px-3 py-2.5 rounded-r-xl">
                    <div className="text-sm text-foreground font-semibold">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'}) : "-"}
                    </div>
                    {getBalanceDue(inv) > 0 && (
                      <div className="text-[11px] font-bold text-negative">
                        <AnimatedNumber value={formatCurrency(getBalanceDue(inv), currency)} /> remaining
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center rounded-xl bg-foreground/[0.02]">
                    <div className="size-12 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-3">
                      <Receipt className="size-6 text-muted" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground mb-0.5">No invoices yet</h3>
                    <p className="text-xs text-muted font-medium">Create your first invoice to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* CHART & QUICK ACTIONS */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        
        {/* Expected Cashflow Interactive Card */}
        <motion.div 
          {...cashflowMotion}
          className="bg-card text-card-foreground rounded-xl border border-card-border p-5 flex-1 flex flex-col relative overflow-hidden min-h-0"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 relative z-20">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ChartLineIcon size={18} className="text-accent" /> Expected Cashflow
              </h2>
              <p className="text-xs text-muted mt-0.5">Projected net cash after settling vendor payables.</p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
              {/* Chart Type Selector */}
              <div className="flex items-center bg-foreground/[0.03] border border-card-border rounded-lg p-0.5 select-none shrink-0">
                {(["area", "line", "bar"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setChartType(type)}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-semibold rounded-md capitalize transition-all cursor-pointer",
                      chartType === type
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted hover:text-foreground"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Timeframe Dropdown */}
              <div className="relative shrink-0" ref={timeframeRef}>
                <button
                  type="button"
                  onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                  className="flex items-center gap-1.5 bg-card hover:bg-foreground/5 border border-card-border rounded-lg px-2.5 py-1 text-xs font-semibold text-foreground transition-all outline-none cursor-pointer h-7"
                >
                  <span>{timeframeOptions.find(o => o.value === expectedTimeframe)?.label}</span>
                  <ChevronDown className={cn("size-3.5 text-muted transition-transform duration-300", isTimeframeOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isTimeframeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-40 bg-card border border-card-border rounded-lg shadow-2xl p-1 z-50 backdrop-blur-xl"
                    >
                      {timeframeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setExpectedTimeframe(option.value);
                            setIsTimeframeOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-between cursor-pointer",
                            expectedTimeframe === option.value
                              ? "bg-accent/10 text-accent font-semibold"
                              : "text-foreground hover:bg-foreground/5"
                          )}
                        >
                          {option.label}
                          {expectedTimeframe === option.value && <CheckCircle2 className="size-3.5" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 mb-4">
            <div className="bg-foreground/[0.01] rounded-lg p-2.5 border border-card-border/50">
              <div className="text-[10px] font-bold tracking-widest text-accent uppercase mb-0.5">Receivable</div>
              <div className="text-lg font-bold text-foreground">
                <AnimatedNumber value={formatCurrency(expectedOutstandingAmount, currency)} />
              </div>
            </div>
            <div className="bg-foreground/[0.01] rounded-lg p-2.5 border border-card-border/50">
              <div className="text-[10px] font-bold tracking-widest text-muted uppercase mb-0.5">Payable</div>
              <div className="text-lg font-bold text-muted">
                <AnimatedNumber value={formatCurrency(expectedOpenPayablesAmount, currency)} />
              </div>
            </div>
            <div className={cn(
              "rounded-lg p-2.5 border",
              expectedCashNet < 0 ? 'bg-negative/5 border-negative/20' : 'bg-accent/5 border-accent/20'
            )}>
              <div className={cn(
                "text-[10px] font-bold tracking-widest uppercase mb-0.5",
                expectedCashNet < 0 ? 'text-negative' : 'text-accent'
              )}>Net Open</div>
              <div className={cn(
                "text-lg font-bold",
                expectedCashNet < 0 ? 'text-negative' : 'text-foreground'
              )}>
                <AnimatedNumber value={formatCurrency(expectedCashNet, currency)} />
              </div>
            </div>
          </div>

          {/* Interactive Recharts Component */}
          <div className="h-[160px] w-full mt-auto">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceivable" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPayable" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-soft)" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="var(--chart-soft)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeWidth={1} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="receivable" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorReceivable)" name="Receivable" />
                    <Area type="monotone" dataKey="payable" stroke="var(--chart-soft)" strokeWidth={2} fillOpacity={1} fill="url(#colorPayable)" name="Payable" />
                  </AreaChart>
                ) : chartType === "line" ? (
                  <LineChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeWidth={1} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="receivable" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Receivable" />
                    <Line type="monotone" dataKey="payable" stroke="var(--chart-soft)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Payable" />
                  </LineChart>
                ) : (
                  <BarChart data={projectionData} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" strokeWidth={1} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="receivable" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={20} name="Receivable" />
                    <Bar dataKey="payable" fill="var(--chart-soft)" radius={[3, 3, 0, 0]} maxBarSize={20} name="Payable" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-foreground/[0.02] animate-pulse rounded-xl flex items-center justify-center text-xs text-muted font-medium">
                Loading cashflow projection...
              </div>
            )}
          </div>
        </motion.div>

        <QuickActionsCard className="lg:self-stretch" />
      </div>
    </main>
  );
}

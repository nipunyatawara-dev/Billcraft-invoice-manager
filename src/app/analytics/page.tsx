"use client";

import { formatCurrency, getClientsFromInvoices, getInvoiceTotal, getInvoiceTotals, type Invoice } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";

const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", { weekday: "short" });

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function getRevenueChartData(invoices: Invoice[]) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: getDayKey(date),
      label: DAY_FORMATTER.format(date),
      total: 0,
    };
  });
  const dayMap = new Map(days.map((day) => [day.key, day]));

  invoices.forEach((invoice) => {
    const parsedDate = startOfDay(new Date(invoice.date));

    if (Number.isNaN(parsedDate.getTime())) {
      return;
    }

    const chartDay = dayMap.get(getDayKey(parsedDate));

    if (chartDay) {
      chartDay.total += getInvoiceTotal(invoice);
    }
  });

  return days;
}

export default function Analytics() {
  const { invoices } = useInvoices();
  const { currency } = useCurrency();
  const totals = getInvoiceTotals(invoices);
  const clients = getClientsFromInvoices(invoices);
  const revenueChartData = getRevenueChartData(invoices);
  const revenueChartMax = Math.max(...revenueChartData.map((day) => day.total), 0);
  const revenueChartTotal = revenueChartData.reduce((sum, day) => sum + day.total, 0);
  const paidRatio = invoices.length > 0 ? Math.round((totals.paidCount / invoices.length) * 100) : 0;
  const averageInvoice = invoices.length > 0 ? totals.totalAmount / invoices.length : 0;
  const averageClientValue = clients.length > 0 ? totals.totalAmount / clients.length : 0;
  const topClient = [...clients].sort((a, b) => b.totalBilled - a.totalBilled)[0];

  return (
    <>
      <main className="app-main flex-1">
        
        {/* Header */}
        <div className="page-heading">
          <div>
            <p className="section-eyebrow">Overview</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]">
              Analytics
            </h1>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <div className="bg-[var(--foreground)]/[0.03] p-0.5 rounded-lg flex border border-[var(--card-border)] w-full md:w-auto overflow-x-auto">
                <button className="px-3 py-1 rounded-md bg-[var(--action)] text-[var(--action-text)] text-[12px] font-medium transition-smooth whitespace-nowrap">This Month</button>
                <button className="px-3 py-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] text-[12px] font-medium transition-smooth whitespace-nowrap">Last Quarter</button>
                <button className="px-3 py-1 rounded-md text-[var(--muted)] hover:text-[var(--foreground)] text-[12px] font-medium transition-smooth whitespace-nowrap">This Year</button>
             </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-auto mb-3">
          
          {/* Main Chart Area */}
          <div className="md:col-span-2 surface-card p-6 lg:p-7 flex flex-col justify-between min-h-[320px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-0.5">Revenue Flow</h3>
                <p className="text-[12px] font-medium text-[var(--muted)]">
                  {invoices.length > 0 ? `${formatCurrency(revenueChartTotal, currency)} in the last 7 days` : "No invoice data yet"}
                </p>
              </div>
              <div className="size-9 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                 <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">monitoring</span>
              </div>
            </div>
            
            {invoices.length > 0 ? (
              <>
                <div className="flex-1 flex items-end gap-1.5 mt-3 pt-4 border-t border-[var(--card-border)]">
                  {revenueChartData.map((day) => {
                    const barHeight = revenueChartMax > 0 ? Math.max((day.total / revenueChartMax) * 90, 4) : 4;

                    return (
                      <div
                        key={day.key}
                        className={`flex-1 rounded-t-lg transition-all relative group/bar cursor-pointer ${
                          day.total > 0 ? "bg-[var(--accent)]/35 hover:bg-[var(--accent)]/45" : "bg-[var(--foreground)]/[0.06]"
                        }`}
                        style={{ height: `${barHeight}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[var(--accent)] opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                          {formatCurrency(day.total, currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2.5 text-[9px] font-semibold text-[var(--foreground)]/25 px-1 uppercase tracking-widest">
                  {revenueChartData.map((day) => <span key={day.key}>{day.label}</span>)}
                </div>
              </>
            ) : (
              <div className="flex-1 mt-3 pt-4 border-t border-[var(--card-border)] flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3">monitoring</span>
                <p className="text-[13px] font-semibold text-[var(--foreground)]">No revenue to chart</p>
                <p className="text-[11px] text-[var(--muted)] mt-1">Create an invoice and this tile will update automatically.</p>
              </div>
            )}
          </div>

          {/* Paid Ratio */}
          <div className="surface-featured p-6 lg:p-7 flex flex-col justify-between relative overflow-hidden group min-h-[320px]">
             <div className="absolute inset-0 bg-gradient-to-br from-[var(--featured-text)]/[0.03] to-transparent pointer-events-none" />
             <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none group-hover:bg-[var(--accent)]/15 transition-all duration-700" />
            
             <div className="relative z-10 flex items-center justify-between mb-3">
                <p className="text-[13px] font-medium text-[var(--featured-text)]/50 tracking-wide">Paid Ratio</p>
                <div className="size-9 rounded-lg bg-[var(--featured-text)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-[var(--featured-text)]/60">pie_chart</span>
                </div>
             </div>
             <div className="relative z-10 flex-1 flex flex-col justify-center items-center">
                 {/* Circle Graph */}
                 <div className="relative size-32 mb-3">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                       <path
                         className="text-[var(--featured-text)]/10"
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke="currentColor"
                         strokeWidth="3"
                       />
                       <path
                         className="text-[var(--accent)]"
                         strokeDasharray={`${paidRatio}, 100`}
                         d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                         fill="none"
                         stroke="currentColor"
                         strokeWidth="3"
                         strokeLinecap="round"
                       />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-2xl font-semibold text-[var(--featured-text)] font-display">{paidRatio}%</span>
                    </div>
                 </div>
                 <p className="text-[var(--featured-text)]/50 text-[12px] font-medium text-center">{paidRatio}% of invoices are marked paid.</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 auto-rows-auto">
           {/* Average Invoice Value */}
           <div className="surface-card p-5 lg:p-6 flex flex-col justify-between hover:border-[var(--foreground)]/12 transition-smooth min-h-[140px] group">
              <div className="flex items-center justify-between">
                 <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Avg. Invoice</p>
                 <div className="size-8 rounded-lg bg-[var(--foreground)]/[0.04] flex items-center justify-center group-hover:scale-105 transition-transform">
                   <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">request_quote</span>
                 </div>
              </div>
              <div>
                 <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display">{formatCurrency(averageInvoice, currency)}</h3>
                 <p className="text-[11px] text-[var(--muted)] font-medium">
                   {invoices.length > 0 ? `Based on ${invoices.length} invoices` : "No invoices yet"}
                 </p>
              </div>
           </div>

           {/* Client LTV */}
           <div className="surface-card p-5 lg:p-6 flex flex-col justify-between hover:border-[var(--foreground)]/12 transition-smooth min-h-[140px] group">
              <div className="flex items-center justify-between">
                 <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Avg. LTV</p>
                 <div className="size-8 rounded-lg bg-[var(--foreground)]/[0.04] flex items-center justify-center group-hover:scale-105 transition-transform">
                   <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">diamond</span>
                 </div>
              </div>
              <div>
                 <h3 className="text-xl lg:text-2xl font-semibold text-[var(--foreground)] mb-0.5 font-display">{formatCurrency(averageClientValue, currency)}</h3>
                 <p className="text-[11px] text-[var(--muted)] font-medium">Per client lifetime</p>
              </div>
           </div>

           {/* Top Client */}
           <div className="md:col-span-2 surface-card p-5 lg:p-6 flex flex-col justify-between hover:border-[var(--foreground)]/12 transition-smooth min-h-[140px] relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-[var(--accent)]/[0.04] to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                 <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Top Client</p>
                 <div className="size-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                   <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">star</span>
                 </div>
              </div>
              <div className="flex justify-between items-end relative z-10">
                 <div>
                   <h3 className="text-lg lg:text-xl font-semibold text-[var(--foreground)] mb-0.5 font-display">{topClient?.name || "No client yet"}</h3>
                   <p className="text-[11px] text-[var(--muted)] font-medium">Highest billed client by invoice total</p>
                 </div>
                 <div className="text-right">
                    <p className="text-base font-semibold text-[var(--foreground)]">{formatCurrency(topClient?.totalBilled || 0, currency)}</p>
                    <p className="text-[10px] font-semibold text-[var(--muted)]">Total</p>
                 </div>
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

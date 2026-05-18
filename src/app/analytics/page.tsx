"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { EvilAreaChart } from "@/components/evilcharts/charts/area-chart";
import { EvilBarChart } from "@/components/evilcharts/charts/bar-chart";
import { EvilPieChart } from "@/components/evilcharts/charts/pie-chart";
import { EvilRadialChart } from "@/components/evilcharts/charts/radial-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/chart";
import {
  DEFAULT_ANALYTICS_PREFERENCES,
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getClientsFromInvoices,
  getInvoiceTotal,
  getInvoiceTotals,
  getOutsourcingTotals,
  normalizeAnalyticsPreferences,
  type AnalyticsPreferences,
  type AnalyticsWidgetId,
  type Invoice,
  type OutsourcingInvoice,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RANGE_OPTIONS = [
  { id: "month", label: "This Month" },
  { id: "quarter", label: "This Quarter" },
  { id: "year", label: "This Year" },
] as const;

const WIDGET_DEFINITIONS: {
  id: AnalyticsWidgetId;
  title: string;
  description: string;
  icon: string;
}[] = [
  { id: "revenue-flow", title: "Client Billing Flow", description: "Client invoice value by period.", icon: "monitoring" },
  { id: "paid-ratio", title: "Paid Ratio", description: "Circular paid invoice share.", icon: "pie_chart" },
  { id: "avg-invoice", title: "Average Invoice", description: "Mean invoice value for selected range.", icon: "request_quote" },
  { id: "avg-ltv", title: "Average LTV", description: "Average billed value per client.", icon: "diamond" },
  { id: "top-client", title: "Top Client", description: "Highest billed client summary.", icon: "star" },
  { id: "revenue-trend", title: "Revenue vs Receivables", description: "Paid revenue beside open client balances.", icon: "area_chart" },
  { id: "status-mix", title: "Receivables Mix", description: "Paid, unpaid, and overdue client totals.", icon: "donut_large" },
  { id: "top-clients", title: "Top Clients", description: "Evil horizontal bars for top billed clients.", icon: "leaderboard" },
  { id: "invoice-aging", title: "Invoice Aging", description: "Evil bars for open invoices by due age.", icon: "event_busy" },
  { id: "collection-gauge", title: "Collection Gauge", description: "Evil radial chart for paid vs open.", icon: "speed" },
];

const WIDGET_DEFINITION_MAP = new Map(WIDGET_DEFINITIONS.map((widget) => [widget.id, widget]));

const REVENUE_TREND_CONFIG = {
  paid: {
    label: "Paid",
    colors: { light: ["var(--positive)"], dark: ["var(--positive)"] },
  },
  open: {
    label: "Open",
    colors: { light: ["var(--chart-soft)", "var(--chart-strong)"], dark: ["var(--chart-soft)", "var(--chart-strong)"] },
  },
} satisfies ChartConfig;

const STATUS_MIX_CONFIG = {
  paid: {
    label: "Paid",
    colors: { light: ["var(--positive)"], dark: ["var(--positive)"] },
  },
  unpaid: {
    label: "Unpaid",
    colors: { light: ["var(--muted)"], dark: ["var(--muted)"] },
  },
  overdue: {
    label: "Overdue",
    colors: { light: ["var(--negative)"], dark: ["var(--negative)"] },
  },
} satisfies ChartConfig;

const TOP_CLIENTS_CONFIG = {
  billed: {
    label: "Billed",
    colors: { light: ["var(--chart-soft)", "var(--chart-strong)"], dark: ["var(--chart-soft)", "var(--chart-strong)"] },
  },
} satisfies ChartConfig;

const INVOICE_AGING_CONFIG = {
  amount: {
    label: "Open Amount",
    colors: { light: ["var(--muted)", "var(--negative)"], dark: ["var(--muted)", "var(--negative)"] },
  },
} satisfies ChartConfig;

const COLLECTION_GAUGE_CONFIG = {
  paid: {
    label: "Paid",
    colors: { light: ["var(--positive)"], dark: ["var(--positive)"] },
  },
  open: {
    label: "Open",
    colors: { light: ["var(--muted)"], dark: ["var(--muted)"] },
  },
} satisfies ChartConfig;

type AnalyticsRange = (typeof RANGE_OPTIONS)[number]["id"];

type RevenuePoint = {
  key: string;
  label: string;
  total: number;
  paid: number;
  open: number;
};

type StatusPoint = {
  status: "paid" | "unpaid" | "overdue";
  amount: number;
  invoices: number;
};

type TopClientPoint = {
  client: string;
  billed: number;
};

type AgingPoint = {
  bucket: string;
  amount: number;
  invoices: number;
};

type GaugePoint = {
  type: "paid" | "open";
  value: number;
};

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function getDateRange(range: AnalyticsRange) {
  const today = startOfDay(new Date());
  const end = endOfDay(today);

  if (range === "month") {
    return {
      start: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
      end,
    };
  }

  if (range === "quarter") {
    const currentQuarter = Math.floor(today.getMonth() / 3);

    return {
      start: startOfDay(new Date(today.getFullYear(), currentQuarter * 3, 1)),
      end,
    };
  }

  return {
    start: startOfDay(new Date(today.getFullYear(), 0, 1)),
    end,
  };
}

function filterInvoicesByDate(invoices: Invoice[], range: AnalyticsRange) {
  const { start, end } = getDateRange(range);

  return invoices.filter((invoice) => {
    const invoiceDate = startOfDay(new Date(invoice.date));

    if (Number.isNaN(invoiceDate.getTime())) {
      return false;
    }

    return invoiceDate >= start && invoiceDate <= end;
  });
}

function filterOutsourcingInvoicesByDate(invoices: OutsourcingInvoice[], range: AnalyticsRange) {
  const { start, end } = getDateRange(range);

  return invoices.filter((invoice) => {
    const invoiceDate = startOfDay(new Date(invoice.date));

    if (Number.isNaN(invoiceDate.getTime())) {
      return false;
    }

    return invoiceDate >= start && invoiceDate <= end;
  });
}

function getRevenueChartData(invoices: Invoice[], range: AnalyticsRange): RevenuePoint[] {
  const { start, end } = getDateRange(range);
  const rangeDays = Math.max(Math.ceil((end.getTime() - start.getTime()) / DAY_IN_MS), 1);
  const bucketCount = Math.min(7, rangeDays);
  const rangeLength = Math.max(end.getTime() - start.getTime(), 1);
  const bucketLength = rangeLength / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const date = new Date(start.getTime() + bucketLength * index);

    return {
      key: `${getDayKey(date)}-${index}`,
      label: DATE_LABEL_FORMATTER.format(date),
      total: 0,
      paid: 0,
      open: 0,
    };
  });

  invoices.forEach((invoice) => {
    const parsedDate = startOfDay(new Date(invoice.date));

    if (Number.isNaN(parsedDate.getTime()) || parsedDate < start || parsedDate > end) {
      return;
    }

    const bucketIndex = Math.min(Math.floor((parsedDate.getTime() - start.getTime()) / bucketLength), bucketCount - 1);
    const total = getInvoiceTotal(invoice);
    const paid = getAmountPaid(invoice);
    const open = getBalanceDue(invoice);
    buckets[bucketIndex].total += total;
    buckets[bucketIndex].paid += paid;
    buckets[bucketIndex].open += open;
  });

  return buckets;
}

function getStatusChartData(totals: ReturnType<typeof getInvoiceTotals>): StatusPoint[] {
  return [
    { status: "paid", amount: totals.paidAmount, invoices: totals.paidCount },
    { status: "unpaid", amount: totals.pendingAmount, invoices: totals.unpaidCount },
    { status: "overdue", amount: totals.overdueAmount, invoices: totals.overdueCount },
  ];
}

function getTopClientsChartData(clients: ReturnType<typeof getClientsFromInvoices>): TopClientPoint[] {
  return [...clients]
    .sort((a, b) => b.totalBilled - a.totalBilled)
    .slice(0, 5)
    .map((client) => ({
      client: client.name,
      billed: client.totalBilled,
    }));
}

function getInvoiceAgingChartData(invoices: Invoice[]): AgingPoint[] {
  const today = startOfDay(new Date());
  const buckets: AgingPoint[] = [
    { bucket: "Not due", amount: 0, invoices: 0 },
    { bucket: "0-7 days", amount: 0, invoices: 0 },
    { bucket: "8-30 days", amount: 0, invoices: 0 },
    { bucket: "31+ days", amount: 0, invoices: 0 },
    { bucket: "No due date", amount: 0, invoices: 0 },
  ];

  invoices
    .filter((invoice) => getBalanceDue(invoice) > 0)
    .forEach((invoice) => {
      const dueDate = invoice.dueDate ? startOfDay(new Date(invoice.dueDate)) : null;
      const balanceDue = getBalanceDue(invoice);
      let bucketIndex = 4;

      if (dueDate && !Number.isNaN(dueDate.getTime())) {
        const overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / DAY_IN_MS);
        bucketIndex = overdueDays < 0 ? 0 : overdueDays <= 7 ? 1 : overdueDays <= 30 ? 2 : 3;
      }

      buckets[bucketIndex].amount += balanceDue;
      buckets[bucketIndex].invoices += 1;
    });

  return buckets;
}

function getCollectionGaugeData(totals: ReturnType<typeof getInvoiceTotals>): GaugePoint[] {
  const totalAmount = totals.paidAmount + totals.pendingAmount + totals.overdueAmount;
  const paidPercent = totalAmount > 0 ? Math.round((totals.paidAmount / totalAmount) * 100) : 0;

  return [
    { type: "paid", value: paidPercent },
    { type: "open", value: Math.max(100 - paidPercent, 0) },
  ];
}

function formatCompactCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function truncateTick(value: unknown) {
  const label = String(value);
  return label.length > 12 ? `${label.slice(0, 11)}...` : label;
}

function getSavedAnalyticsPreferences(activePreferences?: AnalyticsPreferences) {
  return normalizeAnalyticsPreferences(activePreferences || DEFAULT_ANALYTICS_PREFERENCES);
}

function EmptyChartState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex min-h-[190px] flex-1 flex-col items-center justify-center text-center">
      <span className="material-symbols-outlined mb-3 text-[38px] text-[var(--foreground)]/10">{icon}</span>
      <AnimatedText as="p" text={title} effect="per-word-crossfade" className="text-[13px] font-semibold text-[var(--foreground)]" replayKey={title} />
      <p className="mt-1 max-w-[240px] text-[11px] font-medium text-[var(--muted)]">{description}</p>
    </div>
  );
}

function ChartWidgetShell({
  children,
  className = "md:col-span-2",
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  description: React.ReactNode;
  icon: string;
  title: string;
}) {
  return (
    <div className={`surface-card flex min-h-[320px] flex-col overflow-hidden p-5 lg:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[var(--foreground)]/[0.04]">
          <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">{icon}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function RevenueFlowWidget({
  activeRangeLabel,
  currency,
  filteredInvoices,
  revenueChartData,
}: {
  activeRangeLabel: string;
  currency: string;
  filteredInvoices: Invoice[];
  revenueChartData: RevenuePoint[];
}) {
  const revenueChartMax = Math.max(...revenueChartData.map((day) => day.total), 0);
  const revenueChartTotal = revenueChartData.reduce((sum, day) => sum + day.total, 0);

  return (
    <div className="surface-card group relative flex min-h-[320px] flex-col justify-between overflow-hidden p-6 md:col-span-2 lg:col-span-3 lg:p-7">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="mb-0.5 text-lg font-semibold text-[var(--foreground)]">Client Billing Flow</h3>
          <p className="text-[12px] font-medium text-[var(--muted)]">
            {filteredInvoices.length > 0 ? (
              <>
                <AnimatedNumber value={formatCurrency(revenueChartTotal, currency)} />{" "}
                <AnimatedText text={`in ${activeRangeLabel.toLowerCase()}`} effect="fade-through" replayKey={`revenue-flow-${activeRangeLabel}`} />
              </>
            ) : (
              <AnimatedText text={`No invoice data for ${activeRangeLabel.toLowerCase()}`} effect="fade-through" replayKey={`revenue-flow-empty-${activeRangeLabel}`} />
            )}
          </p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <span className="material-symbols-outlined text-[18px] text-[var(--accent)]">monitoring</span>
        </div>
      </div>

      {filteredInvoices.length > 0 ? (
        <>
          <div className="mt-3 flex flex-1 items-end gap-1.5 border-t border-[var(--card-border)] pt-4">
            {revenueChartData.map((day) => {
              const barHeight = revenueChartMax > 0 ? Math.max((day.total / revenueChartMax) * 90, 4) : 4;

              return (
                <div
                  key={day.key}
                  className={`group/bar relative flex-1 cursor-pointer rounded-t-lg transition-all ${
                    day.total > 0 ? "bg-[var(--accent)]/35 hover:bg-[var(--accent)]/45" : "bg-[var(--foreground)]/[0.06]"
                  }`}
                  style={{ height: `${barHeight}%` }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-[var(--accent)] opacity-0 transition-opacity group-hover/bar:opacity-100">
                    <AnimatedNumber value={formatCurrency(day.total, currency)} />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 flex justify-between px-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--foreground)]/25">
            {revenueChartData.map((day) => <span key={day.key}>{day.label}</span>)}
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center border-t border-[var(--card-border)] pt-4 text-center">
          <span className="material-symbols-outlined mb-3 text-[42px] text-[var(--foreground)]/10">monitoring</span>
          <AnimatedText as="p" text="No client billing to chart" effect="per-word-crossfade" className="text-[13px] font-semibold text-[var(--foreground)]" />
          <AnimatedText
            as="p"
            text={`Invoices in ${activeRangeLabel.toLowerCase()} will appear here.`}
            effect="fade-through"
            className="mt-1 text-[11px] text-[var(--muted)]"
            replayKey={`revenue-empty-caption-${activeRangeLabel}`}
          />
        </div>
      )}
    </div>
  );
}

function PaidRatioWidget({
  activeRangeLabel,
  filteredInvoices,
  paidRatio,
}: {
  activeRangeLabel: string;
  filteredInvoices: Invoice[];
  paidRatio: number;
}) {
  return (
    <div className="surface-featured relative flex min-h-[320px] flex-col justify-between overflow-hidden p-6 md:col-span-1 lg:col-span-1 lg:p-7">
      <div className="relative z-10 mb-3 flex items-center justify-between">
        <p className="text-[13px] font-medium tracking-wide text-[var(--featured-text)]/50">Paid Ratio</p>
        <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--featured-text)]/10">
          <span className="material-symbols-outlined text-[18px] text-[var(--featured-text)]/60">pie_chart</span>
        </div>
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        <div className="relative mb-3 size-32">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
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
              strokeLinecap="round"
              strokeWidth="3"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl font-semibold text-[var(--featured-text)]">
              <AnimatedNumber value={`${paidRatio}%`} />
            </span>
          </div>
        </div>
        <p className="text-center text-[12px] font-medium text-[var(--featured-text)]/50">
          {filteredInvoices.length > 0 ? (
            <>
              <AnimatedNumber value={`${paidRatio}%`} />{" "}
              <AnimatedText
                text={`of ${activeRangeLabel.toLowerCase()} invoices are marked paid.`}
                effect="fade-through"
                replayKey={`paid-ratio-${activeRangeLabel}-${paidRatio}`}
              />
            </>
          ) : (
            <AnimatedText text={`No invoices in ${activeRangeLabel.toLowerCase()}.`} effect="fade-through" replayKey={`paid-ratio-empty-${activeRangeLabel}`} />
          )}
        </p>
      </div>
    </div>
  );
}

function MetricWidget({
  caption,
  icon,
  title,
  value,
}: {
  caption: React.ReactNode;
  icon: string;
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="surface-card group flex min-h-[140px] flex-col justify-between p-5 transition-smooth hover:border-[var(--foreground)]/12 lg:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</p>
        <div className="flex size-8 items-center justify-center rounded-xl bg-[var(--foreground)]/[0.04] transition-transform group-hover:scale-105">
          <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">{icon}</span>
        </div>
      </div>
      <div>
        <h3 className="font-display mb-0.5 text-xl font-semibold text-[var(--foreground)] lg:text-2xl">{value}</h3>
        <p className="text-[11px] font-medium text-[var(--muted)]">{caption}</p>
      </div>
    </div>
  );
}

function CashflowOverview({
  activeRangeLabel,
  currency,
  netProfit,
  openPayables,
  paidOutsourcing,
  payablesCount,
  receivables,
  receivablesCount,
  revenue,
  revenueCount,
}: {
  activeRangeLabel: string;
  currency: string;
  netProfit: number;
  openPayables: number;
  paidOutsourcing: number;
  payablesCount: number;
  receivables: number;
  receivablesCount: number;
  revenue: number;
  revenueCount: number;
}) {
  const projectedNetCash = receivables - openPayables;

  return (
    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <MetricWidget
        title="Revenue"
        icon="payments"
        value={<AnimatedNumber value={formatCurrency(revenue, currency)} />}
        caption={revenueCount > 0 ? <>Collected from <AnimatedNumber value={revenueCount} /> client invoices in {activeRangeLabel.toLowerCase()}</> : `No collected revenue in ${activeRangeLabel.toLowerCase()}`}
      />
      <MetricWidget
        title="Receivables"
        icon="account_balance_wallet"
        value={<AnimatedNumber value={formatCurrency(receivables, currency)} />}
        caption={receivablesCount > 0 ? <>Clients still owe this across <AnimatedNumber value={receivablesCount} /> invoices</> : "No open client balances in this range"}
      />
      <MetricWidget
        title="Payables"
        icon="engineering"
        value={<AnimatedNumber value={formatCurrency(openPayables, currency)} />}
        caption={payablesCount > 0 ? <>You still owe vendors on <AnimatedNumber value={payablesCount} /> payables</> : "No open vendor payables in this range"}
      />
      <MetricWidget
        title="Net Profit"
        icon="show_chart"
        value={<AnimatedNumber value={formatCurrency(netProfit, currency)} />}
        caption={paidOutsourcing > 0 ? <>Collected revenue minus <AnimatedNumber value={formatCurrency(paidOutsourcing, currency)} /> paid outsourcing</> : <>Projected open cash: <AnimatedNumber value={formatCurrency(projectedNetCash, currency)} /></>}
      />
    </div>
  );
}

function TopClientWidget({
  currency,
  topClient,
}: {
  currency: string;
  topClient?: ReturnType<typeof getClientsFromInvoices>[number];
}) {
  return (
    <div className="surface-card group relative flex min-h-[140px] flex-col justify-between overflow-hidden p-5 transition-smooth hover:border-[var(--foreground)]/12 md:col-span-2 lg:col-span-2 lg:p-6">
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-24 bg-gradient-to-l from-[var(--accent)]/[0.04] to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Top Client</p>
        <div className="flex size-8 items-center justify-center rounded-xl bg-[var(--accent)]/10 transition-transform group-hover:scale-105">
          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">star</span>
        </div>
      </div>
      <div className="relative z-10 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display mb-0.5 truncate text-lg font-semibold text-[var(--foreground)] lg:text-xl">{topClient?.name || "No client yet"}</h3>
          <p className="text-[11px] font-medium text-[var(--muted)]">Highest billed client by invoice total</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold text-[var(--foreground)]">
            <AnimatedNumber value={formatCurrency(topClient?.totalBilled || 0, currency)} />
          </p>
          <p className="text-[10px] font-semibold text-[var(--muted)]">Total</p>
        </div>
      </div>
    </div>
  );
}

function RevenueTrendWidget({
  activeRangeLabel,
  currency,
  data,
}: {
  activeRangeLabel: string;
  currency: string;
  data: RevenuePoint[];
}) {
  const hasData = data.some((point) => point.total > 0);

  return (
    <ChartWidgetShell
      className="md:col-span-2 lg:col-span-2"
      description={`Collected revenue and client receivables in ${activeRangeLabel.toLowerCase()}`}
      icon="area_chart"
      title="Revenue vs Receivables"
    >
      {hasData ? (
        <EvilAreaChart
          className="h-[240px] min-h-[240px]"
          data={data}
          chartConfig={REVENUE_TREND_CONFIG}
          xDataKey="label"
          stackType="stacked"
          curveType="monotone"
          areaVariant="gradient"
          strokeVariant="solid"
          activeDotVariant="border"
          tooltipRoundness="md"
          tooltipVariant="frosted-glass"
          xAxisProps={{ tickMargin: 8 }}
          yAxisProps={{ tickFormatter: (value) => formatCompactCurrency(Number(value), currency) }}
        />
      ) : (
        <EmptyChartState icon="area_chart" title="No trend data" description="Create invoices in this range to fill the revenue trend." />
      )}
    </ChartWidgetShell>
  );
}

function StatusMixWidget({
  activeRangeLabel,
  currency,
  data,
  totals,
}: {
  activeRangeLabel: string;
  currency: string;
  data: StatusPoint[];
  totals: ReturnType<typeof getInvoiceTotals>;
}) {
  const hasData = data.some((point) => point.amount > 0);

  return (
    <ChartWidgetShell
      className="md:col-span-1 lg:col-span-2"
      description={`Client invoice balances by status in ${activeRangeLabel.toLowerCase()}`}
      icon="donut_large"
      title="Receivables Mix"
    >
      {hasData ? (
        <>
          <EvilPieChart
            className="h-[220px] min-h-[220px]"
            data={data}
            dataKey="amount"
            nameKey="status"
            chartConfig={STATUS_MIX_CONFIG}
            innerRadius={58}
            outerRadius="82%"
            paddingAngle={3}
            cornerRadius={8}
            glowingSectors={["paid"]}
            tooltipRoundness="md"
            tooltipVariant="frosted-glass"
            legendVariant="circle"
          />
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--card-border)] pt-3">
            <StatusMiniStat label="Paid" value={formatCurrency(totals.paidAmount, currency)} />
            <StatusMiniStat label="Unpaid" value={formatCurrency(totals.pendingAmount, currency)} />
            <StatusMiniStat label="Overdue" value={formatCurrency(totals.overdueAmount, currency)} />
          </div>
        </>
      ) : (
        <EmptyChartState icon="donut_large" title="No status mix" description="Invoice totals will appear once this range has data." />
      )}
    </ChartWidgetShell>
  );
}

function StatusMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] font-semibold text-[var(--foreground)]">{value}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
    </div>
  );
}

function TopClientsChartWidget({
  activeRangeLabel,
  currency,
  data,
}: {
  activeRangeLabel: string;
  currency: string;
  data: TopClientPoint[];
}) {
  const hasData = data.some((point) => point.billed > 0);

  return (
    <ChartWidgetShell
      className="md:col-span-2 lg:col-span-2"
      description={`Top billed clients in ${activeRangeLabel.toLowerCase()}`}
      icon="leaderboard"
      title="Top Clients"
    >
      {hasData ? (
        <EvilBarChart
          className="h-[250px] min-h-[250px]"
          data={data}
          chartConfig={TOP_CLIENTS_CONFIG}
          xDataKey="client"
          layout="horizontal"
          barVariant="gradient"
          barRadius={6}
          enableHoverHighlight
          hideLegend
          tooltipRoundness="md"
          tooltipVariant="frosted-glass"
          xAxisProps={{ tickFormatter: (value) => formatCompactCurrency(Number(value), currency) }}
          yAxisProps={{ tickFormatter: truncateTick, width: 92 }}
        />
      ) : (
        <EmptyChartState icon="leaderboard" title="No client ranking" description="Client totals will appear after invoices are created." />
      )}
    </ChartWidgetShell>
  );
}

function InvoiceAgingWidget({
  activeRangeLabel,
  currency,
  data,
}: {
  activeRangeLabel: string;
  currency: string;
  data: AgingPoint[];
}) {
  const hasData = data.some((point) => point.amount > 0);

  return (
    <ChartWidgetShell
      className="md:col-span-2 lg:col-span-2"
      description={`Open invoice age in ${activeRangeLabel.toLowerCase()}`}
      icon="event_busy"
      title="Invoice Aging"
    >
      {hasData ? (
        <EvilBarChart
          className="h-[250px] min-h-[250px]"
          data={data}
          chartConfig={INVOICE_AGING_CONFIG}
          xDataKey="bucket"
          barVariant="hatched"
          barRadius={6}
          enableHoverHighlight
          hideLegend
          tooltipRoundness="md"
          tooltipVariant="frosted-glass"
          xAxisProps={{ tickMargin: 8 }}
          yAxisProps={{ tickFormatter: (value) => formatCompactCurrency(Number(value), currency) }}
        />
      ) : (
        <EmptyChartState icon="event_busy" title="No open aging" description="Unpaid and overdue invoices will appear here." />
      )}
    </ChartWidgetShell>
  );
}

function CollectionGaugeWidget({
  activeRangeLabel,
  collectionRate,
  data,
}: {
  activeRangeLabel: string;
  collectionRate: number;
  data: GaugePoint[];
}) {
  const hasData = data.some((point) => point.value > 0);

  return (
    <ChartWidgetShell
      className="md:col-span-1 lg:col-span-2"
      description={`Paid versus open amount in ${activeRangeLabel.toLowerCase()}`}
      icon="speed"
      title="Revenue Collection"
    >
      {hasData ? (
        <>
          <EvilRadialChart
            className="h-[220px] min-h-[220px]"
            data={data}
            dataKey="value"
            nameKey="type"
            chartConfig={COLLECTION_GAUGE_CONFIG}
            variant="semi"
            innerRadius="34%"
            outerRadius="100%"
            barSize={16}
            cornerRadius={10}
            glowingBars={["paid"]}
            tooltipRoundness="md"
            tooltipVariant="frosted-glass"
            legendVariant="rounded-square"
          />
          <div className="mt-2 text-center">
            <p className="font-display text-3xl font-semibold text-[var(--foreground)]">
              <AnimatedNumber value={`${collectionRate}%`} />
            </p>
            <p className="mt-1 text-[11px] font-medium text-[var(--muted)]">Collected by value</p>
          </div>
        </>
      ) : (
        <EmptyChartState icon="speed" title="No collection signal" description="Paid and open invoice totals will fill this gauge." />
      )}
    </ChartWidgetShell>
  );
}

function CustomizePanel({
  draftPreferences,
  isSaving,
  onMove,
  onReset,
  onSave,
  onToggle,
}: {
  draftPreferences: AnalyticsPreferences;
  isSaving: boolean;
  onMove: (widgetId: AnalyticsWidgetId, direction: -1 | 1) => void;
  onReset: () => void;
  onSave: () => void;
  onToggle: (widgetId: AnalyticsWidgetId) => void;
}) {
  return (
    <div className="surface-card mb-3 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--card-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Customize analytics</h2>
          <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">Choose visible widgets and move them into your preferred order.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onReset} className="btn-secondary active:scale-[0.97]">
            Reset
          </button>
          <button type="button" onClick={onSave} className="btn-primary active:scale-[0.97]" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      <div className="divide-y divide-[var(--card-border)]">
        {draftPreferences.widgetOrder.map((widgetId, index) => {
          const definition = WIDGET_DEFINITION_MAP.get(widgetId);
          const isVisible = draftPreferences.visibleWidgetIds.includes(widgetId);

          if (!definition) {
            return null;
          }

          return (
            <div key={widgetId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--foreground)]/[0.04]">
                  <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">{definition.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{definition.title}</p>
                  <p className="text-[11px] font-medium text-[var(--muted)]">{definition.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onMove(widgetId, -1)}
                  className="icon-button active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Move ${definition.title} up`}
                  disabled={index === 0}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button
                  type="button"
                  onClick={() => onMove(widgetId, 1)}
                  className="icon-button active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label={`Move ${definition.title} down`}
                  disabled={index === draftPreferences.widgetOrder.length - 1}
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isVisible}
                  onClick={() => onToggle(widgetId)}
                  className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                    isVisible ? "bg-[var(--action)]" : "bg-[var(--foreground)]/12"
                  }`}
                  aria-label={`${isVisible ? "Hide" : "Show"} ${definition.title}`}
                >
                  <span className={`pointer-events-none mt-1 inline-block size-4 rounded-full bg-[var(--action-text)] shadow transition duration-200 ease-in-out ${
                    isVisible ? "translate-x-5" : "translate-x-1"
                  }`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { invoices } = useInvoices();
  const { activeProfile, outsourcingInvoices, saveAnalyticsPreferences } = useUserData();
  const { currency } = useCurrency();
  const [activeRange, setActiveRange] = useState<AnalyticsRange>("month");
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [draftPreferences, setDraftPreferences] = useState<AnalyticsPreferences>(() => getSavedAnalyticsPreferences());
  const toolbarRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const updateIndicator = useCallback(() => {
    const toolbar = toolbarRef.current;
    const indicator = indicatorRef.current;
    const activeBtn = buttonRefs.current.get(activeRange);

    if (!toolbar || !indicator || !activeBtn) {
      return;
    }

    const toolbarRect = toolbar.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    indicator.style.left = `${btnRect.left - toolbarRect.left}px`;
    indicator.style.width = `${btnRect.width}px`;
  }, [activeRange]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);
  const filteredInvoices = useMemo(() => filterInvoicesByDate(invoices, activeRange), [activeRange, invoices]);
  const filteredOutsourcingInvoices = useMemo(() => filterOutsourcingInvoicesByDate(outsourcingInvoices, activeRange), [activeRange, outsourcingInvoices]);
  const activeRangeLabel = RANGE_OPTIONS.find((option) => option.id === activeRange)?.label || "This Month";
  const totals = useMemo(() => getInvoiceTotals(filteredInvoices), [filteredInvoices]);
  const payableTotals = useMemo(() => getOutsourcingTotals(filteredOutsourcingInvoices), [filteredOutsourcingInvoices]);
  const clients = useMemo(() => getClientsFromInvoices(filteredInvoices), [filteredInvoices]);
  const revenueChartData = useMemo(() => getRevenueChartData(invoices, activeRange), [activeRange, invoices]);
  const statusChartData = useMemo(() => getStatusChartData(totals), [totals]);
  const topClientsChartData = useMemo(() => getTopClientsChartData(clients), [clients]);
  const invoiceAgingChartData = useMemo(() => getInvoiceAgingChartData(filteredInvoices), [filteredInvoices]);
  const collectionGaugeData = useMemo(() => getCollectionGaugeData(totals), [totals]);
  const paidRatio = filteredInvoices.length > 0 ? Math.round((totals.paidCount / filteredInvoices.length) * 100) : 0;
  const collectionRate = totals.totalAmount > 0 ? Math.round((totals.paidAmount / totals.totalAmount) * 100) : 0;
  const averageInvoice = filteredInvoices.length > 0 ? totals.totalAmount / filteredInvoices.length : 0;
  const averageClientValue = clients.length > 0 ? totals.totalAmount / clients.length : 0;
  const topClient = [...clients].sort((a, b) => b.totalBilled - a.totalBilled)[0];
  const receivables = totals.pendingAmount + totals.overdueAmount;
  const receivablesCount = totals.unpaidCount + totals.overdueCount;
  const openPayables = payableTotals.pendingAmount + payableTotals.overdueAmount;
  const openPayablesCount = payableTotals.unpaidCount + payableTotals.overdueCount;
  const paidOutsourcing = payableTotals.paidAmount;
  const netProfit = totals.paidAmount - paidOutsourcing;

  useEffect(() => {
    setDraftPreferences(getSavedAnalyticsPreferences(activeProfile?.analyticsPreferences));
  }, [activeProfile?.analyticsPreferences, activeProfile?.id]);

  const visibleWidgetIds = draftPreferences.widgetOrder.filter((widgetId) => draftPreferences.visibleWidgetIds.includes(widgetId));

  function moveDraftWidget(widgetId: AnalyticsWidgetId, direction: -1 | 1) {
    setDraftPreferences((currentPreferences) => {
      const widgetOrder = [...currentPreferences.widgetOrder];
      const currentIndex = widgetOrder.indexOf(widgetId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= widgetOrder.length) {
        return currentPreferences;
      }

      [widgetOrder[currentIndex], widgetOrder[nextIndex]] = [widgetOrder[nextIndex], widgetOrder[currentIndex]];

      return { ...currentPreferences, widgetOrder };
    });
  }

  function toggleDraftWidget(widgetId: AnalyticsWidgetId) {
    setDraftPreferences((currentPreferences) => {
      const isVisible = currentPreferences.visibleWidgetIds.includes(widgetId);

      if (isVisible && currentPreferences.visibleWidgetIds.length === 1) {
        notify.warning({
          title: "Keep one widget visible",
          description: "Analytics needs at least one chart or metric on the page.",
        });
        return currentPreferences;
      }

      return {
        ...currentPreferences,
        visibleWidgetIds: isVisible
          ? currentPreferences.visibleWidgetIds.filter((currentWidgetId) => currentWidgetId !== widgetId)
          : [...currentPreferences.visibleWidgetIds, widgetId],
      };
    });
  }

  function resetDraftPreferences() {
    setDraftPreferences(normalizeAnalyticsPreferences(DEFAULT_ANALYTICS_PREFERENCES));
    notify.info({
      title: "Default layout staged",
      description: "Save to use the default analytics layout for this profile.",
    });
  }

  async function handleSavePreferences() {
    if (!activeProfile) {
      notify.warning({
        title: "Create a profile first",
        description: "Analytics layout preferences are saved to the active profile.",
      });
      return;
    }

    const nextPreferences = normalizeAnalyticsPreferences({
      ...draftPreferences,
      updatedAt: new Date().toISOString(),
    });

    if (nextPreferences.visibleWidgetIds.length === 0) {
      notify.warning({
        title: "Keep one widget visible",
        description: "Turn on at least one analytics widget before saving.",
      });
      return;
    }

    setIsSavingPreferences(true);

    try {
      await notifyPromise(saveAnalyticsPreferences(nextPreferences), {
        loading: {
          title: "Saving analytics layout...",
          description: "Updating this profile's chart preferences.",
        },
        success: {
          title: "Analytics layout saved",
          description: "This profile will use your custom chart order.",
        },
        error: (error) => ({
          title: "Layout save failed",
          description: getToastErrorMessage(error, "Unable to save analytics preferences."),
        }),
      });
      setDraftPreferences(nextPreferences);
      setIsCustomizeOpen(false);
    } finally {
      setIsSavingPreferences(false);
    }
  }

  function renderWidget(widgetId: AnalyticsWidgetId) {
    if (widgetId === "revenue-flow") {
      return (
        <RevenueFlowWidget
          activeRangeLabel={activeRangeLabel}
          currency={currency}
          filteredInvoices={filteredInvoices}
          revenueChartData={revenueChartData}
        />
      );
    }

    if (widgetId === "paid-ratio") {
      return <PaidRatioWidget activeRangeLabel={activeRangeLabel} filteredInvoices={filteredInvoices} paidRatio={paidRatio} />;
    }

    if (widgetId === "avg-invoice") {
      return (
        <MetricWidget
          title="Avg. Invoice"
          icon="request_quote"
          value={<AnimatedNumber value={formatCurrency(averageInvoice, currency)} />}
          caption={filteredInvoices.length > 0 ? <>Based on <AnimatedNumber value={filteredInvoices.length} /> invoices</> : `No invoices in ${activeRangeLabel.toLowerCase()}`}
        />
      );
    }

    if (widgetId === "avg-ltv") {
      return (
        <MetricWidget
          title="Avg. LTV"
          icon="diamond"
          value={<AnimatedNumber value={formatCurrency(averageClientValue, currency)} />}
          caption={clients.length > 0 ? <>Across <AnimatedNumber value={clients.length} /> clients</> : "No client totals yet"}
        />
      );
    }

    if (widgetId === "top-client") {
      return <TopClientWidget currency={currency} topClient={topClient} />;
    }

    if (widgetId === "revenue-trend") {
      return <RevenueTrendWidget activeRangeLabel={activeRangeLabel} currency={currency} data={revenueChartData} />;
    }

    if (widgetId === "status-mix") {
      return <StatusMixWidget activeRangeLabel={activeRangeLabel} currency={currency} data={statusChartData} totals={totals} />;
    }

    if (widgetId === "top-clients") {
      return <TopClientsChartWidget activeRangeLabel={activeRangeLabel} currency={currency} data={topClientsChartData} />;
    }

    if (widgetId === "invoice-aging") {
      return <InvoiceAgingWidget activeRangeLabel={activeRangeLabel} currency={currency} data={invoiceAgingChartData} />;
    }

    if (widgetId === "collection-gauge") {
      return <CollectionGaugeWidget activeRangeLabel={activeRangeLabel} collectionRate={collectionRate} data={collectionGaugeData} />;
    }

    return null;
  }

  return (
    <main className="app-main flex-1">
      <div className="page-heading">
        <div>
          <AnimatedText as="p" text="Overview" effect="micro-scale-fade" className="section-eyebrow" />
          <AnimatedText
            as="h1"
            text="Analytics"
            effect="micro-scale-fade"
            className="text-3xl font-semibold leading-[1.1] text-[var(--foreground)] lg:text-[40px]"
            delayMs={70}
          />
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <button
            type="button"
            onClick={() => setIsCustomizeOpen((isOpen) => !isOpen)}
            className={`btn-secondary active:scale-[0.97] ${isCustomizeOpen ? "bg-[var(--foreground)]/[0.04] text-[var(--foreground)]" : ""}`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Customize
          </button>
          <div ref={toolbarRef} className="segment-toolbar overflow-x-auto w-full md:w-auto">
            <span
              ref={indicatorRef}
              aria-hidden="true"
              className="segment-toolbar-indicator"
            />
            {RANGE_OPTIONS.map((option) => {
              const isActive = activeRange === option.id;

              return (
                <button
                  key={option.id}
                  ref={(el) => { if (el) buttonRefs.current.set(option.id, el); }}
                  onClick={() => setActiveRange(option.id)}
                  data-active={isActive}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isCustomizeOpen && (
        <CustomizePanel
          draftPreferences={draftPreferences}
          isSaving={isSavingPreferences}
          onMove={moveDraftWidget}
          onReset={resetDraftPreferences}
          onSave={handleSavePreferences}
          onToggle={toggleDraftWidget}
        />
      )}

      <CashflowOverview
        activeRangeLabel={activeRangeLabel}
        currency={currency}
        netProfit={netProfit}
        openPayables={openPayables}
        paidOutsourcing={paidOutsourcing}
        payablesCount={openPayablesCount}
        receivables={receivables}
        receivablesCount={receivablesCount}
        revenue={totals.paidAmount}
        revenueCount={totals.paidCount}
      />

      {visibleWidgetIds.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {visibleWidgetIds.map((widgetId) => (
            <div key={widgetId} className={widgetId === "avg-invoice" || widgetId === "avg-ltv" ? "" : "contents"}>
              {renderWidget(widgetId)}
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card p-10 text-center">
          <span className="material-symbols-outlined mb-3 block text-[42px] text-[var(--foreground)]/10">analytics</span>
          <AnimatedText as="p" text="No analytics widgets visible" effect="per-word-crossfade" className="text-[13px] font-semibold text-[var(--foreground)]" />
          <p className="mt-1 text-[11px] font-medium text-[var(--muted)]">Turn one on in Customize to rebuild this page.</p>
        </div>
      )}
    </main>
  );
}

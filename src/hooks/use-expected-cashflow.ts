import { useMemo } from "react";
import { getInvoiceTotals, getOutsourcingTotals } from "@/data/invoices";
import { type Invoice, type OutsourcingInvoice } from "@/hooks/use-user-data";

function filterByTimeframe<T extends { dueDate?: string; date: string }>(items: T[], timeframe: string): T[] {
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
}

interface UseExpectedCashflowProps {
  invoices: Invoice[];
  outsourcingInvoices: OutsourcingInvoice[];
  expectedTimeframe: string;
}

export function useExpectedCashflow({
  invoices,
  outsourcingInvoices,
  expectedTimeframe,
}: UseExpectedCashflowProps) {
  return useMemo(() => {
    const totals = getInvoiceTotals(invoices);
    const payableTotals = getOutsourcingTotals(outsourcingInvoices);
    
    const outstandingAmount = totals.pendingAmount + totals.overdueAmount;
    const outstandingCount = totals.unpaidCount + totals.overdueCount;
    const openPayables = payableTotals.pendingAmount + payableTotals.overdueAmount;
    const expectedCash = outstandingAmount - openPayables;

    const expectedTotals = getInvoiceTotals(filterByTimeframe(invoices, expectedTimeframe));
    const expectedPayableTotals = getOutsourcingTotals(filterByTimeframe(outsourcingInvoices, expectedTimeframe));
    
    const expectedOutstandingAmount = expectedTotals.pendingAmount + expectedTotals.overdueAmount;
    const expectedOpenPayablesAmount = expectedPayableTotals.pendingAmount + expectedPayableTotals.overdueAmount;
    const expectedCashNet = expectedOutstandingAmount - expectedOpenPayablesAmount;

    return {
      totals,
      outstandingAmount,
      outstandingCount,
      expectedCash,
      expectedTotals,
      expectedPayableTotals,
      expectedOutstandingAmount,
      expectedOpenPayablesAmount,
      expectedCashNet,
    };
  }, [invoices, outsourcingInvoices, expectedTimeframe]);
}

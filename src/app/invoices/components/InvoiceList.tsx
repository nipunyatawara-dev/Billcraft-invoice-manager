"use client";

import * as React from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getInvoiceTotal,
  getPaymentState,
  type Invoice,
} from "@/data/invoices";

const STATUS_FILTERS = ["All", "Paid", "Unpaid", "Overdue"] as const;

interface InvoiceListProps {
  filteredInvoices: Invoice[];
  selectedInvoiceIds: string[];
  setSelectedInvoiceIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  openViewModal: (invoice: Invoice) => void;
  openEditModal: (invoice: Invoice) => void;
  openShareModal: (invoice: Invoice) => void;
  handleExportInvoice: (invoice: Invoice) => void;
  currency: string;
}

export function InvoiceList({
  filteredInvoices,
  selectedInvoiceIds,
  setSelectedInvoiceIds,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  openViewModal,
  openEditModal,
  openShareModal,
  handleExportInvoice,
  currency,
}: InvoiceListProps) {
  const isAllSelected = filteredInvoices.length > 0 && selectedInvoiceIds.length === filteredInvoices.length;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <AnimatedSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search invoices..."
        />
        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 text-[11px] font-semibold rounded-full transition-smooth active:scale-[0.95] tracking-wide uppercase ${
                activeFilter === filter
                  ? "bg-action text-action-text"
                  : "text-muted hover:bg-foreground/[0.04] border border-card-border"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {filteredInvoices.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 mb-2 bg-card/40 border border-card-border/40 rounded-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex items-center justify-center size-5 rounded-full border-2 border-card-border hover:border-accent cursor-pointer transition-smooth shrink-0 bg-field shadow-xs"
              onClick={() => {
                if (isAllSelected) {
                  setSelectedInvoiceIds([]);
                } else {
                  setSelectedInvoiceIds(filteredInvoices.map((inv) => inv.id));
                }
              }}
            >
              {isAllSelected && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-accent transition-all duration-200">
                  <span className="material-symbols-outlined text-[12px] text-white font-extrabold select-none">check</span>
                </span>
              )}
            </button>
            <span className="text-[11px] font-semibold text-muted tracking-wider uppercase select-none">
              Select All ({filteredInvoices.length})
            </span>
          </div>
          {selectedInvoiceIds.length > 0 && (
            <button
              onClick={() => setSelectedInvoiceIds([])}
              className="text-[11px] font-bold text-muted hover:text-foreground tracking-wider uppercase transition-smooth"
            >
              Clear Selection ({selectedInvoiceIds.length})
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filteredInvoices.map((invoice) => {
          const balanceDue = getBalanceDue(invoice);
          const paymentState = getPaymentState(invoice);
          const isChecked = selectedInvoiceIds.includes(invoice.id);

          return (
            <div
              key={invoice.id}
              onClick={() => openShareModal(invoice)}
              className="surface-card w-full cursor-pointer p-4 lg:p-5 hover:border-foreground/12 transition-smooth group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openShareModal(invoice);
                }
              }}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox Selector */}
                <button
                  type="button"
                  className="relative flex items-center justify-center size-5 rounded-full border-2 border-card-border hover:border-accent cursor-pointer transition-smooth shrink-0 bg-field shadow-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isChecked) {
                      setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoice.id));
                    } else {
                      setSelectedInvoiceIds((prev) => [...prev, invoice.id]);
                    }
                  }}
                >
                  {isChecked && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-accent transition-all duration-200">
                      <span className="material-symbols-outlined text-[12px] text-white font-extrabold select-none">check</span>
                    </span>
                  )}
                </button>

                <div className="size-10 rounded-xl border border-card-border overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" alt={invoice.client} src={invoice.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[14px] text-foreground group-hover:text-accent transition-smooth truncate">{invoice.client}</h3>
                  <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                    <span className="font-medium">{invoice.id}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-foreground/15" />
                    {invoice.date}
                    <span className="hidden sm:inline w-0.5 h-0.5 rounded-full bg-foreground/15" />
                    <span className="hidden sm:inline">{invoice.templateName || "Classic Invoice"}</span>
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-semibold text-foreground font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                  <p className="text-[10px] text-foreground/25 tracking-wide uppercase mt-0.5">
                    <AnimatedNumber value={formatCurrency(getAmountPaid(invoice), currency)} /> collected
                  </p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 ${invoice.statusColor}`}>
                  {paymentState}
                </span>
                <span className="hidden md:inline-flex px-2 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 bg-foreground/[0.05] text-muted">
                  {invoice.workflowStatus || "Draft"}
                </span>
                <div className="hidden sm:flex gap-0.5 shrink-0 transition-opacity">
                  <span onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-foreground/45 hover:text-accent hover:bg-accent/10 transition-smooth" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); openShareModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-foreground/45 hover:text-accent hover:bg-accent/10 transition-smooth" title="Send/Share">
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); handleExportInvoice(invoice); }} className="size-8 flex items-center justify-center rounded-full text-foreground/45 hover:text-accent hover:bg-accent/10 transition-smooth" title="Export PDF">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 sm:hidden">
                <p className="text-base font-semibold text-foreground font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                <p className="text-[11px] font-medium text-muted"><AnimatedNumber value={formatCurrency(balanceDue, currency)} /> due</p>
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-foreground/10 mb-3 block">receipt_long</span>
            <AnimatedText as="p" text="No invoices yet" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
      </div>
    </>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element */

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
        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all cursor-pointer select-none active:scale-[0.95] tracking-wide uppercase ${
                activeFilter === filter
                  ? "bg-accent/10 border-accent/20 text-accent border"
                  : "text-muted hover:bg-foreground/[0.04] border border-card-border"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {selectedInvoiceIds.length > 0 && (
        <div className="flex items-center justify-between mb-3 gap-2 px-1">
          <button
            type="button"
            onClick={() => {
              if (isAllSelected) {
                setSelectedInvoiceIds([]);
              } else {
                setSelectedInvoiceIds(filteredInvoices.map((inv) => inv.id));
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-xl border transition-all cursor-pointer select-none active:scale-[0.97] tracking-wider uppercase ${
              isAllSelected
                ? "bg-accent/10 border-accent/20 text-accent font-bold"
                : "text-muted border-card-border hover:bg-foreground/[0.04] hover:text-foreground"
            }`}
          >
            <i className={isAllSelected ? "ph-fill ph-check-square text-accent text-sm" : "ph ph-square text-sm"} />
            {isAllSelected ? "Deselect All" : `Select All (${filteredInvoices.length})`}
          </button>
          
          <button
            onClick={() => setSelectedInvoiceIds([])}
            className="text-[11px] font-bold text-muted hover:text-foreground tracking-wider uppercase transition-smooth"
          >
            Clear Selection ({selectedInvoiceIds.length})
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredInvoices.map((invoice) => {
          const balanceDue = getBalanceDue(invoice);
          const paymentState = getPaymentState(invoice);
          const isChecked = selectedInvoiceIds.includes(invoice.id);

          return (
            <div
              key={invoice.id}
              onClick={() => openShareModal(invoice)}
              className="bg-card text-card-foreground border border-card-border rounded-xl w-full cursor-pointer p-4 lg:p-5 hover:shadow-xl hover:border-accent/30 transition-all duration-300 group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openShareModal(invoice);
                }
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Checkbox Selector */}
                  <button
                    type="button"
                    className="relative flex items-center justify-center size-5 rounded-md border border-card-border hover:border-accent cursor-pointer transition-all shrink-0 bg-field shadow-xs"
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
                      <span className="absolute inset-0 flex items-center justify-center rounded-md bg-accent transition-all duration-200">
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
                      <span className="hidden sm:inline text-xs font-semibold">{invoice.templateName || "Classic Invoice"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-base font-semibold text-foreground font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                    <p className="text-[10px] text-foreground/25 tracking-wide uppercase mt-0.5">
                      <AnimatedNumber value={formatCurrency(getAmountPaid(invoice), currency)} /> collected
                    </p>
                  </div>
                  
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                    invoice.status === "Paid" 
                      ? "bg-positive/10 border-positive/20 text-positive" 
                      : invoice.status === "Overdue" 
                        ? "bg-negative/10 border-negative/20 text-negative" 
                        : "bg-foreground/[0.03] border-card-border text-muted"
                  }`}>
                    {paymentState}
                  </span>
                  
                  <span className="hidden md:inline-flex px-2 py-1 text-[10px] font-bold rounded-md tracking-wider uppercase shrink-0 bg-foreground/[0.03] border border-card-border text-muted">
                    {invoice.workflowStatus || "Draft"}
                  </span>
                  
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <button 
                      type="button"
                      onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} 
                      className="size-8 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer" 
                      title="Edit"
                    >
                      <i className="ph ph-pencil-simple text-sm"></i>
                    </button>
                    <button 
                      type="button"
                      onClick={(event) => { event.stopPropagation(); openShareModal(invoice); }} 
                      className="size-8 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer" 
                      title="Send/Share"
                    >
                      <i className="ph ph-share-network text-sm"></i>
                    </button>
                    <button 
                      type="button"
                      onClick={(event) => { event.stopPropagation(); handleExportInvoice(invoice); }} 
                      className="size-8 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer" 
                      title="Export PDF"
                    >
                      <i className="ph ph-download text-sm"></i>
                    </button>
                  </div>
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
          <div className="bg-card border border-card-border rounded-xl text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-foreground/10 mb-3 block">receipt_long</span>
            <AnimatedText as="p" text="No invoices yet" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
      </div>
    </>
  );
}

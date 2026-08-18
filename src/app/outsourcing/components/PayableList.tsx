/* eslint-disable @next/next/no-img-element */
import { AnimatedText } from "@/components/animated-text";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import {
  formatCurrency,
  getBalanceDue,
  getOutsourcingInvoiceTotal,
  type OutsourcingInvoice,
} from "@/data/invoices";
import PenIcon from "@/components/icons/pen-icon";
import SendIcon from "@/components/icons/send-icon";
import DownloadIcon from "@/components/icons/download-icon";
import { FolderOpen } from "lucide-react";
import { STATUS_FILTERS, getOutsourcingPaymentState } from "../outsourcing-helpers";

type PayableListProps = {
  filteredInvoices: OutsourcingInvoice[];
  currency: string;
  activeFilter: (typeof STATUS_FILTERS)[number];
  setActiveFilter: (filter: (typeof STATUS_FILTERS)[number]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openEditModal: (invoice: OutsourcingInvoice) => void;
  openShareModal: (invoice: OutsourcingInvoice) => void;
  handleExportOutsourcingInvoice: (invoice: OutsourcingInvoice) => void;
};

export function PayableList({
  filteredInvoices,
  currency,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  openEditModal,
  openShareModal,
  handleExportOutsourcingInvoice,
}: PayableListProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <AnimatedSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search outsourcing payables..."
        />
        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all cursor-pointer select-none active:scale-[0.95] tracking-wide uppercase whitespace-nowrap ${
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

      <div className="space-y-3.5">
        {filteredInvoices.map((invoice) => {
          const balanceDue = getBalanceDue(invoice);
          const paymentState = getOutsourcingPaymentState(invoice);
          const activeInvoiceCurrency = invoice.currency || currency;
          const totalAmount = getOutsourcingInvoiceTotal(invoice);

          return (
            <div
              key={invoice.id}
              onClick={() => openShareModal(invoice)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openShareModal(invoice);
                }
              }}
              role="button"
              tabIndex={0}
              className="bg-card text-card-foreground w-full text-left p-5 rounded-xl border border-card-border hover-row relative group overflow-hidden cursor-pointer"
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`size-10 rounded-xl overflow-hidden shrink-0 ring-1 ${
                  paymentState === "Paid" ? "ring-positive/30" : "ring-foreground/10"
                } border border-background shadow-xs flex items-center justify-center font-bold text-xs bg-accent/10 text-accent`}>
                  {invoice.avatar ? (
                    <img className="w-full h-full object-cover rounded-xl" alt={invoice.vendor} src={invoice.avatar} />
                  ) : (
                    (invoice.vendor || "V")[0].toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[14px] text-foreground group-hover:text-accent transition-colors truncate">{invoice.vendor}</h3>
                  <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                    <span className="font-semibold">{invoice.id}</span>
                    <span className="w-1 h-1 rounded-full bg-foreground/15" />
                    <span className="font-medium">{invoice.date}</span>
                  </p>
                </div>

                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase">Due Date</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">{invoice.dueDate || "No due date"}</p>
                </div>

                <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg tracking-wide uppercase shrink-0 ${
                  paymentState === "Paid" ? "bg-positive/10 text-positive border border-positive/20" : "bg-foreground/[0.06] text-foreground/60 border border-foreground/[0.03]"
                }`}>
                  {paymentState}
                </span>

                <div className="hidden sm:flex items-center gap-1 shrink-0 bg-background/50 backdrop-blur-xs border border-card-border p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }}
                    className="size-7 flex items-center justify-center border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground rounded-lg transition-all duration-200 active:scale-95"
                    title="Edit"
                  >
                    <PenIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); openShareModal(invoice); }}
                    className="size-7 flex items-center justify-center border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground rounded-lg transition-all duration-200 active:scale-95"
                    title="Send"
                  >
                    <SendIcon size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); handleExportOutsourcingInvoice(invoice); }}
                    className="size-7 flex items-center justify-center border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground rounded-lg transition-all duration-200 active:scale-95"
                    title="Download"
                  >
                    <DownloadIcon size={12} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 sm:hidden pt-2 border-t border-card-border/20 text-xs">
                <p className="font-bold text-foreground">Total: <span className="font-display font-semibold">{formatCurrency(totalAmount, activeInvoiceCurrency)}</span></p>
                <p className="font-semibold text-muted">Due: <span className="text-negative">{formatCurrency(balanceDue, activeInvoiceCurrency)}</span></p>
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="text-center py-20 bg-card/40 border border-card-border border-dashed rounded-xl">
            <FolderOpen className="mx-auto size-10 text-foreground/15 mb-3" />
            <AnimatedText as="p" text="No outsourcing payables found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
      </div>
    </div>
  );
}

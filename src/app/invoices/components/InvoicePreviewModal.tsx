"use client";

import * as React from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PaymentSummary } from "@/components/payment-tracking";
import {
  formatCurrency,
  getInvoiceTotal,
  getPaymentState,
  type Invoice,
  type UserProfile,
} from "@/data/invoices";

interface InvoicePreviewModalProps {
  selectedInvoice: Invoice;
  activeProfile: UserProfile | null;
  currency: string;
  closeModal: () => void;
  isSimulatingStripe: boolean;
  stripeStep: string;
  webhookLogs: string[];
  emailSendingStatus: "idle" | "generating" | "attaching" | "sending" | "sent";
  simulateStripeCheckout: () => void;
  simulateEmailReminder: () => void;
}

export function InvoicePreviewModal({
  selectedInvoice,
  activeProfile,
  currency,
  closeModal,
  isSimulatingStripe,
  stripeStep,
  webhookLogs,
  emailSendingStatus,
  simulateStripeCheckout,
  simulateEmailReminder,
}: InvoicePreviewModalProps) {
  const modalTitle = selectedInvoice.id;
  const activeInvoiceCurrency = selectedInvoice.currency || currency;

  return (
    <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-6">
        <AnimatedText
          as="h2"
          text={modalTitle}
          effect="fade-through"
          className="text-xl font-semibold text-foreground font-display"
          replayKey={modalTitle}
        />
        <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth">
          <span className="material-symbols-outlined text-[18px] text-muted">close</span>
        </button>
      </div>
      <div className="surface-card p-5 overflow-hidden">
        {(() => {
          const subtotal = (selectedInvoice.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
          const discountVal = selectedInvoice.discount || 0;
          const discountAmount = selectedInvoice.discountType === "percent" ? (subtotal * discountVal) / 100 : discountVal;
          const total = Math.max(0, subtotal - discountAmount);
          const paymentState = getPaymentState(selectedInvoice);

          const renderItemsTable = (headerClass = "bg-foreground/[0.04]", rowClass = "border-t border-card-border") => (
            <div className="overflow-hidden rounded-xl border border-card-border">
              <div className={`grid grid-cols-[1fr_70px_110px] gap-3 px-4 py-2 text-[10px] font-semibold text-muted tracking-widest uppercase ${headerClass}`}>
                <span>Work</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Amount</span>
              </div>
              {(selectedInvoice.items || []).map((item) => (
                <div key={item.id} className={`grid grid-cols-[1fr_70px_110px] gap-3 px-4 py-3 text-[13px] ${rowClass}`}>
                  <span className="font-medium text-foreground">{item.description}</span>
                  <span className="text-right text-muted"><AnimatedNumber value={item.quantity} /></span>
                  <span className="text-right font-semibold text-foreground"><AnimatedNumber value={formatCurrency(item.quantity * item.price, activeInvoiceCurrency)} /></span>
                </div>
              ))}
              {discountVal > 0 && (
                <>
                  <div className="flex items-center justify-between border-t border-card-border px-4 py-2 text-[13px]">
                    <span className="text-[12px] text-muted">Subtotal</span>
                    <span className="font-medium text-foreground">{formatCurrency(subtotal, activeInvoiceCurrency)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 text-[13px]">
                    <span className="text-[12px] text-muted">
                      Discount {selectedInvoice.discountType === "percent" ? `(${discountVal}%)` : ""}
                    </span>
                    <span className="font-medium text-accent">-{formatCurrency(discountAmount, activeInvoiceCurrency)}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between border-t border-card-border px-4 py-4">
                <span className="text-[12px] font-semibold text-muted tracking-wider uppercase">Total</span>
                <span className="text-2xl font-semibold text-foreground font-display">
                  {formatCurrency(total, activeInvoiceCurrency)}
                </span>
              </div>
            </div>
          );

          const templateId = selectedInvoice.templateId || "classic";

          if (templateId === "minimal") {
            return (
              <div className="space-y-6 text-foreground font-sans">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-card-border/50 pb-5">
                  <div className="space-y-1">
                    <h3 className="text-xl font-light tracking-tight text-foreground">{activeProfile?.businessName || activeProfile?.name || "BillCraft"}</h3>
                    <p className="text-[11px] text-muted">{activeProfile?.profession || "Consultant"}</p>
                    {activeProfile?.email && <p className="text-[10px] text-muted/80">{activeProfile.email}</p>}
                  </div>
                  <div className="text-left sm:text-right space-y-1">
                    <p className="text-[10px] font-bold text-muted tracking-[0.2em] uppercase">Invoice</p>
                    <p className="text-lg font-mono text-foreground font-semibold">{selectedInvoice.id}</p>
                    <p className="text-[11px] text-muted">Date: {selectedInvoice.date}</p>
                    {selectedInvoice.dueDate && <p className="text-[11px] text-muted">Due: {selectedInvoice.dueDate}</p>}
                    <p className="text-[11px] text-muted">Status: {paymentState}</p>
                  </div>
                </div>

                {/* Bill To */}
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-muted tracking-widest uppercase">Billed To</p>
                  <p className="text-[13px] font-medium text-foreground">{selectedInvoice.client}</p>
                  {selectedInvoice.email && <p className="text-[11px] text-muted">{selectedInvoice.email}</p>}
                  {selectedInvoice.phone && <p className="text-[11px] text-muted">{selectedInvoice.phone}</p>}
                  {selectedInvoice.address && <p className="text-[11px] text-muted mt-1 whitespace-pre-line">{selectedInvoice.address}</p>}
                </div>

                {/* Items Table - Minimal borderless-style */}
                {renderItemsTable("bg-transparent border-b border-card-border/50", "border-b border-card-border/30")}

                {activeProfile?.signature && (
                  <div className="mt-6 flex justify-end">
                    <div className="text-right">
                      <img className="ml-auto h-12 max-w-40 object-contain mix-blend-multiply dark:mix-blend-normal opacity-80" alt="Signature" src={activeProfile.signature} />
                      <p className="mt-1 text-[9px] font-bold text-muted tracking-wider uppercase">Authorized Signature</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (templateId === "bold") {
            return (
              <div className="space-y-6">
                {/* Bold Header Banner */}
                <div className="bg-foreground text-background p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold tracking-[0.25em] uppercase text-background/60">Invoice</h3>
                    <p className="text-3xl font-extrabold font-display tracking-tight mt-1">{selectedInvoice.id}</p>
                  </div>
                  <div className="text-[11px] text-background/80 space-y-1 font-mono">
                    <p><span className="opacity-60">DATE:</span> {selectedInvoice.date}</p>
                    {selectedInvoice.dueDate && <p><span className="opacity-60">DUE DATE:</span> {selectedInvoice.dueDate}</p>}
                    <p><span className="opacity-60">STATUS:</span> {paymentState.toUpperCase()}</p>
                  </div>
                </div>

                {/* Sender & Client Side-by-Side Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-foreground/[0.02] border-l-4 border-foreground p-4 rounded-r-xl">
                    <p className="text-[9px] font-extrabold text-muted tracking-widest uppercase mb-1.5">From</p>
                    <p className="text-[14px] font-bold text-foreground">{activeProfile?.businessName || activeProfile?.name || "BillCraft"}</p>
                    <p className="text-[12px] text-muted">{activeProfile?.profession || "Professional Services"}</p>
                    {activeProfile?.email && <p className="text-[11px] text-muted">{activeProfile.email}</p>}
                  </div>
                  <div className="bg-foreground/[0.02] border-l-4 border-muted p-4 rounded-r-xl">
                    <p className="text-[9px] font-extrabold text-muted tracking-widest uppercase mb-1.5 font-mono">Billed To</p>
                    <p className="text-[14px] font-bold text-foreground">{selectedInvoice.client}</p>
                    {selectedInvoice.email && <p className="text-[11px] text-muted">{selectedInvoice.email}</p>}
                    {selectedInvoice.address && <p className="text-[11px] text-muted mt-1 whitespace-pre-line">{selectedInvoice.address}</p>}
                  </div>
                </div>

                {/* Items Table - Bold Contrast Header */}
                {renderItemsTable("bg-foreground text-background font-bold", "border-t border-card-border/80")}

                {activeProfile?.signature && (
                  <div className="mt-6 flex justify-end">
                    <div className="text-right bg-foreground/[0.02] p-4 rounded-xl border border-card-border">
                      <img className="ml-auto h-12 max-w-40 object-contain" alt="Signature" src={activeProfile.signature} />
                      <p className="mt-1.5 text-[9px] font-extrabold text-foreground tracking-widest uppercase">Signature</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (templateId === "branded") {
            return (
              <div className="space-y-6 relative">
                {/* Brand Top Highlight Bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-accent rounded-t-xl" style={{ margin: "-20px -20px 0 -20px" }} />
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-card-border pb-5 mt-2">
                  <div className="flex items-center gap-3">
                    {activeProfile?.profilePic ? (
                      <img className="size-12 rounded-xl object-cover ring-2 ring-accent/25" alt={activeProfile.name} src={activeProfile.profilePic} />
                    ) : (
                      <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                        <span className="material-symbols-outlined text-[20px] text-accent">person</span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{activeProfile?.businessName || activeProfile?.name || "BillCraft"}</h3>
                      <p className="text-[11px] font-medium text-accent uppercase tracking-wider">{activeProfile?.profession || "Developer"}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-accent tracking-widest uppercase">Branded Invoice</p>
                    <p className="text-2xl font-bold text-foreground font-display">{selectedInvoice.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-accent/15 bg-accent/[0.01] p-4 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-accent" />
                    <p className="text-[9px] font-bold text-accent tracking-widest uppercase mb-1.5">Client Details</p>
                    <p className="text-[14px] font-bold text-foreground">{selectedInvoice.client}</p>
                    {selectedInvoice.email && <p className="text-[12px] text-muted">{selectedInvoice.email}</p>}
                    {selectedInvoice.address && <p className="text-[12px] text-muted whitespace-pre-line mt-1">{selectedInvoice.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-card-border p-3 rounded-xl bg-card">
                      <p className="text-[9px] font-bold text-muted tracking-widest uppercase mb-1">Date</p>
                      <p className="text-[12px] font-bold text-foreground">{selectedInvoice.date}</p>
                    </div>
                    <div className="border border-card-border p-3 rounded-xl bg-card">
                      <p className="text-[9px] font-bold text-muted tracking-widest uppercase mb-1">Due</p>
                      <p className="text-[12px] font-bold text-foreground">{selectedInvoice.dueDate || "Upon Receipt"}</p>
                    </div>
                    <div className="border border-card-border p-3 rounded-xl bg-card col-span-2 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-muted tracking-widest uppercase">Payment Status</span>
                      <span className="text-[12px] font-bold text-accent">{paymentState}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table - Branded Header */}
                {renderItemsTable("bg-accent/10 text-accent font-bold", "border-t border-card-border/40")}

                {activeProfile?.signature && (
                  <div className="mt-6 flex justify-end">
                    <div className="text-right">
                      <img className="ml-auto h-12 max-w-40 object-contain ring-1 ring-accent/10 rounded" alt="Signature" src={activeProfile.signature} />
                      <p className="mt-1 text-[9px] font-bold text-accent tracking-widest uppercase">Signature</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          if (templateId === "detailed") {
            return (
              <div className="space-y-6 text-foreground font-sans">
                {/* Detailed Grid Header */}
                <div className="grid grid-cols-2 border border-card-border rounded-xl divide-x divide-card-border bg-foreground/[0.01]">
                  <div className="p-4 space-y-2">
                    <p className="text-[9px] font-extrabold text-muted tracking-wider uppercase">Service Provider</p>
                    <div className="space-y-0.5">
                      <p className="text-[14px] font-bold text-foreground">{activeProfile?.businessName || activeProfile?.name || "BillCraft"}</p>
                      <p className="text-[11px] text-muted">{activeProfile?.profession || "Contractor"}</p>
                      {activeProfile?.email && <p className="text-[11px] text-muted">{activeProfile.email}</p>}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-[9px] font-extrabold text-muted tracking-wider uppercase">Payable Metadata</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                      <span className="text-muted">Invoice Ref:</span>
                      <span className="font-mono font-bold text-foreground">{selectedInvoice.id}</span>
                      <span className="text-muted">Issue Date:</span>
                      <span className="text-foreground">{selectedInvoice.date}</span>
                      <span className="text-muted">Due Date:</span>
                      <span className="text-foreground">{selectedInvoice.dueDate || "N/A"}</span>
                      <span className="text-muted">Status:</span>
                      <span className="text-foreground font-semibold">{paymentState}</span>
                    </div>
                  </div>
                </div>

                {/* Billed To Box */}
                <div className="border border-card-border rounded-xl p-4 space-y-2 bg-foreground/[0.01]">
                  <p className="text-[9px] font-extrabold text-muted tracking-wider uppercase">Invoice Recipient (Bill To)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
                    <div>
                      <p className="font-bold text-[13px] text-foreground">{selectedInvoice.client}</p>
                      {selectedInvoice.company && <p className="text-muted">{selectedInvoice.company}</p>}
                    </div>
                    <div className="text-left sm:text-right space-y-0.5 text-muted">
                      {selectedInvoice.email && <p>{selectedInvoice.email}</p>}
                      {selectedInvoice.phone && <p>{selectedInvoice.phone}</p>}
                      {selectedInvoice.address && <p className="whitespace-pre-line mt-1">{selectedInvoice.address}</p>}
                    </div>
                  </div>
                </div>

                {/* Items Table - Detailed Grid Cell Split */}
                <div className="border border-card-border rounded-xl overflow-hidden divide-y divide-card-border">
                  <div className="grid grid-cols-[1fr_80px_120px] divide-x divide-card-border bg-foreground/[0.02] px-4 py-2 text-[10px] font-extrabold text-muted tracking-wider uppercase">
                    <span>Item Description</span>
                    <span className="text-center">Quantity</span>
                    <span className="text-right">Line Total</span>
                  </div>
                  {(selectedInvoice.items || []).map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_80px_120px] divide-x divide-card-border px-4 py-3 text-[12.5px] items-center">
                      <span className="font-semibold text-foreground pr-2">{item.description}</span>
                      <span className="text-center text-muted font-mono">{item.quantity}</span>
                      <span className="text-right font-mono font-bold text-foreground">{formatCurrency(item.quantity * item.price, activeInvoiceCurrency)}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-foreground/[0.01]">
                    <div className="max-w-xs ml-auto space-y-2 text-[12px]">
                      {discountVal > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted">Subtotal:</span>
                            <span className="font-mono">{formatCurrency(subtotal, activeInvoiceCurrency)}</span>
                          </div>
                          <div className="flex justify-between text-accent font-semibold">
                            <span>Discount {selectedInvoice.discountType === "percent" ? `(${discountVal}%)` : ""}:</span>
                            <span className="font-mono">-{formatCurrency(discountAmount, activeInvoiceCurrency)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between border-t border-card-border pt-2 text-[14px] font-bold text-foreground">
                        <span>Total Due:</span>
                        <span className="font-mono font-display text-base">{formatCurrency(total, activeInvoiceCurrency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {activeProfile?.signature && (
                  <div className="mt-6 flex justify-end">
                    <div className="text-right border border-card-border p-3 rounded-xl bg-foreground/[0.01] divide-y divide-card-border">
                      <img className="ml-auto h-12 max-w-40 object-contain pb-1.5" alt="Signature" src={activeProfile.signature} />
                      <p className="pt-1.5 text-[9px] font-extrabold text-muted tracking-wider uppercase">Authorized Representative</p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Fallback / Classic
          return (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-card-border pb-5">
                <div className="flex items-center gap-3">
                  {activeProfile?.profilePic ? (
                    <img className="size-12 rounded-xl object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                  ) : (
                    <div className="size-12 rounded-xl bg-foreground/[0.04] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px] text-muted">person</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{activeProfile?.businessName || activeProfile?.name || "BillCraft"}</h3>
                    <p className="text-[12px] text-muted">{activeProfile?.profession || "Invoice profile"}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-semibold text-muted tracking-wider uppercase">{selectedInvoice.templateName || "Classic Invoice"}</p>
                  <p className="text-2xl font-semibold text-foreground font-display">{selectedInvoice.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-2">Bill To</p>
                  <div className="flex items-start gap-3">
                    <img className="size-10 rounded-xl object-cover border border-card-border" alt={selectedInvoice.client} src={selectedInvoice.avatar} />
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">{selectedInvoice.client}</p>
                      <p className="text-[12px] text-muted">{selectedInvoice.email || "No email added"}</p>
                      <p className="text-[12px] text-muted">{selectedInvoice.phone || "No phone added"}</p>
                      {selectedInvoice.whatsapp && <p className="text-[12px] text-muted">WhatsApp: {selectedInvoice.whatsapp}</p>}
                      {selectedInvoice.address && <p className="text-[12px] text-muted whitespace-pre-line mt-1">{selectedInvoice.address}</p>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="surface-card p-3.5">
                    <p className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-1.5">Date</p>
                    <p className="text-[13px] font-semibold text-foreground">{selectedInvoice.date}</p>
                  </div>
                  <div className="surface-card p-3.5">
                    <p className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-1.5">Status</p>
                    <p className="text-[13px] font-semibold text-foreground">{paymentState}</p>
                  </div>
                  <div className="surface-card p-3.5 col-span-2">
                    <p className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-1.5">Work Status</p>
                    <p className="text-[13px] font-semibold text-foreground">{selectedInvoice.workflowStatus || "Draft"}</p>
                  </div>
                </div>
              </div>

              {renderItemsTable()}

              {activeProfile?.signature && (
                <div className="mt-5 flex justify-end">
                  <div className="text-right">
                    <img className="ml-auto h-14 max-w-44 object-contain" alt="Signature" src={activeProfile.signature} />
                    <p className="mt-1 text-[10px] font-semibold text-muted tracking-widest uppercase">Signature</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <PaymentSummary currency={currency} record={selectedInvoice} />

      {/* Glassmorphic Simulated Integrations & Webhooks Panel */}
      <div className="surface-card p-5 border border-dashed border-accent/[0.25] bg-accent/[0.01] rounded-2xl relative overflow-hidden backdrop-blur-md mt-5">
        <div className="absolute top-0 right-0 p-3 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">Live Sandbox Simulator</span>
        </div>

        <h4 className="text-[13px] font-bold text-foreground tracking-wide uppercase flex items-center gap-1.5 mb-1.5">
          <span className="material-symbols-outlined text-[16px] text-accent">sync_alt</span>
          Integration Simulations
        </h4>
        <p className="text-[11px] text-muted mb-4">
          Trigger sandbox simulations to test custom client flows, Stripe checkouts, email reminder automations, and live webhook events.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Simulator Action Controls */}
          <div className="space-y-3">
            {/* Stripe simulation */}
            <div className="surface-card p-3.5 bg-foreground/[0.01] border border-card-border rounded-xl flex flex-col justify-between min-h-[110px]">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-[#635bff]">payments</span>
                  <h5 className="text-[12px] font-semibold text-foreground">Stripe Payment Gateway</h5>
                </div>
                <p className="text-[11px] text-muted">
                  {selectedInvoice.status === "Paid" 
                    ? "This invoice is already fully paid." 
                    : selectedInvoice.paymentLink
                      ? `Configured with link: ${selectedInvoice.paymentLink.slice(0, 30)}...`
                      : "Simulate payment checkout matching invoice balance."}
                </p>
              </div>
              
              <div className="mt-3">
                {selectedInvoice.status !== "Paid" ? (
                  <button
                    type="button"
                    onClick={simulateStripeCheckout}
                    disabled={isSimulatingStripe}
                    className="btn-primary w-full text-[11px] min-h-8 py-1.5 bg-[#635bff] hover:bg-[#544ec9] border-0 text-white disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(99,91,255,0.2)]"
                  >
                    {isSimulatingStripe ? (
                      <>
                        <span className="animate-spin size-3.5 border-2 border-white/30 border-t-white rounded-full"></span>
                        {stripeStep}
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                        Pay via Stripe Simulation
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-500/25">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Paid via Stripe Simulator
                  </div>
                )}
              </div>
            </div>

            {/* Email simulation */}
            <div className="surface-card p-3.5 bg-foreground/[0.01] border border-card-border rounded-xl flex flex-col justify-between min-h-[110px]">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-sky-500">mail</span>
                  <h5 className="text-[12px] font-semibold text-foreground">Client Reminder dispatch</h5>
                </div>
                <p className="text-[11px] text-muted">
                  Compile PDF attachment and dispatch automated remind notification to {selectedInvoice.email || "client email"}.
                </p>
              </div>
              
              <div className="mt-3">
                <button
                  type="button"
                  onClick={simulateEmailReminder}
                  disabled={emailSendingStatus !== "idle"}
                  className="btn-secondary w-full text-[11px] min-h-8 py-1.5 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {emailSendingStatus === "idle" && (
                    <>
                      <span className="material-symbols-outlined text-[14px]">send</span>
                      Send Payment Reminder
                    </>
                  )}
                  {emailSendingStatus === "generating" && (
                    <>
                      <span className="animate-spin size-3.5 border-2 border-current/30 border-t-current rounded-full"></span>
                      Compiling Email template...
                    </>
                  )}
                  {emailSendingStatus === "attaching" && (
                    <>
                      <span className="animate-spin size-3.5 border-2 border-current/30 border-t-current rounded-full"></span>
                      Generating PDF copy...
                    </>
                  )}
                  {emailSendingStatus === "sending" && (
                    <>
                      <span className="animate-spin size-3.5 border-2 border-current/30 border-t-current rounded-full"></span>
                      Dispatching to client...
                    </>
                  )}
                  {emailSendingStatus === "sent" && (
                    <>
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Sent Successfully!
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Webhook log stream */}
          <div className="bg-foreground/[0.03] border border-card-border rounded-xl p-3 flex flex-col h-[236px]">
            <span className="text-[9px] font-bold text-muted tracking-wider uppercase mb-2">Simulated Live Log Stream</span>
            <div className="flex-1 overflow-y-auto font-mono text-[9.5px] leading-relaxed text-muted space-y-1.5 custom-scrollbar select-text selection:bg-accent/20">
              {webhookLogs.map((log, index) => (
                <div key={index} className="border-b border-card-border/10 pb-1 last:border-0">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

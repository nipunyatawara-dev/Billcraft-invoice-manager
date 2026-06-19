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
      <div className="surface-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-card-border pb-5 mb-5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
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
              <p className="text-[13px] font-semibold text-foreground">{getPaymentState(selectedInvoice)}</p>
            </div>
            <div className="surface-card p-3.5 col-span-2">
              <p className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-1.5">Work Status</p>
              <p className="text-[13px] font-semibold text-foreground">{selectedInvoice.workflowStatus || "Draft"}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-card-border">
          <div className="grid grid-cols-[1fr_70px_110px] gap-3 bg-foreground/[0.04] px-4 py-2 text-[10px] font-semibold text-muted tracking-widest uppercase">
            <span>Work</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Amount</span>
          </div>
          {(selectedInvoice.items || []).map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_70px_110px] gap-3 border-t border-card-border px-4 py-3 text-[13px]">
              <span className="font-medium text-foreground">{item.description}</span>
              <span className="text-right text-muted"><AnimatedNumber value={item.quantity} /></span>
              <span className="text-right font-semibold text-foreground"><AnimatedNumber value={formatCurrency(item.quantity * item.price, activeInvoiceCurrency)} /></span>
            </div>
          ))}
          {(() => {
            const invoiceViewSubtotal = (selectedInvoice.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
            const invoiceViewDiscount = selectedInvoice.discount || 0;
            const invoiceViewTotal = getInvoiceTotal(selectedInvoice);
            return (
              <>
                {invoiceViewDiscount > 0 && (
                  <>
                    <div className="flex items-center justify-between border-t border-card-border px-4 py-2 text-[13px]">
                      <span className="text-[12px] text-muted">Subtotal</span>
                      <span className="font-medium text-foreground">{formatCurrency(invoiceViewSubtotal, activeInvoiceCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 text-[13px]">
                      <span className="text-[12px] text-muted">Discount</span>
                      <span className="font-medium text-accent">-{formatCurrency(invoiceViewDiscount, activeInvoiceCurrency)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between border-t border-card-border px-4 py-4">
                  <span className="text-[12px] font-semibold text-muted tracking-wider uppercase">Total</span>
                  <span className="text-2xl font-semibold text-foreground font-display">
                    {formatCurrency(invoiceViewTotal, activeInvoiceCurrency)}
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {activeProfile?.signature && (
          <div className="mt-5 flex justify-end">
            <div className="text-right">
              <img className="ml-auto h-14 max-w-44 object-contain" alt="Signature" src={activeProfile.signature} />
              <p className="mt-1 text-[10px] font-semibold text-muted tracking-widest uppercase">Signature</p>
            </div>
          </div>
        )}
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

"use client";

import { AnimatedNumber } from "@/components/animated-number";
import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getPaymentState,
  type PaymentAttachment,
  type PaymentRecord,
  type PaymentTrackable,
} from "@/data/invoices";
import { ChangeEvent } from "react";

const PAYMENT_METHODS = ["Bank transfer", "Card", "Cash", "PayPal", "Wise", "Check", "Other"] as const;

export function createPaymentRecord(amount = 0): PaymentRecord {
  return {
    id: `payment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    amount,
    paidAt: new Date().toISOString().slice(0, 10),
    method: PAYMENT_METHODS[0],
    notes: "",
    receiptAttachments: [],
  };
}

function createAttachment(file: File, url: string): PaymentAttachment {
  return {
    id: `receipt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    url,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read this receipt."));
      }
    };
    reader.onerror = () => reject(new Error("Unable to read this receipt."));
    reader.readAsDataURL(file);
  });
}

function attachmentLabel(attachment: PaymentAttachment) {
  if (attachment.size <= 0) {
    return attachment.name;
  }

  const sizeInKb = Math.max(Math.round(attachment.size / 1024), 1);
  return `${attachment.name} (${sizeInKb} KB)`;
}

function paymentStateClass(state: ReturnType<typeof getPaymentState>) {
  if (state === "Paid") {
    return "bg-positive/15 text-positive";
  }

  if (state === "Overdue" || state === "Partially Paid") {
    return "bg-accent/15 text-accent";
  }

  return "bg-foreground/[0.06] text-foreground/60";
}

type PaymentTrackingFormProps = {
  currency: string;
  payments: PaymentRecord[];
  paymentNotes: string;
  title?: string;
  total: number;
  onPaymentNotesChange: (notes: string) => void;
  onPaymentsChange: (payments: PaymentRecord[]) => void;
};

export function PaymentTrackingForm({
  currency,
  onPaymentNotesChange,
  onPaymentsChange,
  paymentNotes,
  payments,
  title = "Payment Tracking",
  total,
}: PaymentTrackingFormProps) {
  const amountPaid = payments.reduce((sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0), 0);
  const balanceDue = Math.max(total - amountPaid, 0);

  function updatePayment(index: number, updates: Partial<PaymentRecord>) {
    onPaymentsChange(payments.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...updates } : payment));
  }

  async function handleReceipts(index: number, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
      return;
    }

    const attachments = await Promise.all(files.map(async (file) => createAttachment(file, await readFileAsDataUrl(file))));
    const currentPayment = payments[index];

    updatePayment(index, {
      receiptAttachments: [...(currentPayment.receiptAttachments || []), ...attachments],
    });
    event.target.value = "";
  }

  function removeReceipt(paymentIndex: number, attachmentId: string) {
    const payment = payments[paymentIndex];
    updatePayment(paymentIndex, {
      receiptAttachments: (payment.receiptAttachments || []).filter((attachment) => attachment.id !== attachmentId),
    });
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-card-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-0.5 text-[11px] text-muted">Track partial payments, method, receipt files, and notes.</p>
        </div>
        <button type="button" onClick={() => onPaymentsChange([...payments, createPaymentRecord(balanceDue)])} className="btn-secondary min-h-8 px-3 py-1.5 text-[11px]">
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Payment
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 border-b border-card-border bg-foreground/[0.03] p-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Total</p>
          <p className="font-display text-lg font-semibold text-foreground"><AnimatedNumber value={formatCurrency(total, currency)} /></p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Amount Paid</p>
          <p className="font-display text-lg font-semibold text-positive"><AnimatedNumber value={formatCurrency(Math.min(amountPaid, total), currency)} /></p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Balance</p>
          <p className="font-display text-lg font-semibold text-foreground"><AnimatedNumber value={formatCurrency(balanceDue, currency)} /></p>
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="divide-y divide-card-border">
          {payments.map((payment, index) => (
            <div key={payment.id} className="space-y-3 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_150px_1fr_40px]">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor={`payment-amount-${payment.id}`}>Amount</label>
                  <input
                    id={`payment-amount-${payment.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={payment.amount}
                    onChange={(event) => updatePayment(index, { amount: Number(event.target.value) })}
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor={`payment-date-${payment.id}`}>Paid At</label>
                  <input
                    id={`payment-date-${payment.id}`}
                    type="date"
                    value={payment.paidAt}
                    onChange={(event) => updatePayment(index, { paidAt: event.target.value })}
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor={`payment-method-${payment.id}`}>Method</label>
                  <select
                    id={`payment-method-${payment.id}`}
                    value={payment.method}
                    onChange={(event) => updatePayment(index, { method: event.target.value })}
                    className="field-control px-3 py-2"
                  >
                    {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </div>
                <div className="flex md:items-end">
                  <button type="button" onClick={() => onPaymentsChange(payments.filter((_, paymentIndex) => paymentIndex !== index))} className="size-9 rounded-full text-muted transition-smooth hover:bg-accent/10 hover:text-accent" aria-label="Remove payment">
                    <span className="material-symbols-outlined text-[17px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor={`payment-notes-${payment.id}`}>Payment Note</label>
                  <input
                    id={`payment-notes-${payment.id}`}
                    value={payment.notes || ""}
                    onChange={(event) => updatePayment(index, { notes: event.target.value })}
                    placeholder="Reference number, split, or payer note"
                    className="field-control px-3 py-2"
                  />
                </div>
                <label className="btn-secondary min-h-9 cursor-pointer px-3 py-2 text-[11px]">
                  <span className="material-symbols-outlined text-[15px]">attach_file</span>
                  Attach Receipt
                  <input className="sr-only" type="file" accept="image/*,application/pdf" multiple onChange={(event) => void handleReceipts(index, event)} />
                </label>
              </div>

              {(payment.receiptAttachments || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(payment.receiptAttachments || []).map((attachment) => (
                    <span key={attachment.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-card-border px-2 py-1 text-[10px] font-semibold text-muted">
                      <span className="material-symbols-outlined text-[13px]">description</span>
                      <span className="truncate">{attachmentLabel(attachment)}</span>
                      <button type="button" onClick={() => removeReceipt(index, attachment.id)} className="text-foreground/30 transition-smooth hover:text-accent" aria-label={`Remove ${attachment.name}`}>
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center">
          <span className="material-symbols-outlined mb-2 block text-[32px] text-foreground/10">payments</span>
          <p className="text-[12px] font-medium text-muted">No payments recorded yet.</p>
        </div>
      )}

      <div className="border-t border-card-border p-4">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="payment-notes">Overall Payment Notes</label>
        <textarea
          id="payment-notes"
          value={paymentNotes}
          onChange={(event) => onPaymentNotesChange(event.target.value)}
          placeholder="Terms, receipt references, follow-up notes, or accounting context"
          className="field-control mt-1.5 min-h-20 resize-none px-3 py-2"
        />
      </div>
    </div>
  );
}

type PaymentSummaryProps = {
  currency: string;
  record: PaymentTrackable;
  title?: string;
};

export function PaymentSummary({ currency, record, title = "Payment Tracking" }: PaymentSummaryProps) {
  const amountPaid = getAmountPaid(record);
  const balanceDue = getBalanceDue(record);
  const paymentState = getPaymentState(record);
  const payments = record.payments || [];
  const topLevelAttachments = record.receiptAttachments || [];
  const hasAttachments = topLevelAttachments.length > 0 || payments.some((payment) => (payment.receiptAttachments || []).length > 0);

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-card-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
          <p className="mt-0.5 text-[11px] text-muted">{payments.length > 0 ? `${payments.length} payment record${payments.length === 1 ? "" : "s"} saved` : "No payment records yet"}</p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${paymentStateClass(paymentState)}`}>
          {paymentState}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 border-b border-card-border bg-foreground/[0.03] p-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Amount Paid</p>
          <p className="font-display text-lg font-semibold text-positive"><AnimatedNumber value={formatCurrency(amountPaid, currency)} /></p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Balance Due</p>
          <p className="font-display text-lg font-semibold text-foreground"><AnimatedNumber value={formatCurrency(balanceDue, currency)} /></p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Latest Method</p>
          <p className="truncate text-[13px] font-semibold text-foreground">{record.paymentMethod || payments[0]?.method || "Not recorded"}</p>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="divide-y divide-card-border">
          {payments.map((payment) => (
            <div key={payment.id} className="p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-foreground"><AnimatedNumber value={formatCurrency(payment.amount, currency)} /></p>
                  <p className="text-[11px] text-muted">{payment.paidAt || "No date"} via {payment.method || "unknown method"}</p>
                  {payment.notes && <p className="mt-1 text-[11px] text-muted">{payment.notes}</p>}
                </div>
                {(payment.receiptAttachments || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {(payment.receiptAttachments || []).map((attachment) => (
                      <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-card-border px-2 py-1 text-[10px] font-semibold text-muted transition-smooth hover:text-accent">
                        <span className="material-symbols-outlined text-[13px]">description</span>
                        <span className="truncate">{attachment.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {record.paymentNotes && (
        <div className="border-t border-card-border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Notes</p>
          <p className="mt-1 whitespace-pre-line text-[12px] text-muted">{record.paymentNotes}</p>
        </div>
      )}

      {!hasAttachments && payments.length === 0 && !record.paymentNotes && (
        <div className="p-5 text-center text-[12px] font-medium text-muted">Payment details will appear here once recorded.</div>
      )}
    </div>
  );
}

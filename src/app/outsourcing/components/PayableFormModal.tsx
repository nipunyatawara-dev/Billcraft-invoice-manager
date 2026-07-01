"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { PaymentTrackingForm } from "@/components/payment-tracking";
import { PhoneInput } from "@/components/phone-input";
import {
  WorkspaceFormModal,
  WorkspaceTemplateDropdown,
} from "@/components/workspace-form-modal";
import {
  formatCurrency,
  type InvoiceItem,
  type InvoiceStatus,
  type PaymentAttachment,
  type PaymentRecord,
  type Vendor,
  CURRENCIES,
} from "@/data/invoices";
import {
  Calendar,
  ChevronDown,
  ImagePlus,
  List,
  Mail,
  Phone,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";

type VendorMode = "saved" | "new";
type SaveVendorMode = "regular" | "onetime";

export type PayableForm = {
  templateId: string;
  vendorMode: VendorMode;
  vendorId: string;
  vendor: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  avatar: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  paymentNotes: string;
  payments: PaymentRecord[];
  receiptAttachments: PaymentAttachment[];
  saveVendorMode: SaveVendorMode | null;
  currency: string;
  paypal: string;
  stripe: string;
};

interface PayableFormModalProps {
  modalMode: "create" | "edit";
  form: PayableForm;
  setForm: React.Dispatch<React.SetStateAction<PayableForm>>;
  vendors: Vendor[];
  currency: string;
  isSaving: boolean;
  needsVendorSaveChoice: boolean;
  TEMPLATES: readonly { id: string; name: string; description: string }[];
  selectedTemplate: { id: string; name: string; description: string };
  isTemplateDropdownOpen: boolean;
  setIsTemplateDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeModal: () => void;
  submitOutsourcingInvoice: (saveVendorMode?: SaveVendorMode) => void;
  setVendorMode: (mode: VendorMode) => void;
  handleVendorSelect: (vendorId: string) => void;
  handleVendorImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateItem: (index: number, updates: Partial<InvoiceItem>) => void;
  removeItem: (index: number) => void;
  invoiceTotal: number;
  createItem: (description?: string, quantity?: number, price?: number) => InvoiceItem;
  profilePhone?: string;
}

export function PayableFormModal({
  modalMode,
  form,
  setForm,
  vendors,
  currency,
  isSaving,
  needsVendorSaveChoice,
  TEMPLATES,
  selectedTemplate,
  isTemplateDropdownOpen,
  setIsTemplateDropdownOpen,
  closeModal,
  submitOutsourcingInvoice,
  setVendorMode,
  handleVendorSelect,
  handleVendorImageChange,
  updateItem,
  removeItem,
  invoiceTotal,
  createItem,
  profilePhone,
}: PayableFormModalProps) {
  const title = modalMode === "create" ? "New Payable" : "Edit Payable";
  const subtitle = modalMode === "edit" ? "Edit Session" : "Draft Workspace";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitOutsourcingInvoice();
  };

  const leftPanel = (
    <>
      <div className="surface-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
            <User className="size-3.5 text-muted/80" />
            Payee Identity
          </h3>
          <div className="flex gap-0.5 rounded-lg border border-card-border bg-foreground/[0.03] p-0.5 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setVendorMode("saved")}
              disabled={vendors.length === 0}
              className={`rounded-md px-3 py-1 text-[11px] font-bold transition-[background-color,border-color,color] duration-200 ease-out cursor-pointer ${
                form.vendorMode === "saved"
                  ? "bg-card text-foreground shadow-xs border border-card-border/50"
                  : "text-muted hover:text-foreground disabled:opacity-30"
              }`}
            >
              Saved
            </button>
            <button
              type="button"
              onClick={() => setVendorMode("new")}
              className={`rounded-md px-3 py-1 text-[11px] font-bold transition-[background-color,border-color,color] duration-200 ease-out cursor-pointer ${
                form.vendorMode === "new"
                  ? "bg-card text-foreground shadow-xs border border-card-border/50"
                  : "text-muted hover:text-foreground"
              }`}
            >
              New
            </button>
          </div>
        </div>

        {form.vendorMode === "saved" && vendors.length > 0 ? (
          <div className="space-y-3">
            <div className="relative">
              <select
                id="saved-vendor"
                required
                value={form.vendorId}
                onChange={(event) => handleVendorSelect(event.target.value)}
                className="field-control px-3 py-2 text-[13px] appearance-none pr-8 rounded-lg"
              >
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id} className="text-foreground bg-background">
                    {vendor.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-muted pointer-events-none absolute right-3 top-2.5" />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-card-border/50 bg-foreground/[0.01] p-4">
              {form.avatar ? (
                <img className="size-11 rounded-lg object-cover border border-card-border shrink-0 outline outline-1 -outline-offset-1 outline-foreground/10" alt={form.vendor} src={form.avatar} />
              ) : (
                <div className="size-11 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0 border border-card-border">
                  <User className="size-5 text-muted/70" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-[12px] space-y-0.5">
                <p className="font-bold text-foreground truncate text-[13px]">{form.vendor}</p>
                {form.company && <p className="text-muted font-medium truncate">{form.company}</p>}
                {form.email && (
                  <p className="text-muted truncate flex items-center gap-1.5">
                    <Mail className="size-3 text-muted/70" /> {form.email}
                  </p>
                )}
                {(form.phone || form.paypal) && (
                  <p className="text-muted truncate flex items-center gap-1.5">
                    <Phone className="size-3 text-muted/70" /> {form.phone || form.paypal}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="relative size-12 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08] flex items-center justify-center shrink-0 border border-card-border border-dashed cursor-pointer transition-[background-color,border-color] duration-200 ease-out">
                <input type="file" accept="image/*" onChange={handleVendorImageChange} className="sr-only" />
                {form.avatar ? (
                  <img className="size-full rounded-xl object-cover outline outline-1 -outline-offset-1 outline-foreground/10" alt="Vendor preview" src={form.avatar} />
                ) : (
                  <ImagePlus className="size-5 text-muted/70" />
                )}
              </label>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Payee Name *"
                  required
                  value={form.vendor}
                  onChange={(event) => setForm({ ...form, vendor: event.target.value })}
                  className="field-control px-3 py-2 text-[13px] rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={form.company}
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                  className="field-control px-3 py-2 text-[13px] rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="field-control px-3 py-2 text-[13px] rounded-lg"
              />
              <PhoneInput
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
                hintPhone={profilePhone || form.phone}
                inputClassName="text-[13px] rounded-lg"
                selectClassName="text-[12px] rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="PayPal Account"
                value={form.paypal}
                onChange={(event) => setForm({ ...form, paypal: event.target.value })}
                className="field-control px-3 py-2 text-[13px] rounded-lg"
              />
              <input
                type="text"
                placeholder="Stripe Link"
                value={form.stripe}
                onChange={(event) => setForm({ ...form, stripe: event.target.value })}
                className="field-control px-3 py-2 text-[13px] rounded-lg"
              />
            </div>
            <textarea
              placeholder="Billing address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              className="field-control min-h-16 px-3 py-2 text-[13px] resize-none rounded-lg"
            />
          </div>
        )}
      </div>

      <div className="surface-card p-4 space-y-4">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          <Calendar className="size-3.5 text-muted/80" />
          Terms & Currency
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-date">
              Invoice Date
            </label>
            <input
              id="outsourcing-date"
              type="date"
              required
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              className="field-control px-3 py-2 text-[13px] rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-due-date">
              Due Date
            </label>
            <input
              id="outsourcing-due-date"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              className="field-control px-3 py-2 text-[13px] rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-currency">
              Currency
            </label>
            <div className="relative">
              <select
                id="outsourcing-currency"
                value={form.currency}
                onChange={(event) => setForm({ ...form, currency: event.target.value })}
                className="field-control px-3 py-2 text-[13px] appearance-none pr-8 rounded-lg"
              >
                <option value="">Default ({currency})</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-muted pointer-events-none absolute right-3 top-2.5" />
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const rightPanel = (
    <>
      <div className="surface-card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-foreground/[0.01]">
          <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
            <List className="size-3.5 text-muted/80" />
            Payable Items
          </h3>
          <button
            type="button"
            onClick={() => setForm({ ...form, items: [...form.items, createItem()] })}
            className="text-accent hover:text-accent-hover hover:bg-accent/10 px-2.5 py-1 rounded-lg border border-accent/20 transition-all flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase active:scale-[0.97]"
          >
            <Plus className="size-3" />
            Add Item
          </button>
        </div>
        <div className="divide-y divide-card-border">
          {form.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_80px_110px_36px] gap-3 p-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor={`item-desc-${item.id}`}>
                  Description
                </label>
                <input
                  id={`item-desc-${item.id}`}
                  required
                  value={item.description}
                  onChange={(event) => updateItem(index, { description: event.target.value })}
                  placeholder="Work description..."
                  className="field-control px-3 py-2 text-[13px] rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor={`item-qty-${item.id}`}>
                  Qty
                </label>
                <input
                  id={`item-qty-${item.id}`}
                  type="number"
                  min="0"
                  step="1"
                  value={item.quantity}
                  onChange={(event) => {
                    const cleanVal = event.target.value.replace(/^0+(?=\d)/, "");
                    updateItem(index, { quantity: Number(cleanVal) });
                  }}
                  className="field-control px-3 py-2 text-[13px] rounded-lg text-center font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor={`item-price-${item.id}`}>
                  Price
                </label>
                <input
                  id={`item-price-${item.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(event) => {
                    const cleanVal = event.target.value.replace(/^0+(?=\d)/, "");
                    updateItem(index, { price: Number(cleanVal) });
                  }}
                  className="field-control px-3 py-2 text-[13px] rounded-lg text-right font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="size-9 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all active:scale-95"
                aria-label="Remove item"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-foreground/[0.02] border-t border-card-border">
          <span className="text-[11px] font-bold text-muted tracking-wider uppercase">Total Payable</span>
          <span className="text-lg font-bold text-foreground font-display font-mono tabular-nums">
            <AnimatedNumber value={formatCurrency(invoiceTotal, form.currency || currency)} />
          </span>
        </div>
      </div>

      <PaymentTrackingForm
        currency={currency}
        total={invoiceTotal}
        payments={form.payments}
        paymentNotes={form.paymentNotes}
        title="Payment Tracking"
        onPaymentsChange={(payments) => setForm((currentForm) => ({ ...currentForm, payments }))}
        onPaymentNotesChange={(paymentNotes) => setForm((currentForm) => ({ ...currentForm, paymentNotes }))}
      />

      {needsVendorSaveChoice && (
        <div className="surface-card p-4 space-y-3 border-accent/25 bg-accent/5">
          <p className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
            <Save className="size-4 text-accent" />
            Save vendor details?
          </p>
          <p className="text-[11px] text-muted leading-relaxed">
            Regular vendors are stored for reuse. One-time payees remain attached only to this payable.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void submitOutsourcingInvoice("regular")} className="btn-primary text-[11px] min-h-7 px-3 py-1 rounded-lg">
              Save Regular Vendor
            </button>
            <button type="button" onClick={() => void submitOutsourcingInvoice("onetime")} className="btn-secondary text-[11px] min-h-7 px-3 py-1 rounded-lg">
              One-Time Only
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <WorkspaceFormModal
      title={title}
      subtitle={subtitle}
      onClose={closeModal}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      maxWidth="6xl"
      headerExtra={
        <WorkspaceTemplateDropdown
          selectedName={selectedTemplate.name}
          isOpen={isTemplateDropdownOpen}
          onToggle={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
          onClose={() => setIsTemplateDropdownOpen(false)}
          options={TEMPLATES}
          onSelect={(id) => setForm({ ...form, templateId: id })}
        />
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      footerActions={{
        submitLabel: modalMode === "edit" ? "Save Changes" : "Create Payable",
      }}
    />
  );
}

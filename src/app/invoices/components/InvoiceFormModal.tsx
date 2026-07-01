"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { AnimatedText } from "@/components/animated-text";
import { PhoneInput } from "@/components/phone-input";
import { PaymentTrackingForm } from "@/components/payment-tracking";
import {
  formatCurrency,
  type Client,
  type InvoiceItem,
  type PaymentRecord,
  type PaymentAttachment,
  type CatalogItem,
  CURRENCIES,
} from "@/data/invoices";
import type { TodoTask } from "@/data/todos";
import {
  X,
  ChevronDown,
  User,
  Mail,
  Phone,
  ImagePlus,
  Calendar,
  Link2,
  CheckSquare,
  Plus,
  List,
  Trash2,
  Package,
} from "lucide-react";

type ModalMode = "create" | "edit" | "view" | null;
type ClientMode = "saved" | "new";
type SaveClientMode = "regular" | "onetime";
type InvoiceStatus = "Paid" | "Unpaid" | "Overdue";
type InvoiceWorkflowStatus = "Draft" | "Sent" | "Work Confirmed" | "Delivered";

interface InvoiceForm {
  templateId: string;
  clientMode: ClientMode;
  clientId: string;
  client: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
  address: string;
  deliveryLink: string;
  paymentLink?: string;
  avatar: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  workflowStatus: InvoiceWorkflowStatus;
  items: InvoiceItem[];
  paymentNotes: string;
  payments: PaymentRecord[];
  receiptAttachments: PaymentAttachment[];
  saveClientMode: SaveClientMode | null;
  currency?: string;
  discount?: number;
  discountType?: "flat" | "percent";
}

interface InvoiceFormModalProps {
  modalMode: ModalMode;
  form: InvoiceForm;
  setForm: React.Dispatch<React.SetStateAction<InvoiceForm>>;
  clientRecords: Client[];
  currency: string;
  isSaving: boolean;
  needsClientSaveChoice: boolean;
  importableTasks: TodoTask[];
  importedTaskIds: string[];
  TEMPLATES: readonly { id: string; name: string; description: string }[];
  selectedTemplate: { id: string; name: string; description: string };
  isTemplateDropdownOpen: boolean;
  setIsTemplateDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeModal: () => void;
  submitInvoice: (saveClientMode?: SaveClientMode) => void;
  setClientMode: (mode: ClientMode) => void;
  handleClientSelect: (clientId: string) => void;
  handleClientImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateItem: (index: number, updates: Partial<InvoiceItem>) => void;
  removeItem: (index: number) => void;
  importTask: (task: TodoTask) => void;
  importAllTasks: (tasks: TodoTask[]) => void;
  useClientDeliveryLocation: () => void;
  useProfileDeliveryLocation: () => void;
  invoiceSubtotal: number;
  invoiceTotal: number;
  createItem: (description?: string, quantity?: number, price?: number) => InvoiceItem;
  catalogItems: CatalogItem[];
  profilePhone?: string;
}

export function InvoiceFormModal({
  modalMode,
  form,
  setForm,
  clientRecords,
  currency,
  isSaving,
  needsClientSaveChoice,
  importableTasks,
  importedTaskIds,
  TEMPLATES,
  selectedTemplate,
  isTemplateDropdownOpen,
  setIsTemplateDropdownOpen,
  closeModal,
  submitInvoice,
  setClientMode,
  handleClientSelect,
  handleClientImageChange,
  updateItem,
  removeItem,
  importTask,
  importAllTasks,
  useClientDeliveryLocation,
  useProfileDeliveryLocation,
  invoiceSubtotal,
  invoiceTotal,
  createItem,
  catalogItems,
  profilePhone,
}: InvoiceFormModalProps) {
  const modalTitle = modalMode === "create" ? "New Invoice" : "Edit Invoice";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitInvoice();
  };

  return (
    <div role="dialog" aria-modal="true" className="modal-surface relative max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        {/* Visual Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card/95 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
            <div>
              <AnimatedText
                as="h2"
                text={modalTitle}
                effect="fade-through"
                className="text-lg font-bold text-foreground leading-none font-display text-balance"
                replayKey={modalTitle}
              />
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-1.5 text-pretty">
                {modalMode === "edit" ? `Edit Session` : "Draft Workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider hidden sm:inline">Template:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold bg-foreground/[0.03] border border-card-border/80 hover:bg-foreground/[0.05] rounded-lg pl-3 pr-2.5 py-1 text-foreground outline-none hover:border-accent/50 focus:border-accent transition-[background-color,border-color] duration-200 ease-out"
                >
                  {selectedTemplate.name}
                  <ChevronDown className="size-3.5 text-muted/80 translate-y-[0.5px]" />
                </button>

                {isTemplateDropdownOpen && (
                  <>
                    <button type="button" aria-label="Close dropdown" className="fixed inset-0 z-10" onClick={() => setIsTemplateDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-[160px] bg-card border border-card-border rounded-xl shadow-lg z-20 py-1">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, templateId: t.id });
                            setIsTemplateDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-[12px] transition-colors text-foreground hover:bg-foreground/[0.04] font-medium"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="size-8 flex items-center justify-center rounded-full border border-card-border/40 bg-foreground/[0.02] text-muted hover:text-foreground hover:bg-foreground/[0.06] hover:border-card-border/80 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 ease-out group"
              aria-label="Close modal"
            >
              <X className="size-4 transition-transform duration-300 group-hover:rotate-90" />
            </button>
          </div>
        </div>

        {/* Workspace Split Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div
            className="w-full md:w-[42%] border-r border-card-border bg-background/30 flex flex-col overflow-y-auto p-5 space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
            style={{ animationDelay: "60ms" }}
          >
            
            {/* Client Details Card */}
            <div className="surface-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
                  <User className="size-3.5 text-muted/80" />
                  Client Information
                </h3>
                
                {/* Segment Selector */}
                <div className="flex gap-0.5 rounded-lg border border-card-border bg-foreground/[0.03] p-0.5 shrink-0 select-none">
                  <button
                    type="button"
                    onClick={() => setClientMode("saved")}
                    disabled={clientRecords.length === 0}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-[background-color,border-color,color] duration-200 ease-out cursor-pointer ${
                      form.clientMode === "saved"
                        ? "bg-card text-foreground shadow-xs border border-card-border/50"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode("new")}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-[background-color,border-color,color] duration-200 ease-out cursor-pointer ${
                      form.clientMode === "new"
                        ? "bg-card text-foreground shadow-xs border border-card-border/50"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    New
                  </button>
                </div>
              </div>

              {form.clientMode === "saved" && clientRecords.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative">
                    <select
                      id="saved-client"
                      required
                      value={form.clientId}
                      onChange={(event) => handleClientSelect(event.target.value)}
                      className="field-control px-3 py-2 text-[13px] appearance-none pr-8 rounded-lg"
                    >
                      <option value="" disabled className="text-muted bg-background">Select Client</option>
                      {clientRecords.map((client) => (
                        <option key={client.id} value={client.id} className="text-foreground bg-background">{client.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="size-4 text-muted pointer-events-none absolute right-3 top-2.5" />
                  </div>
                  
                  {/* Client Detail Summary Card */}
                  <div className="flex items-start gap-3 rounded-xl border border-card-border/50 bg-foreground/[0.01] p-4">
                    {form.avatar ? (
                      <img className="size-11 rounded-lg object-cover border border-card-border shrink-0 outline outline-1 -outline-offset-1 outline-foreground/10" alt={form.client} src={form.avatar} />
                    ) : (
                      <div className="size-11 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0 border border-card-border">
                        <User className="size-5 text-muted/70" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-[12px] space-y-0.5">
                      <p className="font-bold text-foreground truncate text-[13px]">{form.client}</p>
                      {form.company && <p className="text-muted font-medium truncate">{form.company}</p>}
                      {form.email && (
                        <p className="text-muted truncate flex items-center gap-1.5">
                          <Mail className="size-3 text-muted/70" /> {form.email}
                        </p>
                      )}
                      {(form.phone || form.whatsapp) && (
                        <p className="text-muted truncate flex items-center gap-1.5">
                          <Phone className="size-3 text-muted/70" /> {form.phone || form.whatsapp}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="relative size-12 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08] flex items-center justify-center shrink-0 border border-card-border border-dashed cursor-pointer transition-[background-color,border-color] duration-200 ease-out">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleClientImageChange}
                        className="sr-only"
                      />
                      {form.avatar ? (
                        <img className="size-full rounded-xl object-cover outline outline-1 -outline-offset-1 outline-foreground/10" alt="client avatar preview" src={form.avatar} />
                      ) : (
                        <ImagePlus className="size-5 text-muted/70" />
                      )}
                    </label>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Client Name"
                        required
                        value={form.client}
                        onChange={(event) => setForm({ ...form, client: event.target.value })}
                        className="field-control px-3 py-1.5 text-[13px] rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      placeholder="Billing Email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      className="field-control px-3 py-1.5 text-[12px] rounded-lg"
                    />
                    <PhoneInput
                      value={form.phone}
                      onChange={(phone) => setForm({ ...form, phone })}
                      hintPhone={profilePhone || form.phone || form.whatsapp}
                      placeholder="771234567"
                      inputClassName="px-3 py-1.5 text-[12px] rounded-lg"
                      selectClassName="px-2 py-1.5 text-[11px] rounded-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <PhoneInput
                      value={form.whatsapp}
                      onChange={(whatsapp) => setForm({ ...form, whatsapp })}
                      hintPhone={form.phone || form.whatsapp || profilePhone}
                      placeholder="771234567"
                      inputClassName="px-3 py-1.5 text-[12px] rounded-lg"
                      selectClassName="px-2 py-1.5 text-[11px] rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Company Name (Optional)"
                      value={form.company}
                      onChange={(event) => setForm({ ...form, company: event.target.value })}
                      className="field-control px-3 py-1.5 text-[12px] rounded-lg"
                    />
                  </div>

                  <textarea
                    placeholder="Address (Optional)"
                    rows={2}
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                    className="field-control px-3 py-1.5 text-[12px] rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Core Billing Terms */}
            <div className="surface-card p-4 space-y-4">
              <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted/80" />
                Billing Terms & Info
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="form-date" className="text-[10px] font-bold text-muted uppercase tracking-wider">Issue Date</label>
                  <input
                    type="date"
                    id="form-date"
                    required
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className="field-control px-3 py-1.5 text-[13px] font-medium rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-due-date" className="text-[10px] font-bold text-muted uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    id="form-due-date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    className="field-control px-3 py-1.5 text-[13px] font-medium rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="form-status" className="text-[10px] font-bold text-muted uppercase tracking-wider">Payment Status</label>
                  <div className="relative">
                    <select
                      id="form-status"
                      value={form.status}
                      onChange={(event) => setForm({ ...form, status: event.target.value as InvoiceStatus })}
                      className="field-control px-3 py-1.5 text-[13px] font-medium appearance-none pr-8 rounded-lg"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    <ChevronDown className="size-4 text-muted pointer-events-none absolute right-3 top-2.5" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-workflow" className="text-[10px] font-bold text-muted uppercase tracking-wider">Workflow Status</label>
                  <div className="relative">
                    <select
                      id="form-workflow"
                      value={form.workflowStatus}
                      onChange={(event) => setForm({ ...form, workflowStatus: event.target.value as InvoiceWorkflowStatus })}
                      className="field-control px-3 py-1.5 text-[13px] font-medium appearance-none pr-8 rounded-lg"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Work Confirmed">Work Confirmed</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                    <ChevronDown className="size-4 text-muted pointer-events-none absolute right-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="form-currency" className="text-[10px] font-bold text-muted uppercase tracking-wider">Override Currency</label>
                  <div className="relative">
                    <select
                      id="form-currency"
                      value={form.currency || ""}
                      onChange={(event) => setForm({ ...form, currency: event.target.value })}
                      className="field-control px-3 py-1.5 text-[13px] font-medium appearance-none pr-8 rounded-lg"
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
                <div className="space-y-1.5">
                  <label htmlFor="form-payment-link" className="text-[10px] font-bold text-muted uppercase tracking-wider">Online Payment Link</label>
                  <input
                    type="url"
                    id="form-payment-link"
                    placeholder="https://stripe.com/..."
                    value={form.paymentLink || ""}
                    onChange={(event) => setForm({ ...form, paymentLink: event.target.value })}
                    className="field-control px-3 py-1.5 text-[12px] rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Link & Locations */}
            <div className="surface-card p-4 space-y-4">
              <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
                <Link2 className="size-3.5 text-muted/80" />
                Delivery Link
              </h3>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="url"
                    placeholder="Figma, Drive, Notion link..."
                    value={form.deliveryLink}
                    onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
                    className="field-control px-3 py-1.5 text-[12px] rounded-lg"
                  />
                </div>
                
                {form.clientMode === "saved" && (
                  <button
                    type="button"
                    onClick={useClientDeliveryLocation}
                    className="btn-secondary text-[11px] px-3 font-semibold shrink-0 rounded-lg active:scale-[0.97] transition-[transform,background-color,border-color] duration-200 ease-out"
                    title="Copy delivery location from Client"
                  >
                    Client
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={useProfileDeliveryLocation}
                  className="btn-secondary text-[11px] px-3 font-semibold shrink-0 rounded-lg active:scale-[0.97] transition-[transform,background-color,border-color] duration-200 ease-out"
                  title="Copy default delivery link from Profile"
                >
                  Default
                </button>
              </div>
            </div>
          </div>

          <div
            className="flex-1 flex flex-col overflow-hidden min-h-0 bg-card p-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
            style={{ animationDelay: "120ms" }}
          >
            <div className="flex-1 overflow-y-auto space-y-5">
              
              {/* Dynamic Task Board Integration Bar */}
              {importableTasks.length > 0 && (
                <div className="rounded-xl border border-dashed border-accent/30 bg-accent/[0.02] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-accent tracking-wide uppercase flex items-center gap-1.5">
                      <CheckSquare className="size-3.5 text-accent/90" />
                      Done tasks for {form.client}
                    </span>
                    <button
                      type="button"
                      onClick={() => importAllTasks(importableTasks)}
                      className="text-[10px] font-extrabold text-accent hover:underline tracking-wider uppercase"
                    >
                      Import All ({importableTasks.length})
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {importableTasks.map((task) => {
                      const isImported = importedTaskIds.includes(task.id);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          disabled={isImported}
                          onClick={() => importTask(task)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-[background-color,border-color,color] duration-150 ease-out ${
                            isImported
                              ? "bg-foreground/[0.02] text-muted border-card-border cursor-not-allowed opacity-50"
                              : "bg-card border-card-border hover:border-accent text-foreground cursor-pointer active:scale-95"
                          }`}
                        >
                          <span className="truncate max-w-[150px]">{task.title}</span>
                          {!isImported && <Plus className="size-3 text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Dynamic Catalog Integration Bar */}
              {catalogItems && catalogItems.length > 0 && (
                <div className="rounded-xl border border-card-border/60 bg-foreground/[0.01] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted tracking-wide uppercase flex items-center gap-1.5 select-none">
                      <Package className="size-3.5 text-muted/70" />
                      Add from Service Catalog
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {catalogItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          const desc = item.name + (item.description ? ` - ${item.description}` : "");
                          const newItem = createItem(desc, 1, item.defaultPrice);
                          setForm((curr) => ({ ...curr, items: [...curr.items, newItem] }));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border hover:border-accent bg-card hover:bg-accent/5 text-foreground text-[11px] font-medium transition-[background-color,border-color,transform] duration-150 ease-out cursor-pointer active:scale-95"
                      >
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-muted">({formatCurrency(item.defaultPrice, form.currency || currency)})</span>
                        <Plus className="size-3 text-accent" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items Table List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-card-border pb-2">
                  <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
                    <List className="size-3.5 text-muted/80" />
                    Billable Line Items
                  </h3>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div key={item.id} className="flex gap-3 items-start p-4 border border-card-border/60 bg-foreground/[0.015] rounded-xl hover:border-accent/20 transition-[border-color,box-shadow] duration-200 ease-out hover:shadow-xs">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          placeholder="Description of work performed..."
                          required
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          className="field-control px-3 py-1.5 text-[13px] font-semibold rounded-lg"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 w-8">Qty</span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              placeholder="1"
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                              className="field-control px-3 py-1 text-[12px] font-mono text-center rounded-lg"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 w-8">Rate</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              placeholder="0.00"
                              value={item.price || ""}
                              onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                              className="field-control px-3 py-1 text-[12px] font-mono text-right rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="size-8 flex items-center justify-center rounded-xl border border-card-border hover:bg-negative/10 hover:text-negative hover:border-transparent text-muted transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-95 cursor-pointer shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setForm((curr) => ({ ...curr, items: [...curr.items, createItem()] }))}
                  className="w-full border border-dashed border-accent/20 hover:border-accent/60 bg-foreground/[0.01] hover:bg-accent/5 text-accent py-2.5 rounded-xl transition-[background-color,border-color,transform] duration-200 ease-out flex items-center justify-center gap-1.5 text-xs font-bold pl-4 pr-3.5 active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {/* Computations breakdown card */}
              <div className="rounded-xl border border-card-border bg-background/30 p-5 space-y-3.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(invoiceSubtotal, form.currency || currency)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4 py-1 border-t border-card-border/20">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Discount Deduction</span>
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <div className="flex rounded-md border border-card-border bg-foreground/[0.03] p-0.5 shrink-0 select-none">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, discountType: "flat" })}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-[background-color,border-color,color] duration-150 ease-out cursor-pointer ${
                          (form.discountType || "flat") === "flat"
                            ? "bg-card text-foreground shadow-xs border border-card-border/50"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        {form.currency || currency}
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, discountType: "percent" })}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-[background-color,border-color,color] duration-150 ease-out cursor-pointer ${
                          form.discountType === "percent"
                            ? "bg-card text-foreground shadow-xs border border-card-border/50"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        %
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={form.discountType === "percent" ? 100 : undefined}
                      step="any"
                      placeholder="0"
                      value={form.discount || ""}
                      onChange={(event) => {
                        const cleanVal = event.target.value.replace(/^0+(?=\d)/, '');
                        let val = Number(cleanVal) || 0;
                        if (form.discountType === "percent" && val > 100) val = 100;
                        setForm({ ...form, discount: val });
                      }}
                      className="field-control px-2 py-0.5 text-right text-[12px] font-mono w-20 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-card-border/50">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Invoice Total</span>
                  <span className="text-3xl font-bold text-foreground font-display tracking-tight font-mono tabular-nums">
                    {formatCurrency(invoiceTotal, form.currency || currency)}
                  </span>
                </div>
              </div>

              {/* Payment Tracker */}
              {modalMode === "edit" && (
                <div className="border-t border-card-border/40 pt-4">
                  <PaymentTrackingForm
                    currency={currency}
                    total={invoiceTotal}
                    payments={form.payments}
                    paymentNotes={form.paymentNotes}
                    onPaymentsChange={(payments) => setForm((currentForm) => ({ ...currentForm, payments }))}
                    onPaymentNotesChange={(paymentNotes) => setForm((currentForm) => ({ ...currentForm, paymentNotes }))}
                  />
                </div>
              )}

              {/* Save Client Choices */}
              {needsClientSaveChoice && (
                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 animate-in slide-in-from-bottom-2 duration-200">
                  <p className="text-[12px] font-bold text-foreground mb-1">Save this client record?</p>
                  <p className="text-[11px] text-muted mb-3 leading-normal text-pretty">Regular clients are saved to the Clients directory for future invoices. One-time clients stay on this invoice only.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void submitInvoice("regular")}
                      className="btn-primary text-[11px] min-h-7 px-3 py-1 rounded-lg shadow-xs active:scale-[0.97] transition-[transform,background-color] duration-150 ease-out cursor-pointer"
                    >
                      Save to Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => void submitInvoice("onetime")}
                      className="btn-secondary text-[11px] min-h-7 px-3 py-1 rounded-lg active:scale-[0.97] transition-[transform,background-color,border-color] duration-150 ease-out cursor-pointer"
                    >
                      One-Time Only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div
          className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-card-border bg-card shrink-0 z-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
          style={{ animationDelay: "180ms" }}
        >
          <button
            type="button"
            onClick={closeModal}
            className="btn-ghost min-h-9 px-4 rounded-xl text-[12px] font-bold active:scale-[0.98] transition-[transform,background-color,color] duration-150 ease-out cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary min-h-9 px-5 rounded-xl text-[12px] font-bold shadow-md active:scale-[0.98] transition-[transform,background-color] duration-150 ease-out cursor-pointer"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

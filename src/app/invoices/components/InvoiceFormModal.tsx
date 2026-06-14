"use client";

import * as React from "react";
import { AnimatedText } from "@/components/animated-text";
import { PaymentTrackingForm } from "@/components/payment-tracking";
import {
  formatCurrency,
  type Client,
  type InvoiceItem,
  type PaymentRecord,
  type PaymentAttachment,
} from "@/data/invoices";
import type { TodoTask } from "@/data/todos";

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
            <div>
              <AnimatedText
                as="h2"
                text={modalTitle}
                effect="fade-through"
                className="text-lg font-bold text-[var(--foreground)] leading-none font-display"
                replayKey={modalTitle}
              />
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-1.5">
                {modalMode === "edit" ? `Edit Session` : "Draft Workspace"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider hidden sm:inline">Template:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                  className="flex items-center gap-2 text-[12px] font-semibold bg-[var(--foreground)]/[0.04] border border-[var(--card-border)] rounded-lg px-3 py-1 text-[var(--foreground)] outline-none hover:border-[var(--accent)]/50 focus:border-[var(--accent)] transition-smooth"
                >
                  {selectedTemplate.name}
                  <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">expand_more</span>
                </button>

                {isTemplateDropdownOpen && (
                  <>
                    <button type="button" aria-label="Close dropdown" className="fixed inset-0 z-10" onClick={() => setIsTemplateDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-[160px] bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg z-20 py-1">
                      {TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, templateId: t.id });
                            setIsTemplateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors ${
                            form.templateId === t.id
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                              : "text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] font-medium"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button type="button" onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth text-[var(--muted)] hover:text-[var(--foreground)]">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Workspace Split Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Column - Core Configs & Client Info (42% width) */}
          <div className="w-full md:w-[42%] border-r border-[var(--card-border)] bg-[var(--background)]/30 flex flex-col overflow-y-auto p-5 space-y-5">
            
            {/* Client Details Card */}
            <div className="surface-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-[var(--muted)] tracking-wider uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">person</span>
                  Client Information
                </h3>
                
                {/* Segment Selector */}
                <div className="flex gap-0.5 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setClientMode("saved")}
                    disabled={clientRecords.length === 0}
                    className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-smooth ${
                      form.clientMode === "saved"
                        ? "bg-[var(--action)] text-[var(--action-text)] shadow-xs"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Saved
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientMode("new")}
                    className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-smooth ${
                      form.clientMode === "new"
                        ? "bg-[var(--action)] text-[var(--action-text)] shadow-xs"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
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
                      className="field-control px-3 py-2 text-[13px] appearance-none"
                    >
                      <option value="" disabled className="text-[var(--muted)] bg-[var(--background)]">Select Client</option>
                      {clientRecords.map((client) => (
                        <option key={client.id} value={client.id} className="text-[var(--foreground)] bg-[var(--background)]">{client.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2.5 text-[var(--muted)] pointer-events-none text-[16px]">expand_more</span>
                  </div>
                  
                  {/* Client Detail Summary Card */}
                  <div className="flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.02] p-3 shadow-xs">
                    {form.avatar ? (
                      <img className="size-11 rounded-xl object-cover border border-[var(--card-border)] shrink-0" alt={form.client} src={form.avatar} />
                    ) : (
                      <div className="size-11 rounded-xl bg-[var(--foreground)]/[0.04] flex items-center justify-center shrink-0 border border-[var(--card-border)]">
                        <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">person</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-[12px] space-y-0.5">
                      <p className="font-bold text-[var(--foreground)] truncate text-[13px]">{form.client}</p>
                      {form.company && <p className="text-[var(--muted)] font-medium truncate">{form.company}</p>}
                      {form.email && (
                        <p className="text-[var(--muted)] truncate flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">mail</span> {form.email}
                        </p>
                      )}
                      {(form.phone || form.whatsapp) && (
                        <p className="text-[var(--muted)] truncate flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">phone</span> {form.phone || form.whatsapp}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="relative size-12 rounded-xl bg-[var(--foreground)]/[0.04] hover:bg-[var(--foreground)]/[0.08] flex items-center justify-center shrink-0 border border-[var(--card-border)] border-dashed cursor-pointer transition-smooth">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleClientImageChange}
                        className="sr-only"
                      />
                      {form.avatar ? (
                        <img className="size-full rounded-xl object-cover" alt="client avatar preview" src={form.avatar} />
                      ) : (
                        <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">add_photo_alternate</span>
                      )}
                    </label>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Client Name"
                        required
                        value={form.client}
                        onChange={(event) => setForm({ ...form, client: event.target.value })}
                        className="field-control px-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      placeholder="Billing Email"
                      value={form.email}
                      onChange={(event) => setForm({ ...form, email: event.target.value })}
                      className="field-control px-3 py-1.5 text-[12px]"
                    />
                    <input
                      type="text"
                      placeholder="Billing Phone"
                      value={form.phone}
                      onChange={(event) => setForm({ ...form, phone: event.target.value })}
                      className="field-control px-3 py-1.5 text-[12px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="WhatsApp (Optional)"
                      value={form.whatsapp}
                      onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                      className="field-control px-3 py-1.5 text-[12px]"
                    />
                    <input
                      type="text"
                      placeholder="Company Name (Optional)"
                      value={form.company}
                      onChange={(event) => setForm({ ...form, company: event.target.value })}
                      className="field-control px-3 py-1.5 text-[12px]"
                    />
                  </div>

                  <textarea
                    placeholder="Address (Optional)"
                    rows={2}
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                    className="field-control px-3 py-1.5 text-[12px]"
                  />
                </div>
              )}
            </div>

            {/* Core Billing Terms */}
            <div className="surface-card p-4 space-y-4">
              <h3 className="text-[11px] font-bold text-[var(--muted)] tracking-wider uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                Billing Terms & Info
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="form-date" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Issue Date</label>
                  <input
                    type="date"
                    id="form-date"
                    required
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className="field-control px-3 py-1.5 text-[13px] font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-due-date" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    id="form-due-date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    className="field-control px-3 py-1.5 text-[13px] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="form-status" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Payment Status</label>
                  <div className="relative">
                    <select
                      id="form-status"
                      value={form.status}
                      onChange={(event) => setForm({ ...form, status: event.target.value as InvoiceStatus })}
                      className="field-control px-3 py-1.5 text-[13px] font-medium appearance-none"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2 text-[var(--muted)] pointer-events-none text-[16px]">expand_more</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-workflow" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Workflow Status</label>
                  <div className="relative">
                    <select
                      id="form-workflow"
                      value={form.workflowStatus}
                      onChange={(event) => setForm({ ...form, workflowStatus: event.target.value as InvoiceWorkflowStatus })}
                      className="field-control px-3 py-1.5 text-[13px] font-medium appearance-none"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Work Confirmed">Work Confirmed</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-2 text-[var(--muted)] pointer-events-none text-[16px]">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="form-currency" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Override Currency</label>
                  <input
                    type="text"
                    id="form-currency"
                    placeholder={`Matches profile: ${currency}`}
                    value={form.currency || ""}
                    onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase().slice(0, 3) })}
                    className="field-control px-3 py-1.5 text-[13px] font-semibold tracking-wider placeholder:font-normal placeholder:text-[var(--muted)]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-payment-link" className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Online Payment Link</label>
                  <input
                    type="url"
                    id="form-payment-link"
                    placeholder="https://stripe.com/..."
                    value={form.paymentLink || ""}
                    onChange={(event) => setForm({ ...form, paymentLink: event.target.value })}
                    className="field-control px-3 py-1.5 text-[12px]"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Link & Locations */}
            <div className="surface-card p-4 space-y-4">
              <h3 className="text-[11px] font-bold text-[var(--muted)] tracking-wider uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">link</span>
                Delivery Link
              </h3>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="url"
                    placeholder="Figma, Drive, Notion link..."
                    value={form.deliveryLink}
                    onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
                    className="field-control px-3 py-1.5 text-[12px]"
                  />
                </div>
                
                {form.clientMode === "saved" && (
                  <button
                    type="button"
                    onClick={useClientDeliveryLocation}
                    className="btn-secondary text-[11px] px-3 font-semibold shrink-0"
                    title="Copy delivery location from Client"
                  >
                    Client
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={useProfileDeliveryLocation}
                  className="btn-secondary text-[11px] px-3 font-semibold shrink-0"
                  title="Copy default delivery link from Profile"
                >
                  Default
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Work Items Listing & Computations (58% width) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[var(--card)] p-5">
            <div className="flex-1 overflow-y-auto space-y-5">
              
              {/* Dynamic Task Board Integration Bar */}
              {importableTasks.length > 0 && (
                <div className="rounded-xl border border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/[0.02] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--accent)] tracking-wide uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      Done tasks for {form.client}
                    </span>
                    <button
                      type="button"
                      onClick={() => importAllTasks(importableTasks)}
                      className="text-[10px] font-extrabold text-[var(--accent)] hover:underline tracking-wider uppercase"
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-smooth ${
                            isImported
                              ? "bg-[var(--foreground)]/[0.02] text-[var(--muted)] border-[var(--card-border)] cursor-not-allowed opacity-50"
                              : "bg-[var(--card)] border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--foreground)]"
                          }`}
                        >
                          <span className="truncate max-w-[150px]">{task.title}</span>
                          {!isImported && <span className="material-symbols-outlined text-[12px] text-[var(--accent)] font-bold">add</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Items Table List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-2">
                  <h3 className="text-[11px] font-bold text-[var(--muted)] tracking-wider uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">list_alt</span>
                    Billable Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={() => setForm((curr) => ({ ...curr, items: [...curr.items, createItem()] }))}
                    className="text-[11px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 tracking-wider uppercase"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div key={item.id} className="flex gap-3 items-start p-3 border border-[var(--card-border)] rounded-xl bg-[var(--background)]/20 shadow-2xs hover:border-[var(--foreground)]/10 transition-colors">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          placeholder="Description of work performed..."
                          required
                          value={item.description}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          className="field-control px-3 py-1.5 text-[13px] font-semibold"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider shrink-0 w-8">Qty</span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              placeholder="1"
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                              className="field-control px-3 py-1 text-[12px] font-mono text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider shrink-0 w-8">Rate</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              placeholder="0.00"
                              value={item.price || ""}
                              onChange={(e) => updateItem(index, { price: Number(e.target.value) })}
                              className="field-control px-3 py-1 text-[12px] font-mono text-right"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="size-8 flex items-center justify-center rounded-xl border border-[var(--card-border)] hover:bg-[var(--negative)]/10 hover:text-[var(--negative)] hover:border-transparent text-[var(--muted)] transition-smooth"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Computations breakdown card */}
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--background)]/30 p-5 space-y-3.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Subtotal</span>
                  <span className="font-mono">{formatCurrency(invoiceSubtotal, form.currency || currency)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--card-border)]/20">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Discount Deduction</span>
                  <div className="flex items-center gap-1.5 max-w-[120px]">
                    <span className="text-[11px] font-bold text-[var(--muted)]">{form.currency || currency}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={form.discount || ""}
                      onChange={(event) => {
                        const cleanVal = event.target.value.replace(/^0+(?=\d)/, '');
                        setForm({ ...form, discount: Number(cleanVal) || 0 });
                      }}
                      className="field-control px-2 py-0.5 text-right text-[12px] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[var(--card-border)]/50">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Invoice Total</span>
                  <span className="text-2xl font-bold text-[var(--foreground)] font-display tracking-tight">
                    {formatCurrency(invoiceTotal, form.currency || currency)}
                  </span>
                </div>
              </div>

              {/* Payment Tracker */}
              {modalMode === "edit" && (
                <div className="border-t border-[var(--card-border)]/40 pt-4">
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
                <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 animate-in slide-in-from-bottom-2 duration-200">
                  <p className="text-[12px] font-bold text-[var(--foreground)] mb-1">Save this client record?</p>
                  <p className="text-[11px] text-[var(--muted)] mb-3 leading-normal">Regular clients are saved to the Clients directory for future invoices. One-time clients stay on this invoice only.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void submitInvoice("regular")} className="btn-primary text-[11px] min-h-7 px-3 py-1 shadow-xs active:scale-[0.97]">
                      Save to Directory
                    </button>
                    <button type="button" onClick={() => void submitInvoice("onetime")} className="btn-secondary text-[11px] min-h-7 px-3 py-1 active:scale-[0.97]">
                      One-Time Only
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card)] shrink-0 z-10">
          <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 rounded-lg text-[12px] font-bold">
            Cancel
          </button>
          <button type="submit" className="btn-primary min-h-9 px-5 rounded-lg text-[12px] font-bold shadow-md active:scale-[0.97]" disabled={isSaving}>
            {isSaving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

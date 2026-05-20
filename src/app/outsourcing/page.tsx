"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PaymentSummary, PaymentTrackingForm, createPaymentRecord } from "@/components/payment-tracking";
import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getInvoiceItemsTotal,
  getOutsourcingInvoiceTotal,
  getOutsourcingTotals,
  getPaymentState,
  type InvoiceItem,
  type InvoiceStatus,
  type OutsourcingInvoice,
  type PaymentAttachment,
  type PaymentRecord,
  type Vendor,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useOutsourcing } from "@/hooks/use-outsourcing";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

const STATUS_FILTERS = ["All", "Paid", "Unpaid", "Overdue"] as const;
const STATUSES: InvoiceStatus[] = ["Paid", "Unpaid", "Overdue"];
const TEMPLATES = [
  {
    id: "outsourcing",
    name: "Outsourcing Invoice",
    description: "A payable record for work you need to pay to a vendor.",
  },
] as const;

type ModalMode = "create" | "edit" | "view" | null;
type VendorMode = "saved" | "new";
type SaveVendorMode = "regular" | "onetime";

type OutsourcingForm = {
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
};

function createItem(description = "", quantity = 1, price = 0): InvoiceItem {
  return {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    description,
    quantity,
    price,
  };
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createEmptyForm(): OutsourcingForm {
  return {
    templateId: TEMPLATES[0].id,
    vendorMode: "saved",
    vendorId: "",
    vendor: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    avatar: "",
    date: todayInputValue(),
    dueDate: "",
    status: "Unpaid",
    items: [createItem()],
    paymentNotes: "",
    payments: [],
    receiptAttachments: [],
    saveVendorMode: null,
  };
}

function toDateInputValue(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function getFormFromVendor(vendor: Vendor, currentForm: OutsourcingForm): OutsourcingForm {
  return {
    ...currentForm,
    vendorMode: "saved",
    vendorId: vendor.id,
    vendor: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    company: vendor.company || "",
    address: vendor.address || "",
    avatar: vendor.avatar,
    saveVendorMode: null,
  };
}

function getOutsourcingForm(invoice: OutsourcingInvoice, vendors: Vendor[]): OutsourcingForm {
  const matchingVendor = vendors.find((vendor) => vendor.id === invoice.vendorId || vendor.name === invoice.vendor);
  const fallbackItems = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [createItem("Payable total", 1, getOutsourcingInvoiceTotal(invoice))];

  return {
    templateId: invoice.templateId || TEMPLATES[0].id,
    vendorMode: matchingVendor ? "saved" : "new",
    vendorId: matchingVendor?.id || "",
    vendor: invoice.vendor,
    email: invoice.email,
    phone: invoice.phone,
    company: invoice.company || matchingVendor?.company || "",
    address: invoice.address || matchingVendor?.address || "",
    avatar: invoice.avatar,
    date: toDateInputValue(invoice.date) || todayInputValue(),
    dueDate: toDateInputValue(invoice.dueDate),
    status: invoice.status,
    items: fallbackItems,
    paymentNotes: invoice.paymentNotes || "",
    payments: invoice.payments || [],
    receiptAttachments: invoice.receiptAttachments || [],
    saveVendorMode: null,
  };
}

export default function Outsourcing() {
  const { vendors, outsourcingInvoices, saveOutsourcingInvoice, exportOutsourcingInvoice } = useOutsourcing();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OutsourcingInvoice | null>(null);
  const [form, setForm] = useState<OutsourcingForm>(createEmptyForm);
  const [needsVendorSaveChoice, setNeedsVendorSaveChoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredInvoices = useMemo(() => outsourcingInvoices.filter((invoice) => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesStatus = activeFilter === "All" || invoice.status === activeFilter;
    const matchesSearch = searchQuery === "" ||
      invoice.vendor.toLowerCase().includes(normalizedSearch) ||
      invoice.id.toLowerCase().includes(normalizedSearch) ||
      invoice.email.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  }), [activeFilter, outsourcingInvoices, searchQuery]);

  const totals = getOutsourcingTotals(outsourcingInvoices);
  const isFormMode = modalMode === "create" || modalMode === "edit";
  const selectedTemplate = TEMPLATES.find((template) => template.id === form.templateId) || TEMPLATES[0];
  const invoiceTotal = getInvoiceItemsTotal(form.items);
  const modalTitle = modalMode === "create" ? "New Outsourcing Invoice" : modalMode === "edit" ? "Edit Outsourcing Invoice" : selectedInvoice?.id || "Outsourcing Invoice";

  function openCreateModal() {
    const initialForm = createEmptyForm();
    const firstVendor = vendors[0];

    setSelectedInvoice(null);
    setNeedsVendorSaveChoice(false);
    setForm(firstVendor ? getFormFromVendor(firstVendor, initialForm) : { ...initialForm, vendorMode: "new" });
    setModalMode("create");
  }

  function openEditModal(invoice: OutsourcingInvoice) {
    setSelectedInvoice(invoice);
    setNeedsVendorSaveChoice(false);
    setForm(getOutsourcingForm(invoice, vendors));
    setModalMode("edit");
  }

  function openViewModal(invoice: OutsourcingInvoice) {
    setSelectedInvoice(invoice);
    setNeedsVendorSaveChoice(false);
    setForm(getOutsourcingForm(invoice, vendors));
    setModalMode("view");
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setModalMode(null);
    setSelectedInvoice(null);
    setNeedsVendorSaveChoice(false);
    setForm(createEmptyForm());
  }

  function setVendorMode(vendorMode: VendorMode) {
    setNeedsVendorSaveChoice(false);

    if (vendorMode === "saved") {
      const firstVendor = vendors[0];
      setForm((currentForm) => firstVendor ? getFormFromVendor(firstVendor, currentForm) : { ...currentForm, vendorMode: "saved" });
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      vendorMode: "new",
      vendorId: "",
      vendor: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      avatar: "",
      saveVendorMode: null,
    }));
  }

  function handleVendorSelect(vendorId: string) {
    const vendor = vendors.find((currentVendor) => currentVendor.id === vendorId);

    if (!vendor) {
      setForm((currentForm) => ({ ...currentForm, vendorId, vendor: "" }));
      return;
    }

    setForm((currentForm) => getFormFromVendor(vendor, currentForm));
  }

  function handleVendorImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((currentForm) => ({ ...currentForm, avatar: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function updateItem(index: number, updates: Partial<InvoiceItem>) {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item),
    }));
  }

  function removeItem(index: number) {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.length === 1 ? currentForm.items : currentForm.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function submitOutsourcingInvoice(saveVendorMode?: SaveVendorMode) {
    const normalizedItems = form.items.filter((item) => item.description.trim() || item.quantity > 0 || item.price > 0);
    const vendorName = form.vendor.trim();

    if (isSaving) {
      return;
    }

    if (!vendorName) {
      notify.warning({
        title: "Vendor required",
        description: "Add a vendor name before saving this payable.",
      });
      return;
    }

    if (normalizedItems.length === 0) {
      notify.warning({
        title: "Add payable items",
        description: "Include at least one item before saving.",
      });
      return;
    }

    if (form.vendorMode === "new" && !saveVendorMode && !form.saveVendorMode) {
      setNeedsVendorSaveChoice(true);
      notify.info({
        title: "Save this vendor?",
        description: "Choose whether this vendor should be reusable or one-time only.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = modalMode === "edit";
      const paymentTotal = form.payments.reduce((sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0), 0);
      const latestPayment = [...form.payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
      await notifyPromise(saveOutsourcingInvoice({
        id: modalMode === "edit" ? selectedInvoice?.id : undefined,
        vendorId: form.vendorMode === "saved" ? form.vendorId : undefined,
        vendor: vendorName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        address: form.address,
        avatar: form.avatar,
        date: form.date,
        dueDate: form.dueDate,
        status: form.status,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        items: normalizedItems,
        amountPaid: form.payments.length > 0 ? paymentTotal : form.status === "Paid" ? invoiceTotal : 0,
        paidAt: latestPayment?.paidAt || (form.status === "Paid" ? form.date : undefined),
        paymentMethod: latestPayment?.method,
        paymentNotes: form.paymentNotes,
        receiptAttachments: form.receiptAttachments,
        payments: form.payments,
        saveVendorMode: form.vendorMode === "new" ? saveVendorMode || form.saveVendorMode || "onetime" : "onetime",
      }).then((savedInvoice) => {
        if (!savedInvoice) {
          throw new Error("Create a profile before saving payables.");
        }

        return savedInvoice;
      }), {
        loading: {
          title: isEditing ? "Updating payable..." : "Creating payable...",
          description: "Saving your outsourcing record.",
        },
        success: (savedInvoice) => ({
          title: isEditing ? "Payable updated" : "Payable created",
          description: `${savedInvoice.id} for ${savedInvoice.vendor} is saved.`,
        }),
        error: (error) => ({
          title: isEditing ? "Payable update failed" : "Payable creation failed",
          description: getToastErrorMessage(error, "Unable to save this payable."),
        }),
      });

      setModalMode(null);
      setSelectedInvoice(null);
      setNeedsVendorSaveChoice(false);
      setForm(createEmptyForm());
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitOutsourcingInvoice();
  }

  async function handleExportOutsourcingInvoice(invoice: OutsourcingInvoice) {
    try {
      await exportOutsourcingInvoice(invoice);
      notify.success({
        title: "Download started",
        description: `${invoice.id} was exported as a PDF voucher.`,
      });
    } catch (error) {
      notify.error({
        title: "Download failed",
        description: getToastErrorMessage(error, "Unable to export this payable."),
      });
    }
  }

  return (
    <>
      <main className="app-main flex-1">
        <div className="page-heading">
          <div>
            <AnimatedText as="p" text="Payables" effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Outsourcing"
              effect="micro-scale-fade"
              className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
              delayMs={70}
            />
          </div>
          <button onClick={openCreateModal} className="btn-primary active:scale-[0.97]">
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Outsourcing Invoice
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="surface-featured p-4 relative overflow-hidden">
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Payables</p>
            <p className="text-xl font-semibold text-[var(--featured-text)] font-display"><AnimatedNumber value={formatCurrency(totals.totalAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Paid</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Pending</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(totals.pendingAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Overdue</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(totals.overdueAmount, currency)} /></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="search-field flex-1 max-w-md">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search outsourcing invoices..."
              type="text"
            />
            <span className="search-icon-btn">
              <span className="material-symbols-outlined text-[15px]">search</span>
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-full transition-smooth active:scale-[0.95] tracking-wide uppercase ${
                  activeFilter === filter
                    ? "bg-[var(--action)] text-[var(--action-text)]"
                    : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04] border border-[var(--card-border)]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredInvoices.map((invoice) => (
            (() => {
              const balanceDue = getBalanceDue(invoice);
              const paymentState = getPaymentState(invoice);

              return (
            <button
              type="button"
              key={invoice.id}
              onClick={() => openViewModal(invoice)}
              className="surface-card w-full text-left p-4 lg:p-5 hover:border-[var(--foreground)]/12 transition-smooth group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl border border-[var(--card-border)] overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" alt={invoice.vendor} src={invoice.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[14px] text-[var(--foreground)] group-hover:text-[var(--accent)] transition-smooth truncate">{invoice.vendor}</h3>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
                    <span className="font-medium">{invoice.id}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[var(--foreground)]/15" />
                    {invoice.date}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getOutsourcingInvoiceTotal(invoice), currency)} /></p>
                  <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase mt-0.5">
                    <AnimatedNumber value={formatCurrency(getAmountPaid(invoice), currency)} /> paid
                  </p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 ${invoice.statusColor}`}>
                  {paymentState}
                </span>
                <div className="hidden sm:flex gap-0.5 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <span onClick={(event) => { event.stopPropagation(); openViewModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="View">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); handleExportOutsourcingInvoice(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Download">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 sm:hidden">
                <p className="text-base font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getOutsourcingInvoiceTotal(invoice), currency)} /></p>
                <p className="text-[11px] font-medium text-[var(--muted)]"><AnimatedNumber value={formatCurrency(balanceDue, currency)} /> due</p>
              </div>
            </button>
              );
            })()
          ))}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">engineering</span>
              <AnimatedText as="p" text="No outsourcing invoices yet" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
            </div>
          )}
        </div>
      </main>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <AnimatedText
                as="h2"
                text={modalTitle}
                effect="fade-through"
                className="text-xl font-semibold text-[var(--foreground)] font-display"
                replayKey={modalTitle}
              />
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>

            {isFormMode ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TEMPLATES.map((template) => {
                    const isSelected = form.templateId === template.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setForm({ ...form, templateId: template.id })}
                        className={`surface-card p-4 text-left transition-smooth ${
                          isSelected ? "border-[var(--accent)]/55 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_13%,transparent)]" : "hover:border-[var(--foreground)]/15"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>
                            <span className="block text-[13px] font-semibold text-[var(--foreground)]">{template.name}</span>
                            <span className="block mt-1 text-[11px] text-[var(--muted)]">{template.description}</span>
                          </span>
                          <span className={`size-7 rounded-xl flex items-center justify-center ${isSelected ? "bg-[var(--action)] text-[var(--action-text)]" : "border border-[var(--card-border)] text-transparent"}`}>
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="surface-card p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Vendor</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Select a saved vendor or enter a one-time payee.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--card-border)] bg-[var(--foreground)]/[0.04] p-1">
                      <button
                        type="button"
                        onClick={() => setVendorMode("saved")}
                        disabled={vendors.length === 0}
                        className={`min-h-8 rounded-full px-3 text-[12px] font-semibold transition-smooth ${
                          form.vendorMode === "saved"
                            ? "bg-[var(--action)] text-[var(--action-text)]"
                            : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04]"
                        }`}
                      >
                        Saved
                      </button>
                      <button
                        type="button"
                        onClick={() => setVendorMode("new")}
                        className={`min-h-8 rounded-full px-3 text-[12px] font-semibold transition-smooth ${
                          form.vendorMode === "new"
                            ? "bg-[var(--action)] text-[var(--action-text)]"
                            : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04]"
                        }`}
                      >
                        New
                      </button>
                    </div>
                  </div>

                  {form.vendorMode === "saved" && vendors.length > 0 ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="saved-vendor">Saved Vendor</label>
                      <select id="saved-vendor" required value={form.vendorId} onChange={(event) => handleVendorSelect(event.target.value)} className="field-control px-3 py-2">
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                        ))}
                      </select>
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] p-3">
                        {form.avatar ? (
                          <img className="size-10 rounded-xl object-cover border border-[var(--card-border)]" alt={form.vendor} src={form.avatar} />
                        ) : (
                          <span className="size-10 rounded-xl bg-[var(--foreground)]/[0.04] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">engineering</span>
                          </span>
                        )}
                        <div className="min-w-0 text-[12px] text-[var(--muted)]">
                          <p className="font-semibold text-[var(--foreground)] truncate">{form.vendor}</p>
                          <p className="truncate">{form.email || "No email saved"}</p>
                          <p className="truncate">{form.phone || "No phone saved"}</p>
                          {form.address && <p className="mt-1 whitespace-pre-line">{form.address}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                          {form.avatar ? (
                            <img className="w-full h-full object-cover" alt="Vendor preview" src={form.avatar} />
                          ) : (
                            <span className="material-symbols-outlined text-[var(--foreground)]/25">image</span>
                          )}
                        </div>
                        <label className="btn-secondary text-[12px] min-h-8 px-3 py-1.5 cursor-pointer">
                          <span>{form.avatar ? "Change Image" : "Add Image"}</span>
                          <input className="sr-only" type="file" accept="image/*" onChange={handleVendorImageChange} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-vendor">Vendor Name</label>
                          <input id="outsourcing-vendor" required value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} placeholder="Vendor or company name" className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-company">Company</label>
                          <input id="outsourcing-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" className="field-control px-3 py-2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-email">Email</label>
                          <input id="outsourcing-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="vendor@example.com" className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-phone">Phone</label>
                          <input id="outsourcing-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 000-0000" className="field-control px-3 py-2" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-address">Address</label>
                        <textarea id="outsourcing-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Payee address" className="field-control min-h-20 px-3 py-2 resize-none" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-date">Date</label>
                    <input id="outsourcing-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field-control px-3 py-2" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-due-date">Due Date</label>
                    <input id="outsourcing-due-date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="field-control px-3 py-2" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="outsourcing-status">Status</label>
                    <select
                      id="outsourcing-status"
                      value={form.status}
                      onChange={(event) => {
                        const status = event.target.value as InvoiceStatus;
                        setForm((currentForm) => ({
                          ...currentForm,
                          status,
                          payments: status === "Paid" && currentForm.payments.length === 0
                            ? [createPaymentRecord(invoiceTotal)]
                            : currentForm.payments,
                        }));
                      }}
                      className="field-control px-3 py-2"
                    >
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                </div>

                <div className="surface-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
                    <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Payable Items</p>
                    <button type="button" onClick={() => setForm({ ...form, items: [...form.items, createItem()] })} className="btn-secondary text-[11px] min-h-8 px-3 py-1.5">
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add Item
                    </button>
                  </div>
                  <div className="divide-y divide-[var(--card-border)]">
                    {form.items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_90px_130px_40px] gap-3 p-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor={`outsourcing-item-description-${item.id}`}>Work Purchased</label>
                          <input id={`outsourcing-item-description-${item.id}`} required value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Development work, subcontracted design..." className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor={`outsourcing-item-quantity-${item.id}`}>Qty</label>
                          <input id={`outsourcing-item-quantity-${item.id}`} type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor={`outsourcing-item-price-${item.id}`}>Price</label>
                          <input id={`outsourcing-item-price-${item.id}`} type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateItem(index, { price: Number(event.target.value) })} className="field-control px-3 py-2" />
                        </div>
                        <div className="flex md:items-end">
                          <button type="button" onClick={() => removeItem(index)} className="size-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" aria-label="Remove item">
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-4 bg-[var(--foreground)]/[0.03]">
                    <span className="text-[12px] font-semibold text-[var(--muted)] tracking-wider uppercase">Total Payable</span>
                    <span className="text-2xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(invoiceTotal, currency)} /></span>
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
                  <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-4">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">Save this vendor?</p>
                    <p className="text-[12px] text-[var(--muted)] mb-3">Regular vendors are available next time. One-time vendors stay only on this payable invoice.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void submitOutsourcingInvoice("regular")} className="btn-primary active:scale-[0.97]">
                        Save Regular Vendor
                      </button>
                      <button type="button" onClick={() => void submitOutsourcingInvoice("onetime")} className="btn-secondary">
                        One-Time Only
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="btn-ghost">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary active:scale-[0.97]" disabled={isSaving}>
                    {isSaving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Payable"}
                  </button>
                </div>
              </form>
            ) : selectedInvoice && (
              <div className="space-y-5">
                <div className="surface-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-[var(--card-border)] pb-5 mb-5">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">{selectedInvoice.templateName || "Outsourcing Invoice"}</p>
                      <p className="text-2xl font-semibold text-[var(--foreground)] font-display">{selectedInvoice.id}</p>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 ${selectedInvoice.statusColor}`}>
                      {getPaymentState(selectedInvoice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-2">Pay To</p>
                      <div className="flex items-start gap-3">
                        <img className="size-10 rounded-xl object-cover border border-[var(--card-border)]" alt={selectedInvoice.vendor} src={selectedInvoice.avatar} />
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--foreground)]">{selectedInvoice.vendor}</p>
                          <p className="text-[12px] text-[var(--muted)]">{selectedInvoice.email || "No email added"}</p>
                          <p className="text-[12px] text-[var(--muted)]">{selectedInvoice.phone || "No phone added"}</p>
                          {selectedInvoice.address && <p className="text-[12px] text-[var(--muted)] whitespace-pre-line mt-1">{selectedInvoice.address}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="surface-card p-3.5">
                        <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-1.5">Date</p>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">{selectedInvoice.date}</p>
                      </div>
                      <div className="surface-card p-3.5">
                        <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-1.5">Due</p>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">{selectedInvoice.dueDate || "No due date"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[var(--card-border)]">
                    <div className="grid grid-cols-[1fr_70px_110px] gap-3 bg-[var(--foreground)]/[0.04] px-4 py-2 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">
                      <span>Work</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {(selectedInvoice.items || []).map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_70px_110px] gap-3 border-t border-[var(--card-border)] px-4 py-3 text-[13px]">
                        <span className="font-medium text-[var(--foreground)]">{item.description}</span>
                        <span className="text-right text-[var(--muted)]"><AnimatedNumber value={item.quantity} /></span>
                        <span className="text-right font-semibold text-[var(--foreground)]"><AnimatedNumber value={formatCurrency(item.quantity * item.price, currency)} /></span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-[var(--card-border)] px-4 py-4">
                      <span className="text-[12px] font-semibold text-[var(--muted)] tracking-wider uppercase">Total Payable</span>
                      <span className="text-2xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getOutsourcingInvoiceTotal(selectedInvoice), currency)} /></span>
                    </div>
                  </div>
                </div>

                <PaymentSummary currency={currency} record={selectedInvoice} title="Payment Tracking" />

                <div className="flex justify-end gap-2">
                  <button onClick={() => handleExportOutsourcingInvoice(selectedInvoice)} className="btn-secondary">
                    Download
                  </button>
                  <button onClick={() => openEditModal(selectedInvoice)} className="btn-primary active:scale-[0.97]">
                    Edit Payable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </>
  );
}

"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PaymentSummary, PaymentTrackingForm, createPaymentRecord } from "@/components/payment-tracking";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";

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
  type InvoiceWorkflowStatus,
  type OutsourcingInvoice,
  type PaymentAttachment,
  type PaymentRecord,
  type Vendor,
  CURRENCIES,
  createAvatar,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useOutsourcing } from "@/hooks/use-outsourcing";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

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
  currency: string;
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
    currency: "",
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
    currency: invoice.currency || "",
  };
}

export default function Outsourcing() {
  const { vendors, outsourcingInvoices, saveVendor, saveOutsourcingInvoice, exportOutsourcingInvoice } = useOutsourcing();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OutsourcingInvoice | null>(null);
  const [shareInvoice, setShareInvoice] = useState<OutsourcingInvoice | null>(null);
  const [form, setForm] = useState<OutsourcingForm>(createEmptyForm);
  const [needsVendorSaveChoice, setNeedsVendorSaveChoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function openShareModal(invoice: OutsourcingInvoice) {
    setShareInvoice(invoice);
  }

  function getWhatsAppUrl(phone: string, message: string) {
    const digits = phone.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
  }

  function getOutsourcingContactMessage(invoice: OutsourcingInvoice) {
    return `Hi ${invoice.vendor}, here are the details for payable record ${invoice.id}.`;
  }

  async function updateOutsourcingWorkflowStatus(invoice: OutsourcingInvoice, workflowStatus: InvoiceWorkflowStatus) {
    const invoiceForm = getOutsourcingForm(invoice, vendors);
    setIsSaving(true);
    try {
      await notifyPromise(saveOutsourcingInvoice({
        ...invoiceForm,
        id: invoice.id,
        vendorId: invoice.vendorId,
        vendor: invoice.vendor,
        workflowStatus,
        saveVendorMode: "onetime",
        templateName: invoice.templateName || TEMPLATES.find(t => t.id === (invoice.templateId || invoiceForm.templateId))?.name || TEMPLATES[0].name,
      }).then((savedInvoice) => {
        if (!savedInvoice) {
          throw new Error("Create a profile before updating status.");
        }
        return savedInvoice;
      }), {
        loading: {
          title: "Updating status...",
          description: `Setting status of ${invoice.id} to ${workflowStatus}.`,
        },
        success: {
          title: "Status updated",
          description: `Successfully marked ${invoice.id} as ${workflowStatus}.`,
        },
        error: (error) => ({
          title: "Update failed",
          description: getToastErrorMessage(error, "Unable to update status."),
        }),
      });
    } catch (saveError) {
      console.error(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        const searchInput = document.querySelector(".search-field input") as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredInvoices = useMemo(() => outsourcingInvoices.filter((invoice) => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesStatus = activeFilter === "All" || invoice.status === activeFilter;
    const matchesSearch = searchQuery === "" ||
      invoice.vendor.toLowerCase().includes(normalizedSearch) ||
      invoice.id.toLowerCase().includes(normalizedSearch) ||
      invoice.email.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  }), [activeFilter, outsourcingInvoices, searchQuery]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const vendorId = params.get("vendor");
      
      if (id && outsourcingInvoices.length > 0 && !selectedInvoice && modalMode === null) {
        const invoice = outsourcingInvoices.find(i => i.id === id);
        if (invoice) {
          setSelectedInvoice(invoice);
          setNeedsVendorSaveChoice(false);
          setForm(getOutsourcingForm(invoice, vendors));
          setModalMode("view");
        }
      } else if (vendorId && vendors.length > 0 && modalMode === null) {
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor) {
          setSelectedInvoice(null);
          setNeedsVendorSaveChoice(false);
          const initialForm = createEmptyForm();
          setForm(getFormFromVendor(vendor, initialForm));
          setModalMode("create");
        }
      }
    }
  }, [outsourcingInvoices, vendors, selectedInvoice, modalMode]);

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
      items: currentForm.items.map((item, itemIndex) => {
        if (itemIndex === index) {
          const nextItem = { ...item, ...updates };
          if (
            updates.quantity !== undefined &&
            (item.quantity === 1 || item.quantity === 0 || !item.quantity) &&
            item.price > 0
          ) {
            nextItem.price = item.price * updates.quantity;
          }
          return nextItem;
        }
        return item;
      }),
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
        currency: form.currency || undefined,
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
        {/* Page Heading */}
        <div className="page-heading flex justify-between items-center mb-8">
          <div>
            <AnimatedText as="p" text="Payables" effect="micro-scale-fade" className="section-eyebrow text-xs font-bold uppercase tracking-widest text-accent mb-2" />
            <AnimatedText
              as="h1"
              text="Outsourcing"
              effect="micro-scale-fade"
              className="text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground"
              delayMs={70}
            />
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold shadow-md shadow-accent/15 transition-all active:scale-[0.97] group">
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
            New Payable
          </button>
        </div>

        {/* Bento Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Payables */}
          <div className="bg-gradient-to-br from-card to-accent/5 backdrop-blur-md rounded-3xl border border-card-border p-6 flex flex-col justify-between relative overflow-hidden group hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-accent/10 rounded-full blur-xl pointer-events-none group-hover:bg-accent/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20">
                <span className="material-symbols-outlined text-[20px] font-bold">account_balance_wallet</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-muted tracking-wider uppercase mb-1">Total Payables</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight"><AnimatedNumber value={formatCurrency(totals.totalAmount, currency)} /></p>
            </div>
          </div>

          {/* Paid */}
          <div className="bg-gradient-to-br from-card to-positive/5 backdrop-blur-md rounded-3xl border border-card-border p-6 flex flex-col justify-between relative overflow-hidden group hover:border-positive/30 hover:shadow-xl hover:shadow-positive/5 transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-positive/10 rounded-full blur-xl pointer-events-none group-hover:bg-positive/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-positive/10 flex items-center justify-center text-positive ring-1 ring-positive/20">
                <span className="material-symbols-outlined text-[20px] font-bold">check_circle</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-muted tracking-wider uppercase mb-1">Paid</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight"><AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} /></p>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-gradient-to-br from-card to-foreground/5 backdrop-blur-md rounded-3xl border border-card-border p-6 flex flex-col justify-between relative overflow-hidden group hover:border-foreground/20 hover:shadow-xl transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-foreground/5 rounded-full blur-xl pointer-events-none group-hover:bg-foreground/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-foreground/5 flex items-center justify-center text-foreground/60 ring-1 ring-foreground/10">
                <span className="material-symbols-outlined text-[20px] font-bold">pending</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-muted tracking-wider uppercase mb-1">Pending</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight"><AnimatedNumber value={formatCurrency(totals.pendingAmount, currency)} /></p>
            </div>
          </div>

          {/* Overdue */}
          <div className="bg-gradient-to-br from-card to-negative/5 backdrop-blur-md rounded-3xl border border-card-border p-6 flex flex-col justify-between relative overflow-hidden group hover:border-negative/30 hover:shadow-xl hover:shadow-negative/5 transition-all duration-300">
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-negative/10 rounded-full blur-xl pointer-events-none group-hover:bg-negative/20 transition-colors"></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-negative/10 flex items-center justify-center text-negative ring-1 ring-negative/20">
                <span className="material-symbols-outlined text-[20px] font-bold">error</span>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[11px] font-bold text-muted tracking-wider uppercase mb-1">Overdue</p>
              <p className="text-2xl font-extrabold text-foreground tracking-tight"><AnimatedNumber value={formatCurrency(totals.overdueAmount, currency)} /></p>
            </div>
          </div>
        </div>

        {/* Two Column Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main List Column */}
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <AnimatedSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search outsourcing payables..."
                />
              </div>
              <div className="flex gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all active:scale-[0.97] tracking-wider uppercase border ${
                      activeFilter === filter
                        ? "bg-action text-action-text border-action shadow-sm"
                        : "text-muted hover:bg-foreground/[0.03] border-card-border"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Payables Cards List */}
            <div className="space-y-3.5">
              {filteredInvoices.map((invoice) => (
                (() => {
                  const balanceDue = getBalanceDue(invoice);
                  const paymentState = getPaymentState(invoice);
                  const activeInvoiceCurrency = invoice.currency || currency;
                  const paidAmount = getAmountPaid(invoice);
                  const totalAmount = getOutsourcingInvoiceTotal(invoice);
                  const progressPercent = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;

                  return (
                    <button
                      type="button"
                      key={invoice.id}
                      onClick={() => openShareModal(invoice)}
                      className="surface-card w-full text-left p-5 rounded-3xl border border-card-border hover:border-foreground/15 hover:shadow-lg transition-all duration-300 relative group overflow-hidden"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        {/* Avatar with Status Ring */}
                        <div className={`size-11 rounded-2xl overflow-hidden shrink-0 ring-2 ${
                          paymentState === "Paid" ? "ring-positive/40" : paymentState === "Overdue" ? "ring-negative/40" : "ring-foreground/15"
                        } border-2 border-background shadow-xs`}>
                          <img className="w-full h-full object-cover" alt={invoice.vendor} src={invoice.avatar} />
                        </div>

                        {/* Vendor & ID Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[14px] text-foreground group-hover:text-accent transition-colors truncate">{invoice.vendor}</h3>
                          <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                            <span className="font-semibold">{invoice.id}</span>
                            <span className="w-1 h-1 rounded-full bg-foreground/15" />
                            <span className="font-medium">{invoice.date}</span>
                          </p>
                        </div>

                        {/* Due Date (Desktop) */}
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-muted font-bold tracking-wider uppercase">Due Date</p>
                          <p className="text-xs font-bold text-foreground mt-0.5">{invoice.dueDate || "No due date"}</p>
                        </div>

                        {/* Status Pill */}
                        <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full tracking-wide uppercase shrink-0 ${
                          paymentState === "Paid" ? "bg-positive/10 text-positive" : paymentState === "Overdue" ? "bg-negative/10 text-negative" : "bg-foreground/[0.06] text-foreground/60"
                        }`}>
                          {paymentState}
                        </span>

                        {/* Hover action toolbar */}
                        <div className="hidden sm:flex items-center gap-1 shrink-0 bg-background/50 backdrop-blur-xs border border-card-border p-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} className="size-8 flex items-center justify-center rounded-xl text-muted hover:text-accent hover:bg-accent/10 transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[16px] font-bold">edit</span>
                          </span>
                          <span onClick={(event) => { event.stopPropagation(); openShareModal(invoice); }} className="size-8 flex items-center justify-center rounded-xl text-muted hover:text-accent hover:bg-accent/10 transition-colors" title="Send">
                            <span className="material-symbols-outlined text-[16px] font-bold">share</span>
                          </span>
                          <span onClick={(event) => { event.stopPropagation(); handleExportOutsourcingInvoice(invoice); }} className="size-8 flex items-center justify-center rounded-xl text-muted hover:text-accent hover:bg-accent/10 transition-colors" title="Download">
                            <span className="material-symbols-outlined text-[16px] font-bold">download</span>
                          </span>
                        </div>
                      </div>

                      {/* Payment progress indicator (visual wow factor) */}
                      <div className="mt-4 pt-3 border-t border-card-border/40 flex flex-col gap-2 relative z-10">
                        <div className="flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-wider">
                          <span>Payment Progress</span>
                          <span>{progressPercent.toFixed(0)}% ({formatCurrency(paidAmount, activeInvoiceCurrency)} / {formatCurrency(totalAmount, activeInvoiceCurrency)})</span>
                        </div>
                        <div className="w-full bg-foreground/[0.04] h-1.5 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              paymentState === "Paid" ? "bg-positive" : paymentState === "Overdue" ? "bg-negative" : "bg-accent"
                            }`} 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Mobile summary details */}
                      <div className="flex items-center justify-between mt-3 sm:hidden pt-2 border-t border-card-border/20 text-xs">
                        <p className="font-bold text-foreground">Total: <span className="font-display font-semibold">{formatCurrency(totalAmount, activeInvoiceCurrency)}</span></p>
                        <p className="font-semibold text-muted">Due: <span className="text-negative">{formatCurrency(balanceDue, activeInvoiceCurrency)}</span></p>
                      </div>
                    </button>
                  );
                })()
              ))}

              {filteredInvoices.length === 0 && (
                <div className="text-center py-20 bg-card/40 border border-card-border border-dashed rounded-3xl">
                  <span className="material-symbols-outlined text-[48px] text-foreground/10 mb-3 block">engineering</span>
                  <AnimatedText as="p" text="No outsourcing payables found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
                </div>
              )}
            </div>
          </div>

          {/* Saved Vendors Column (Deck style) */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-card to-card/60 rounded-3xl border border-card-border p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-muted">contacts</span>
                  <h2 className="text-[11.5px] font-bold text-muted tracking-wider uppercase">Saved Vendors ({vendors.length})</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setForm({ ...createEmptyForm(), vendorMode: "new" });
                    setModalMode("create");
                  }} 
                  className="text-[11px] text-accent font-bold hover:text-accent-hover flex items-center gap-0.5 tracking-wider uppercase hover:underline"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Add
                </button>
              </div>

              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-none">
                {vendors.length === 0 ? (
                  <p className="text-[12px] text-muted text-center py-8">No saved vendors yet.</p>
                ) : (
                  vendors.map((vendor) => (
                    <button
                      type="button"
                      key={vendor.id}
                      onClick={() => {
                        const initialForm = createEmptyForm();
                        setForm(getFormFromVendor(vendor, initialForm));
                        setModalMode("create");
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-foreground/[0.03] border border-transparent hover:border-card-border/60 transition-all duration-300 group/vendor text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img className="size-9 rounded-xl object-cover border border-card-border shadow-3xs group-hover/vendor:scale-105 transition-transform duration-300" alt={vendor.name} src={vendor.avatar || createAvatar(vendor.name)} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-foreground truncate group-hover/vendor:text-accent transition-colors">{vendor.name}</p>
                          <p className="text-[11px] text-muted truncate mt-0.5">{vendor.company || "Individual"}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Main Creation & Editing Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 border-b border-card-border pb-4">
              <AnimatedText
                as="h2"
                text={modalTitle}
                effect="fade-through"
                className="text-xl font-bold text-foreground font-display"
                replayKey={modalTitle}
              />
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-colors">
                <span className="material-symbols-outlined text-[20px] text-muted">close</span>
              </button>
            </div>

            {isFormMode ? (
              <form onSubmit={handleSubmit} className="space-y-6">
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
                        className={`surface-card p-4 text-left rounded-2xl border transition-all ${
                          isSelected ? "border-accent/60 bg-accent/[0.02] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_12%,transparent)]" : "hover:border-foreground/15"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>
                            <span className="block text-[13px] font-bold text-foreground">{template.name}</span>
                            <span className="block mt-1 text-[11px] text-muted leading-relaxed">{template.description}</span>
                          </span>
                          <span className={`size-7 rounded-xl flex items-center justify-center ${isSelected ? "bg-action text-action-text" : "border border-card-border text-transparent"}`}>
                            <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="surface-card p-5 border border-card-border rounded-3xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border/60 pb-4">
                    <div>
                      <p className="text-[11px] font-bold text-muted tracking-wider uppercase">Vendor Mode</p>
                      <p className="text-[11px] text-muted mt-0.5">Select a saved vendor or fill out a one-time payee.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-full border border-card-border bg-foreground/[0.03] p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setVendorMode("saved")}
                        disabled={vendors.length === 0}
                        className={`min-h-8 rounded-full px-4 text-[12px] font-bold transition-all active:scale-[0.96] ${
                          form.vendorMode === "saved"
                            ? "bg-action text-action-text shadow-sm"
                            : "text-muted hover:bg-foreground/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
                        }`}
                      >
                        Saved
                      </button>
                      <button
                        type="button"
                        onClick={() => setVendorMode("new")}
                        className={`min-h-8 rounded-full px-4 text-[12px] font-bold transition-all active:scale-[0.96] ${
                          form.vendorMode === "new"
                            ? "bg-action text-action-text shadow-sm"
                            : "text-muted hover:bg-foreground/[0.04]"
                        }`}
                      >
                        New
                      </button>
                    </div>
                  </div>

                  {form.vendorMode === "saved" && vendors.length > 0 ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="saved-vendor">Select Vendor</label>
                        <div className="relative">
                          <select id="saved-vendor" required value={form.vendorId} onChange={(event) => handleVendorSelect(event.target.value)} className="field-control px-3.5 py-2.5 pr-10 text-[13px] bg-background/50 border border-card-border rounded-xl focus:border-accent">
                            {vendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-3 text-muted pointer-events-none text-[18px]">expand_more</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-card-border bg-foreground/[0.02] p-4">
                        {form.avatar ? (
                          <img className="size-11 rounded-xl object-cover border border-card-border shadow-3xs" alt={form.vendor} src={form.avatar} />
                        ) : (
                          <span className="size-11 rounded-xl bg-foreground/[0.04] flex items-center justify-center border border-card-border">
                            <span className="material-symbols-outlined text-[18px] text-muted">engineering</span>
                          </span>
                        )}
                        <div className="min-w-0 text-[12px] text-muted leading-relaxed space-y-0.5">
                          <p className="font-bold text-foreground truncate text-[13px]">{form.vendor}</p>
                          <p className="truncate">{form.email || "No email saved"}</p>
                          <p className="truncate">{form.phone || "No phone saved"}</p>
                          {form.address && <p className="mt-1 whitespace-pre-line border-t border-card-border/40 pt-1 mt-1 text-[11px]">{form.address}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Avatar Upload */}
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl border border-card-border overflow-hidden bg-foreground/[0.03] flex items-center justify-center shrink-0 shadow-3xs">
                          {form.avatar ? (
                            <img className="w-full h-full object-cover" alt="Vendor preview" src={form.avatar} />
                          ) : (
                            <span className="material-symbols-outlined text-foreground/20 text-[20px]">image</span>
                          )}
                        </div>
                        <label className="btn-secondary text-[11px] min-h-8 px-3.5 py-1.5 cursor-pointer rounded-xl font-semibold transition-all">
                          <span>{form.avatar ? "Change Image" : "Add Image"}</span>
                          <input className="sr-only" type="file" accept="image/*" onChange={handleVendorImageChange} />
                        </label>
                      </div>

                      {/* Vendor input fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-vendor-name">Payee Name</label>
                          <input id="outsourcing-vendor-name" required value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} placeholder="Vendor Name" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-vendor-company">Company</label>
                          <input id="outsourcing-vendor-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company Name" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-vendor-email">Email Address</label>
                          <input id="outsourcing-vendor-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="vendor@example.com" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-vendor-phone">Phone Number</label>
                          <input id="outsourcing-vendor-phone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 019-9000" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-address">Vendor Address</label>
                          <textarea id="outsourcing-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Payee billing address" className="field-control min-h-20 px-3.5 py-2.5 resize-none text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dates & Currency overrides */}
                <div className="surface-card p-5 border border-card-border rounded-3xl space-y-4">
                  <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5 pb-2 border-b border-card-border/40">
                    <span className="material-symbols-outlined text-[15px] font-bold">calendar_month</span>
                    Billing Terms & Currencies
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-date">Invoice Date</label>
                      <input id="outsourcing-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border rounded-xl focus:border-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-due-date">Due Date</label>
                      <input id="outsourcing-due-date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border rounded-xl focus:border-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-currency">Currency Override</label>
                      <div className="relative">
                        <select
                          id="outsourcing-currency"
                          value={form.currency}
                          onChange={(e) => setForm({ ...form, currency: e.target.value })}
                          className="field-control px-3.5 py-2.5 pr-10 text-[13px] bg-background/50 border border-card-border rounded-xl focus:border-accent"
                        >
                          <option value="">Default Profile ({currency})</option>
                          {CURRENCIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.code} ({c.symbol})
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 text-muted pointer-events-none text-[18px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Card List */}
                <div className="surface-card border border-card-border rounded-3xl overflow-hidden shadow-3xs">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-card-border bg-foreground/[0.01]">
                    <p className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] font-bold">list_alt</span>
                      Payable Items
                    </p>
                    <button type="button" onClick={() => setForm({ ...form, items: [...form.items, createItem()] })} className="text-accent hover:text-accent-hover hover:bg-accent/10 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase">
                      <span className="material-symbols-outlined text-[15px] font-bold">add</span>
                      Add Item
                    </button>
                  </div>
                  <div className="divide-y divide-card-border bg-background/20">
                    {form.items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_90px_130px_40px] gap-4 p-5 hover:bg-foreground/[0.01] transition-colors">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor={`outsourcing-item-description-${item.id}`}>Work Purchased</label>
                          <input id={`outsourcing-item-description-${item.id}`} required value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Development work, subnetted design..." className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor={`outsourcing-item-quantity-${item.id}`}>Qty</label>
                          <input id={`outsourcing-item-quantity-${item.id}`} type="number" min="0" step="1" value={item.quantity} onChange={(event) => {
                            const cleanVal = event.target.value.replace(/^0+(?=\d)/, '');
                            updateItem(index, { quantity: Number(cleanVal) });
                          }} className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor={`outsourcing-item-price-${item.id}`}>Price</label>
                          <input id={`outsourcing-item-price-${item.id}`} type="number" min="0" step="0.01" value={item.price} onChange={(event) => {
                            const cleanVal = event.target.value.replace(/^0+(?=\d)/, '');
                            updateItem(index, { price: Number(cleanVal) });
                          }} className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="flex md:items-end md:pb-1">
                          <button type="button" onClick={() => removeItem(index)} className="size-9 flex items-center justify-center rounded-xl text-muted hover:text-accent hover:bg-accent/10 transition-colors" aria-label="Remove item">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 px-5 py-4 bg-foreground/[0.02] border-t border-card-border">
                    <span className="text-[11px] font-bold text-muted tracking-wider uppercase">Total Payable</span>
                    <span className="text-2xl font-bold text-foreground font-display"><AnimatedNumber value={formatCurrency(invoiceTotal, currency)} /></span>
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
                  <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 space-y-3">
                    <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-accent">save</span>
                      Save this vendor details?
                    </p>
                    <p className="text-[12px] text-muted leading-relaxed">Regular vendors are stored for reuse in future payables. One-time vendors will remain attached only to this payable invoice.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => void submitOutsourcingInvoice("regular")} className="btn-primary active:scale-[0.97] px-4 py-2 text-xs font-semibold rounded-xl">
                        Save Regular Vendor
                      </button>
                      <button type="button" onClick={() => void submitOutsourcingInvoice("onetime")} className="btn-secondary px-4 py-2 text-xs font-semibold rounded-xl">
                        One-Time Only
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-4 border-t border-card-border/50">
                  <button type="button" onClick={closeModal} className="btn-ghost px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-foreground/[0.04]">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl active:scale-[0.97] shadow-sm shadow-accent/15" disabled={isSaving}>
                    {isSaving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Payable"}
                  </button>
                </div>
              </form>
            ) : selectedInvoice && (
              <div className="space-y-6">
                <div className="surface-card p-6 border border-card-border rounded-3xl space-y-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-card-border/60 pb-5">
                    <div>
                      <p className="text-[10px] font-bold text-muted tracking-wider uppercase">{selectedInvoice.templateName || "Outsourcing Invoice"}</p>
                      <p className="text-3xl font-extrabold text-foreground font-display mt-1">{selectedInvoice.id}</p>
                    </div>
                    <span className={`px-3 py-1.5 text-[10px] font-bold rounded-full tracking-wide uppercase shrink-0 ${
                      getPaymentState(selectedInvoice) === "Paid" ? "bg-positive/10 text-positive" : getPaymentState(selectedInvoice) === "Overdue" ? "bg-negative/10 text-negative" : "bg-foreground/[0.06] text-foreground/60"
                    }`}>
                      {getPaymentState(selectedInvoice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-3 border-b border-card-border/40 pb-1">Pay To</p>
                      <div className="flex items-start gap-3">
                        <img className="size-11 rounded-xl object-cover border border-card-border" alt={selectedInvoice.vendor} src={selectedInvoice.avatar} />
                        <div className="text-[12px] text-muted space-y-0.5 leading-relaxed">
                          <p className="text-[13px] font-bold text-foreground">{selectedInvoice.vendor}</p>
                          <p>{selectedInvoice.email || "No email added"}</p>
                          <p>{selectedInvoice.phone || "No phone added"}</p>
                          {selectedInvoice.address && <p className="text-[11px] whitespace-pre-line mt-1 border-t border-card-border/30 pt-1 text-[11px]">{selectedInvoice.address}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="surface-card p-4 border border-card-border rounded-2xl bg-foreground/[0.01]">
                        <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1">Invoice Date</p>
                        <p className="text-[13px] font-bold text-foreground mt-1">{selectedInvoice.date}</p>
                      </div>
                      <div className="surface-card p-4 border border-card-border rounded-2xl bg-foreground/[0.01]">
                        <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1">Due Date</p>
                        <p className="text-[13px] font-bold text-foreground mt-1">{selectedInvoice.dueDate || "No due date"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-card-border">
                    <div className="grid grid-cols-[1fr_70px_110px] gap-3 bg-foreground/[0.03] px-4 py-2.5 text-[10px] font-bold text-muted tracking-widest uppercase border-b border-card-border">
                      <span>Work Description</span>
                      <span className="text-right">Qty</span>
                      <span className="text-right">Amount</span>
                    </div>
                    <div className="divide-y divide-card-border/60">
                      {(selectedInvoice.items || []).map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_70px_110px] gap-3 px-4 py-3 text-[13px] hover:bg-foreground/[0.01] transition-colors">
                          <span className="font-bold text-foreground">{item.description}</span>
                          <span className="text-right text-muted"><AnimatedNumber value={item.quantity} /></span>
                          <span className="text-right font-extrabold text-foreground"><AnimatedNumber value={formatCurrency(item.quantity * item.price, selectedInvoice.currency || currency)} /></span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-card-border px-4 py-4 bg-foreground/[0.01]">
                      <span className="text-[11px] font-bold text-muted tracking-wider uppercase">Total Payable</span>
                      <span className="text-2xl font-bold text-foreground font-display"><AnimatedNumber value={formatCurrency(getOutsourcingInvoiceTotal(selectedInvoice), selectedInvoice.currency || currency)} /></span>
                    </div>
                  </div>
                </div>

                <PaymentSummary currency={selectedInvoice.currency || currency} record={selectedInvoice} title="Payment Tracking" />

                <div className="flex justify-end gap-2.5 pt-4 border-t border-card-border/50">
                  <button onClick={() => handleExportOutsourcingInvoice(selectedInvoice)} className="btn-secondary px-4 py-2.5 text-xs font-semibold rounded-xl">
                    Download PDF
                  </button>
                  <button onClick={() => openEditModal(selectedInvoice)} className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl active:scale-[0.97] shadow-sm shadow-accent/15">
                    Edit Payable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share / Outsourcing Delivery Link Modal */}
      {shareInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShareInvoice(null)} />
          <div className="modal-surface relative max-w-md w-full p-6 animate-in zoom-in-95 duration-200 rounded-3xl">
            <div className="flex items-center justify-between mb-4 border-b border-card-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 font-display">
                <span className="material-symbols-outlined text-[18px] text-accent font-bold">send</span>
                Send Payable & Share
              </h3>
              <button onClick={() => setShareInvoice(null)} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-colors">
                <span className="material-symbols-outlined text-[16px] text-muted">close</span>
              </button>
            </div>
            
            <p className="text-[12px] text-muted mb-5 leading-relaxed">
              Update the workflow status of this outsourcing invoice or share detail communications with **{shareInvoice.vendor}**.
            </p>

            <div className="space-y-4">
              {/* Status workflow */}
              <div className="surface-card p-4 border border-card-border rounded-2xl space-y-3 bg-foreground/[0.01]">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Workflow Progress</span>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => { void updateOutsourcingWorkflowStatus(shareInvoice, "Sent"); setShareInvoice(null); }}
                    className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-xl ${shareInvoice.workflowStatus === "Sent" ? "bg-accent/15 text-accent border-accent/20 font-bold shadow-2xs" : ""}`}
                  >
                    Mark as Sent
                  </button>
                  <button 
                    onClick={() => { void updateOutsourcingWorkflowStatus(shareInvoice, "Work Confirmed"); setShareInvoice(null); }}
                    className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-xl ${shareInvoice.workflowStatus === "Work Confirmed" ? "bg-accent/15 text-accent border-accent/20 font-bold shadow-2xs" : ""}`}
                  >
                    Confirm Work
                  </button>
                  <button 
                    onClick={() => { void updateOutsourcingWorkflowStatus(shareInvoice, "Delivered"); setShareInvoice(null); }}
                    className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-xl ${shareInvoice.workflowStatus === "Delivered" ? "bg-accent/15 text-accent border-accent/20 font-bold shadow-2xs" : ""}`}
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>

              {/* Share Channels */}
              <div className="surface-card p-4 border border-card-border rounded-2xl space-y-3 bg-foreground/[0.01]">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Share Channels</span>
                <div className="grid grid-cols-3 gap-2">
                  {shareInvoice.phone ? (
                    <a
                      href={`sms:${shareInvoice.phone}?body=${encodeURIComponent(getOutsourcingContactMessage(shareInvoice))}`}
                      className="btn-secondary text-[11px] py-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 text-blue-500 hover:bg-blue-500/5 transition-colors border-card-border shadow-3xs"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">sms</span>
                      <span>Message</span>
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        const msg = getOutsourcingContactMessage(shareInvoice);
                        void navigator.clipboard.writeText(msg);
                        notify.success({ title: "Message copied", description: "Details copied to clipboard." });
                      }}
                      className="btn-secondary text-[11px] py-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 hover:bg-foreground/[0.02] transition-colors border-card-border shadow-3xs"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">content_copy</span>
                      <span>Copy Msg</span>
                    </button>
                  )}

                  {shareInvoice.phone ? (
                    <a
                      href={getWhatsAppUrl(shareInvoice.phone, getOutsourcingContactMessage(shareInvoice))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-[11px] py-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 text-emerald-500 hover:bg-emerald-500/5 transition-colors border-card-border shadow-3xs"
                    >
                      <i className="ph ph-whatsapp text-lg font-bold"></i>
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="btn-secondary text-[11px] py-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 opacity-40 cursor-not-allowed border-card-border shadow-3xs"
                    >
                      <i className="ph ph-whatsapp text-lg font-bold"></i>
                      <span>WhatsApp</span>
                    </button>
                  )}

                  {shareInvoice.email ? (
                    <a
                      href={`mailto:${shareInvoice.email}?subject=${encodeURIComponent("Payable Details: " + shareInvoice.id)}&body=${encodeURIComponent(getOutsourcingContactMessage(shareInvoice))}`}
                      className="btn-secondary text-[11px] py-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 text-sky-500 hover:bg-sky-500/5 transition-colors border-card-border shadow-3xs"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">mail</span>
                      <span>Email</span>
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="btn-secondary text-[11px] py-2.5 rounded-xl text-center flex flex-col items-center justify-center gap-1.5 opacity-40 cursor-not-allowed border-card-border shadow-3xs"
                    >
                      <span className="material-symbols-outlined text-[20px] font-bold">mail</span>
                      <span>Email</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

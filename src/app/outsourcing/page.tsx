/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PaymentSummary, PaymentTrackingForm } from "@/components/payment-tracking";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";

import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getInvoiceItemsTotal,
  getOutsourcingInvoiceTotal,
  getOutsourcingTotals,
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
import { useUserData, type VendorDraft } from "@/hooks/use-user-data";
import { exportVendorStatementPdf } from "@/lib/pdf-export";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useRef } from "react";
import PlusIcon from "@/components/icons/plus-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import CheckedIcon from "@/components/icons/checked-icon";
import ClockIcon from "@/components/icons/clock-icon";
import UsersIcon from "@/components/icons/users-icon";
import PenIcon from "@/components/icons/pen-icon";
import SendIcon from "@/components/icons/send-icon";
import DownloadIcon from "@/components/icons/download-icon";
import TrashIcon from "@/components/icons/trash-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";

const STATUS_FILTERS = ["All", "Paid", "Unpaid"] as const;
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
  paypal: string;
  stripe: string;
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
    paypal: "",
    stripe: "",
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
    paypal: vendor.paypal || "",
    stripe: vendor.stripe || "",
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
    paypal: invoice.paypal || matchingVendor?.paypal || "",
    stripe: invoice.stripe || matchingVendor?.stripe || "",
  };
}

function getOutsourcingPaymentState(invoice: OutsourcingInvoice): "Paid" | "Unpaid" {
  return getBalanceDue(invoice) <= 0 ? "Paid" : "Unpaid";
}

function getVendorPaypalUrl(paypal: string, amount: number) {
  if (!paypal) return "";
  const cleaned = paypal.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  let path = cleaned;
  if (path.startsWith("paypal.me/")) {
    path = path.slice("paypal.me/".length);
  }
  return `https://paypal.me/${path}/${amount.toFixed(2)}`;
}

function getVendorStripeUrl(stripe: string) {
  if (!stripe) return "";
  const cleaned = stripe.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  return `https://${cleaned}`;
}

export default function Outsourcing() {
  const plusIconRef = useRef<AnimatedIconHandle>(null);
  const totalBilledRef = useRef<AnimatedIconHandle>(null);
  const paidIconRef = useRef<AnimatedIconHandle>(null);
  const pendingIconRef = useRef<AnimatedIconHandle>(null);
  const activeVendorsRef = useRef<AnimatedIconHandle>(null);

  const {
    vendors,
    outsourcingInvoices,
    saveVendor,
    saveOutsourcingInvoice,
    exportOutsourcingInvoice,
    activeProfile
  } = useUserData();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<OutsourcingInvoice | null>(null);
  const [shareInvoice, setShareInvoice] = useState<OutsourcingInvoice | null>(null);
  const [form, setForm] = useState<OutsourcingForm>(createEmptyForm);
  const [needsVendorSaveChoice, setNeedsVendorSaveChoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [activeDetailVendor, setActiveDetailVendor] = useState<Vendor | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorDraft>({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: "",
    paypal: "",
    stripe: "",
    avatar: "",
  });

  const vendorInvoices = useMemo(() => {
    if (!activeDetailVendor) return [];
    return outsourcingInvoices.filter(
      (invoice) => invoice.vendorId === activeDetailVendor.id || invoice.vendor === activeDetailVendor.name
    );
  }, [activeDetailVendor, outsourcingInvoices]);

  const vendorTotalPaid = useMemo(() => {
    return vendorInvoices.reduce((sum, invoice) => sum + getAmountPaid(invoice), 0);
  }, [vendorInvoices]);

  const vendorOutstanding = useMemo(() => {
    return vendorInvoices.reduce((sum, invoice) => sum + getBalanceDue(invoice), 0);
  }, [vendorInvoices]);

  function openEditVendor(vendor: Vendor) {
    setEditingVendor(vendor);
    setVendorForm({
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      company: vendor.company || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
      paypal: vendor.paypal || "",
      stripe: vendor.stripe || "",
      avatar: vendor.avatar || "",
    });
  }

  function openShareModal(invoice: OutsourcingInvoice) {
    setShareInvoice(invoice);
    setShowPaymentOptions(false);
  }

  function getWhatsAppUrl(phone: string, message: string) {
    const digits = phone.replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
  }

  function getOutsourcingContactMessage(invoice: OutsourcingInvoice) {
    return `Hi ${invoice.vendor}, here are the details for payable record ${invoice.id}.`;
  }

  async function updateOutsourcingStatus(
    invoice: OutsourcingInvoice, 
    updates: { workflowStatus?: InvoiceWorkflowStatus; status?: InvoiceStatus; amountPaid?: number; paidAt?: string }
  ) {
    const invoiceForm = getOutsourcingForm(invoice, vendors);
    setIsSaving(true);
    try {
      await notifyPromise(saveOutsourcingInvoice({
        ...invoiceForm,
        id: invoice.id,
        vendorId: invoice.vendorId,
        vendor: invoice.vendor,
        status: updates.status ?? invoice.status,
        workflowStatus: updates.workflowStatus ?? invoice.workflowStatus,
        amountPaid: updates.amountPaid !== undefined ? updates.amountPaid : invoice.amountPaid,
        paidAt: updates.paidAt !== undefined ? updates.paidAt : invoice.paidAt,
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
          description: "Saving changes to your outsourcing record.",
        },
        success: {
          title: "Status updated",
          description: `Successfully updated status for ${invoice.id}.`,
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
    const state = getOutsourcingPaymentState(invoice);
    const matchesStatus = activeFilter === "All" || state === activeFilter;
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

  function handleEditVendorImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setVendorForm((currentForm) => ({ ...currentForm, avatar: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!vendorForm.name.trim() || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveVendor(editingVendor ? editingVendor.id : null, vendorForm);
      if (saved) {
        if (activeDetailVendor && activeDetailVendor.id === saved.id) {
          setActiveDetailVendor(saved);
        }
        notify.success({
          title: "Vendor saved",
          description: `${saved.name} details have been updated.`,
        });
      }
      setEditingVendor(null);
    } catch (err) {
      console.error(err);
      notify.error({
        title: "Save failed",
        description: getToastErrorMessage(err, "Unable to save vendor details."),
      });
    } finally {
      setIsSaving(false);
    }
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
        paypal: form.paypal || undefined,
        stripe: form.stripe || undefined,
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
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <AnimatedText as="p" text="Payables" effect="micro-scale-fade" className="section-eyebrow text-xs font-bold uppercase tracking-widest text-accent mb-2" />
            <AnimatedText
              as="h1"
              text="Outsourcing"
              effect="micro-scale-fade"
              className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
              delayMs={70}
            />
            <AnimatedText
              as="p"
              text="Track vendor payables, settle balances, and coordinate outsourced services."
              effect="micro-scale-fade"
              className="text-muted mt-2 text-base font-medium"
              delayMs={140}
            />
          </div>
          <button
            onClick={openCreateModal}
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
            className="flex items-center gap-2 bg-card border border-card-border text-foreground hover:bg-accent hover:text-action-text hover:border-accent px-5 py-2.5 rounded-xl font-medium transition-all shadow-xs hover:shadow-md hover:shadow-accent/20 group active:scale-[0.97]"
          >
            <PlusIcon ref={plusIconRef} size={20} className="transition-transform duration-300" />
            New Payable
          </button>
        </header>

        {/* Overview Stats Bento Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Outsourced */}
          <div 
            onMouseEnter={() => totalBilledRef.current?.startAnimation()}
            onMouseLeave={() => totalBilledRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 animate-in fade-in-50 duration-200 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Total Outsourced</span>
              <WalletIcon ref={totalBilledRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
                <AnimatedNumber value={formatCurrency(totals.totalAmount, currency)} />
              </span>
            </div>
          </div>

          {/* Total Settled */}
          <div 
            onMouseEnter={() => paidIconRef.current?.startAnimation()}
            onMouseLeave={() => paidIconRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 animate-in fade-in-50 duration-200 delay-75 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Total Settled</span>
              <CheckedIcon ref={paidIconRef} size={20} className="text-positive transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
                <AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} />
              </span>
            </div>
          </div>

          {/* Open Vendor Bills */}
          <div 
            onMouseEnter={() => pendingIconRef.current?.startAnimation()}
            onMouseLeave={() => pendingIconRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 animate-in fade-in-50 duration-200 delay-100 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Open Bills</span>
              <ClockIcon ref={pendingIconRef} size={20} className="text-amber-500 transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
                <AnimatedNumber value={formatCurrency(totals.totalAmount - totals.paidAmount, currency)} />
              </span>
            </div>
          </div>

          {/* Active Vendors */}
          <div 
            onMouseEnter={() => activeVendorsRef.current?.startAnimation()}
            onMouseLeave={() => activeVendorsRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 animate-in fade-in-50 duration-200 delay-150 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Active Vendors</span>
              <UsersIcon ref={activeVendorsRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
                  <AnimatedNumber value={vendors.length} />
                </span>
                <span className="text-[11px] font-normal text-muted select-none">saved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main List Column */}
          <div className="space-y-6">
            {/* Search and Filters */}
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

            {/* Payables Cards List */}
            <div className="space-y-3.5">
              {filteredInvoices.map((invoice) => (
                (() => {
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
                      className="bg-card text-card-foreground w-full text-left p-5 rounded-xl border border-card-border hover:shadow-xl hover:border-accent/30 transition-all duration-300 relative group overflow-hidden cursor-pointer"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        {/* Avatar with Status Ring */}
                        <div className={`size-10 rounded-xl overflow-hidden shrink-0 ring-1 ${
                          paymentState === "Paid" ? "ring-positive/30" : "ring-foreground/10"
                        } border border-background shadow-xs flex items-center justify-center font-bold text-xs bg-accent/10 text-accent`}>
                          {invoice.avatar ? (
                            <img className="w-full h-full object-cover rounded-xl" alt={invoice.vendor} src={invoice.avatar} />
                          ) : (
                            (invoice.vendor || "V")[0].toUpperCase()
                          )}
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
                        <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg tracking-wide uppercase shrink-0 ${
                          paymentState === "Paid" ? "bg-positive/10 text-positive border border-positive/20" : "bg-foreground/[0.06] text-foreground/60 border border-foreground/[0.03]"
                        }`}>
                          {paymentState}
                        </span>

                        {/* Hover action toolbar */}
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

                      {/* Mobile summary details */}
                      <div className="flex items-center justify-between mt-3 sm:hidden pt-2 border-t border-card-border/20 text-xs">
                        <p className="font-bold text-foreground">Total: <span className="font-display font-semibold">{formatCurrency(totalAmount, activeInvoiceCurrency)}</span></p>
                        <p className="font-semibold text-muted">Due: <span className="text-negative">{formatCurrency(balanceDue, activeInvoiceCurrency)}</span></p>
                      </div>
                    </div>
                  );
                })()
              ))}

              {filteredInvoices.length === 0 && (
                <div className="text-center py-20 bg-card/40 border border-card-border border-dashed rounded-xl">
                  <i className="ph ph-folder-open text-[48px] text-foreground/15 mb-3 block"></i>
                  <AnimatedText as="p" text="No outsourcing payables found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
                </div>
              )}
            </div>
          </div>

          {/* Saved Vendors Column (Deck style) */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-card-border p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-card-border pb-3 select-none">
                <div className="flex items-center gap-2">
                  <i className="ph ph-users text-lg text-muted-foreground"></i>
                  <h2 className="text-[11.5px] font-bold text-muted tracking-wider uppercase">Saved Vendors ({vendors.length})</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setForm({ ...createEmptyForm(), vendorMode: "new" });
                    setModalMode("create");
                  }} 
                  className="text-[11px] text-accent font-bold hover:text-accent-hover flex items-center gap-1 tracking-wider uppercase hover:underline"
                >
                  <i className="ph ph-plus text-xs"></i> Add
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
                        setActiveDetailVendor(vendor);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-foreground/[0.03] border border-transparent hover:border-card-border/60 transition-all duration-300 group/vendor text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img className="size-9 rounded-lg object-cover border border-card-border shadow-3xs group-hover/vendor:scale-105 transition-transform duration-300" alt={vendor.name} src={vendor.avatar || createAvatar(vendor.name)} />
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
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex items-center justify-between mb-6 border-b border-card-border pb-4">
              <AnimatedText
                as="h2"
                text={modalTitle}
                effect="fade-through"
                className="text-xl font-bold text-foreground font-display"
                replayKey={modalTitle}
              />
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all duration-200 active:scale-95">
                <i className="ph ph-x text-sm"></i>
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
                        className={`bg-card text-card-foreground p-4 text-left rounded-xl border transition-all ${
                          isSelected ? "border-accent/60 bg-accent/[0.02] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_12%,transparent)]" : "hover:border-foreground/15"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span>
                            <span className="block text-[13px] font-bold text-foreground">{template.name}</span>
                            <span className="block mt-1 text-[11px] text-muted leading-relaxed">{template.description}</span>
                          </span>
                          <span className={`size-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-action text-action-text" : "border border-card-border text-transparent"}`}>
                            <i className="ph ph-check text-xs font-bold"></i>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-card text-card-foreground p-5 border border-card-border rounded-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border/60 pb-4">
                    <div>
                      <p className="text-[11px] font-bold text-muted tracking-wider uppercase">Vendor Mode</p>
                      <p className="text-[11px] text-muted mt-0.5">Select a saved vendor or fill out a one-time payee.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-card-border bg-foreground/[0.03] p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setVendorMode("saved")}
                        disabled={vendors.length === 0}
                        className={`min-h-8 rounded-lg px-4 text-[12px] font-medium transition-all active:scale-[0.96] ${
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
                        className={`min-h-8 rounded-lg px-4 text-[12px] font-medium transition-all active:scale-[0.96] ${
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
                          <i className="ph ph-caret-down absolute right-3 top-3.5 text-muted pointer-events-none text-[16px]"></i>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-card-border bg-foreground/[0.02] p-4">
                        {form.avatar ? (
                          <img className="size-11 rounded-lg object-cover border border-card-border shadow-3xs" alt={form.vendor} src={form.avatar} />
                        ) : (
                          <span className="size-11 rounded-lg bg-foreground/[0.04] flex items-center justify-center border border-card-border">
                            <i className="ph ph-wrench text-[18px] text-muted-foreground"></i>
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
                        <div className="size-12 rounded-xl border border-card-border overflow-hidden bg-foreground/[0.03] flex items-center justify-center shrink-0 shadow-3xs">
                          {form.avatar ? (
                            <img className="w-full h-full object-cover rounded-xl" alt="Vendor preview" src={form.avatar} />
                          ) : (
                            <i className="ph ph-image text-foreground/20 text-xl"></i>
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
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-vendor-paypal">PayPal Username / Link</label>
                          <input id="outsourcing-vendor-paypal" value={form.paypal} onChange={(event) => setForm({ ...form, paypal: event.target.value })} placeholder="e.g. paypal.me/username" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="outsourcing-vendor-stripe">Stripe Link</label>
                          <input id="outsourcing-vendor-stripe" value={form.stripe} onChange={(event) => setForm({ ...form, stripe: event.target.value })} placeholder="e.g. buy.stripe.com/abc" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
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
                <div className="bg-card text-card-foreground p-5 border border-card-border rounded-xl space-y-4">
                  <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5 pb-2 border-b border-card-border/40 select-none">
                    <i className="ph ph-calendar text-base text-muted-foreground"></i>
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
                        <i className="ph ph-caret-down absolute right-3 top-3.5 text-muted pointer-events-none text-[16px]"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Card List */}
                <div className="bg-card text-card-foreground border border-card-border rounded-xl overflow-hidden shadow-3xs">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-card-border bg-foreground/[0.01] select-none">
                    <p className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
                      <i className="ph ph-list-bullets text-base text-muted-foreground"></i>
                      Payable Items
                    </p>
                    <button type="button" onClick={() => setForm({ ...form, items: [...form.items, createItem()] })} className="text-accent hover:text-accent-hover hover:bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 transition-all flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase active:scale-[0.97]">
                      <i className="ph ph-plus text-xs"></i>
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
                          <button type="button" onClick={() => removeItem(index)} className="size-9 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all duration-200 active:scale-95" aria-label="Remove item">
                            <i className="ph ph-trash text-sm"></i>
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
                  <div className="rounded-xl border border-accent/25 bg-accent/5 p-5 space-y-3">
                    <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      <i className="ph ph-floppy-disk text-base text-accent"></i>
                      Save this vendor details?
                    </p>
                    <p className="text-[12px] text-muted leading-relaxed">Regular vendors are stored for reuse in future payables. One-time vendors will remain attached only to this payable invoice.</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => void submitOutsourcingInvoice("regular")} className="btn-primary active:scale-[0.97] px-4 py-2 text-xs font-medium rounded-lg">
                        Save Regular Vendor
                      </button>
                      <button type="button" onClick={() => void submitOutsourcingInvoice("onetime")} className="btn-secondary px-4 py-2 text-xs font-medium rounded-lg">
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
                <div className="bg-card text-card-foreground p-6 border border-card-border rounded-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-card-border/60 pb-5">
                    <div>
                      <p className="text-[10px] font-bold text-muted tracking-wider uppercase">{selectedInvoice.templateName || "Outsourcing Invoice"}</p>
                      <p className="text-3xl font-extrabold text-foreground font-display mt-1">{selectedInvoice.id}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg tracking-wide uppercase shrink-0 ${
                      getOutsourcingPaymentState(selectedInvoice) === "Paid" ? "bg-positive/10 text-positive border border-positive/20" : "bg-foreground/[0.06] text-foreground/60 border border-foreground/[0.03]"
                    }`}>
                      {getOutsourcingPaymentState(selectedInvoice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-3 border-b border-card-border/40 pb-1">Pay To</p>
                      <div className="flex items-start gap-3">
                        <div className="size-11 rounded-lg border border-card-border overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs bg-accent/10 text-accent">
                          {selectedInvoice.avatar ? (
                            <img className="w-full h-full object-cover rounded-lg" alt={selectedInvoice.vendor} src={selectedInvoice.avatar} />
                          ) : (
                            (selectedInvoice.vendor || "V")[0].toUpperCase()
                          )}
                        </div>
                        <div className="text-[12px] text-muted space-y-0.5 leading-relaxed">
                          <p className="text-[13px] font-bold text-foreground">{selectedInvoice.vendor}</p>
                          <p>{selectedInvoice.email || "No email added"}</p>
                          <p>{selectedInvoice.phone || "No phone added"}</p>
                          {selectedInvoice.address && <p className="text-[11px] whitespace-pre-line mt-1 border-t border-card-border/30 pt-1 text-[11px]">{selectedInvoice.address}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-card border border-card-border rounded-xl p-4 bg-foreground/[0.01]">
                        <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1">Invoice Date</p>
                        <p className="text-[13px] font-bold text-foreground mt-1">{selectedInvoice.date}</p>
                      </div>
                      <div className="bg-card border border-card-border rounded-xl p-4 bg-foreground/[0.01]">
                        <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1">Due Date</p>
                        <p className="text-[13px] font-bold text-foreground mt-1">{selectedInvoice.dueDate || "No due date"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-card-border">
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

                <PaymentSummary currency={selectedInvoice.currency || currency} record={selectedInvoice} title="Payment Tracking" isOutsourcing />

                <div className="flex justify-end gap-2.5 pt-4 border-t border-card-border/50">
                  <button type="button" onClick={() => handleExportOutsourcingInvoice(selectedInvoice)} className="btn-secondary px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 active:scale-[0.97] transition-all">
                    <i className="ph ph-download text-sm"></i>
                    Download PDF
                  </button>
                  <button type="button" onClick={() => openEditModal(selectedInvoice)} className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl active:scale-[0.97] shadow-sm shadow-accent/15 flex items-center gap-1.5">
                    <i className="ph ph-pencil text-sm"></i>
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
          <div className="modal-surface relative max-w-md w-full p-6 animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex items-center justify-between mb-4 border-b border-card-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 font-display select-none">
                <i className="ph ph-paper-plane-tilt text-lg text-accent"></i>
                Send Payable & Share
              </h3>
              <button onClick={() => setShareInvoice(null)} className="size-8 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all duration-200 active:scale-95">
                <i className="ph ph-x text-sm"></i>
              </button>
            </div>
            
            <p className="text-[12px] text-muted mb-5 leading-relaxed">
              Update the workflow status of this outsourcing invoice or share detail communications with **{shareInvoice.vendor}**.
            </p>

            <div className="space-y-4">
              {/* Status workflow */}
              <div className="bg-card border border-card-border rounded-xl p-4 space-y-3 bg-foreground/[0.01]">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block select-none">Workflow Progress</span>
                
                {showPaymentOptions ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-muted block mb-1 text-center select-none">Choose Payment Method</span>
                    <div className="grid grid-cols-1 gap-2">
                      {shareInvoice.paypal && (
                        <a 
                          href={getVendorPaypalUrl(shareInvoice.paypal, getOutsourcingInvoiceTotal(shareInvoice))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            void updateOutsourcingStatus(shareInvoice, { 
                              status: "Paid", 
                              amountPaid: getOutsourcingInvoiceTotal(shareInvoice), 
                              paidAt: todayInputValue() 
                            });
                            setShareInvoice(null);
                            setShowPaymentOptions(false);
                          }}
                          className="btn-primary bg-[#0070ba] hover:bg-[#003087] text-white text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5"
                        >
                          <i className="ph ph-paypal-logo text-sm"></i>
                          Pay via PayPal
                        </a>
                      )}
                      
                      {shareInvoice.stripe && (
                        <a 
                          href={getVendorStripeUrl(shareInvoice.stripe)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            void updateOutsourcingStatus(shareInvoice, { 
                              status: "Paid", 
                              amountPaid: getOutsourcingInvoiceTotal(shareInvoice), 
                              paidAt: todayInputValue() 
                            });
                            setShareInvoice(null);
                            setShowPaymentOptions(false);
                          }}
                          className="btn-primary bg-[#635bff] hover:bg-[#0a2540] text-white text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5"
                        >
                          <i className="ph ph-credit-card text-sm"></i>
                          Pay via Stripe
                        </a>
                      )}

                      <button 
                        onClick={() => {
                          void updateOutsourcingStatus(shareInvoice, { 
                            status: "Paid", 
                            amountPaid: getOutsourcingInvoiceTotal(shareInvoice), 
                            paidAt: todayInputValue() 
                          });
                          setShareInvoice(null);
                          setShowPaymentOptions(false);
                        }}
                        className="btn-secondary text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-foreground/[0.04] border border-card-border"
                      >
                        <i className="ph ph-check text-sm"></i>
                        Mark Paid Manually
                      </button>

                      <button 
                        type="button"
                        onClick={() => setShowPaymentOptions(false)}
                        className="btn-ghost text-[10px] text-muted py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        const total = getOutsourcingInvoiceTotal(shareInvoice);
                        const hasLinks = Boolean(shareInvoice.paypal || shareInvoice.stripe);
                        if (hasLinks) {
                          setShowPaymentOptions(true);
                        } else {
                          void updateOutsourcingStatus(shareInvoice, { 
                            status: "Paid", 
                            amountPaid: total, 
                            paidAt: todayInputValue() 
                          });
                          setShareInvoice(null);
                        }
                      }}
                      className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-lg flex items-center justify-center gap-1 border border-card-border ${
                        getOutsourcingPaymentState(shareInvoice) === "Paid" 
                          ? "bg-positive/15 text-positive border-positive/20 font-bold shadow-2xs" 
                          : ""
                      }`}
                    >
                      <i className="ph ph-credit-card text-sm"></i>
                      {getOutsourcingPaymentState(shareInvoice) === "Paid" ? "Paid" : "Pay"}
                    </button>
                    
                    <button 
                      onClick={() => { 
                        void updateOutsourcingStatus(shareInvoice, { workflowStatus: "Delivered" }); 
                        setShareInvoice(null); 
                      }}
                      className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-lg flex items-center justify-center gap-1 border border-card-border ${
                        shareInvoice.workflowStatus === "Delivered" 
                          ? "bg-accent/15 text-accent border-accent/20 font-bold shadow-2xs" 
                          : ""
                      }`}
                    >
                      <i className="ph ph-package text-sm"></i>
                      {shareInvoice.workflowStatus === "Delivered" ? "Delivered" : "Mark Delivered"}
                    </button>
                  </div>
                )}
              </div>

              {/* Share Channels */}
              <div className="bg-card border border-card-border rounded-xl p-4 space-y-3 bg-foreground/[0.01]">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block select-none">Share Channels</span>
                <div className="grid grid-cols-3 gap-2">
                  {shareInvoice.phone ? (
                    <a
                      href={`sms:${shareInvoice.phone}?body=${encodeURIComponent(getOutsourcingContactMessage(shareInvoice))}`}
                      className="btn-secondary text-[11px] py-2.5 rounded-lg text-center flex flex-col items-center justify-center gap-1.5 text-blue-500 hover:bg-blue-500/5 transition-colors border border-card-border shadow-3xs"
                    >
                      <i className="ph ph-chats text-lg"></i>
                      <span>Message</span>
                    </a>
                  ) : (
                    <button 
                      onClick={() => {
                        const msg = getOutsourcingContactMessage(shareInvoice);
                        void navigator.clipboard.writeText(msg);
                        notify.success({ title: "Message copied", description: "Details copied to clipboard." });
                      }}
                      className="btn-secondary text-[11px] py-2.5 rounded-lg text-center flex flex-col items-center justify-center gap-1.5 hover:bg-foreground/[0.02] transition-colors border border-card-border shadow-3xs"
                    >
                      <i className="ph ph-copy text-lg"></i>
                      <span>Copy Msg</span>
                    </button>
                  )}

                  {shareInvoice.phone ? (
                    <a
                      href={getWhatsAppUrl(shareInvoice.phone, getOutsourcingContactMessage(shareInvoice))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-[11px] py-2.5 rounded-lg text-center flex flex-col items-center justify-center gap-1.5 text-emerald-500 hover:bg-emerald-500/5 transition-colors border border-card-border shadow-3xs"
                    >
                      <i className="ph ph-whatsapp-logo text-lg font-bold"></i>
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="btn-secondary text-[11px] py-2.5 rounded-lg text-center flex flex-col items-center justify-center gap-1.5 opacity-40 cursor-not-allowed border border-card-border shadow-3xs"
                    >
                      <i className="ph ph-whatsapp-logo text-lg font-bold"></i>
                      <span>WhatsApp</span>
                    </button>
                  )}

                  {shareInvoice.email ? (
                    <a
                      href={`mailto:${shareInvoice.email}?subject=${encodeURIComponent("Payable Details: " + shareInvoice.id)}&body=${encodeURIComponent(getOutsourcingContactMessage(shareInvoice))}`}
                      className="btn-secondary text-[11px] py-2.5 rounded-lg text-center flex flex-col items-center justify-center gap-1.5 text-sky-500 hover:bg-sky-500/5 transition-colors border border-card-border shadow-3xs"
                    >
                      <i className="ph ph-envelope text-lg"></i>
                      <span>Email</span>
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="btn-secondary text-[11px] py-2.5 rounded-lg text-center flex flex-col items-center justify-center gap-1.5 opacity-40 cursor-not-allowed border border-card-border shadow-3xs"
                    >
                      <i className="ph ph-envelope text-lg"></i>
                      <span>Email</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Vendor Details Modal */}
      {activeDetailVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setActiveDetailVendor(null)} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex items-center justify-between mb-6 border-b border-card-border pb-4">
              <div className="flex items-center gap-3">
                <img className="size-11 rounded-lg object-cover border border-card-border shadow-3xs animate-in fade-in-50" alt={activeDetailVendor.name} src={activeDetailVendor.avatar || createAvatar(activeDetailVendor.name)} />
                <div>
                  <h2 className="text-xl font-bold text-foreground font-display leading-tight">{activeDetailVendor.name}</h2>
                  <p className="text-[11px] text-muted">{activeDetailVendor.company || "Individual Vendor"}</p>
                </div>
              </div>
              <button onClick={() => setActiveDetailVendor(null)} className="size-8 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all duration-200 active:scale-95">
                <i className="ph ph-x text-sm"></i>
              </button>
            </div>

            <div className="space-y-6">
              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-card-border p-4 bg-foreground/[0.01]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted select-none">Outstanding</p>
                  <p className={`mt-1 font-display text-lg font-bold ${vendorOutstanding > 0 ? "text-amber-500" : "text-foreground"}`}>
                    <AnimatedNumber value={formatCurrency(vendorOutstanding, currency)} />
                  </p>
                </div>
                <div className="rounded-xl border border-card-border p-4 bg-foreground/[0.01]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted select-none">Total Paid</p>
                  <p className="mt-1 font-display text-lg font-bold text-positive">
                    <AnimatedNumber value={formatCurrency(vendorTotalPaid, currency)} />
                  </p>
                </div>
                <div className="rounded-xl border border-card-border p-4 bg-foreground/[0.01]">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted select-none">Payables Count</p>
                  <p className="mt-1 font-display text-lg font-bold text-foreground">
                    <AnimatedNumber value={vendorInvoices.length} />
                  </p>
                </div>
              </div>

              {/* Vendor Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card text-card-foreground p-5 border border-card-border rounded-xl">
                <div className="space-y-3 text-[12px] text-muted">
                  <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1 border-b border-card-border/40 pb-1 select-none">Contact Info</p>
                  {activeDetailVendor.email && (
                    <p className="flex items-center gap-2">
                      <i className="ph ph-envelope text-base text-muted-foreground/60"></i>
                      <span className="text-foreground">{activeDetailVendor.email}</span>
                    </p>
                  )}
                  {activeDetailVendor.phone && (
                    <p className="flex items-center gap-2">
                      <i className="ph ph-phone text-base text-muted-foreground/60"></i>
                      <span className="text-foreground">{activeDetailVendor.phone}</span>
                    </p>
                  )}
                  {activeDetailVendor.address && (
                    <div className="flex items-start gap-2 pt-1">
                      <i className="ph ph-map-pin text-base text-muted-foreground/60 mt-0.5"></i>
                      <div>
                        <p className="font-semibold text-foreground/75 select-none">Billing Address</p>
                        <p className="mt-0.5 whitespace-pre-line leading-relaxed">{activeDetailVendor.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-[12px] text-muted">
                  <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1 border-b border-card-border/40 pb-1 select-none">Payment & Notes</p>
                  {activeDetailVendor.paypal && (
                    <p className="flex items-center gap-2">
                      <i className="ph ph-paypal-logo text-base text-[#0070ba]"></i>
                      <span className="font-semibold text-foreground select-none">PayPal:</span>
                      <span className="text-foreground">{activeDetailVendor.paypal}</span>
                    </p>
                  )}
                  {activeDetailVendor.stripe && (
                    <p className="flex items-center gap-2">
                      <i className="ph ph-credit-card text-base text-[#635bff]"></i>
                      <span className="font-semibold text-foreground select-none">Stripe Link:</span>
                      <span className="text-foreground truncate max-w-[200px]">{activeDetailVendor.stripe}</span>
                    </p>
                  )}
                  {activeDetailVendor.notes && (
                    <div className="pt-1">
                      <p className="font-semibold text-foreground/75 select-none">Notes</p>
                      <p className="mt-0.5 whitespace-pre-line leading-relaxed">{activeDetailVendor.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payables Ledger Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-card-border pb-2 select-none">
                  <h3 className="text-xs font-bold text-muted tracking-wider uppercase">Payables Ledger</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void exportVendorStatementPdf(activeDetailVendor, vendorInvoices, activeProfile, currency)}
                      className="btn-secondary min-h-8 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-card-border hover:bg-foreground/[0.04] transition-all duration-200 active:scale-95 flex items-center gap-1"
                    >
                      <i className="ph ph-file-pdf text-sm"></i>
                      Statement PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const initialForm = createEmptyForm();
                        setForm(getFormFromVendor(activeDetailVendor, initialForm));
                        setModalMode("create");
                        setActiveDetailVendor(null);
                      }}
                      className="btn-secondary min-h-8 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-card-border hover:bg-foreground/[0.04] transition-all duration-200 active:scale-95 flex items-center gap-1"
                    >
                      <i className="ph ph-plus text-xs"></i>
                      Create Payable
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-card-border">
                  <div className="grid grid-cols-[1fr_90px_110px_90px] gap-3 bg-foreground/[0.03] px-4 py-2.5 text-[10px] font-bold text-muted tracking-widest uppercase border-b border-card-border select-none">
                    <span>Payable ID</span>
                    <span>Date</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="divide-y divide-card-border/60 max-h-[250px] overflow-y-auto pr-1">
                    {vendorInvoices.length > 0 ? (
                      vendorInvoices.map((invoice) => {
                        const amount = getOutsourcingInvoiceTotal(invoice);
                        const status = getOutsourcingPaymentState(invoice);

                        return (
                          <div
                            key={invoice.id}
                            onClick={() => {
                              setActiveDetailVendor(null);
                              openViewModal(invoice);
                            }}
                            className="grid grid-cols-[1fr_90px_110px_90px] gap-3 px-4 py-3 text-[12px] hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-foreground truncate">{invoice.id}</span>
                            <span className="text-muted font-medium">{invoice.date}</span>
                            <span className="text-right font-extrabold text-foreground">
                              {formatCurrency(amount, invoice.currency || currency)}
                            </span>
                            <span className="text-right">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg tracking-wide uppercase ${
                                status === "Paid" ? "bg-positive/10 text-positive border border-positive/20" : "bg-foreground/[0.06] text-foreground/60 border border-foreground/[0.03]"
                              }`}>
                                {status}
                              </span>
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-8 text-center text-[12px] text-muted">
                        No payables recorded for this vendor yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setActiveDetailVendor(null)}
                  className="btn-ghost px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-foreground/[0.04]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openEditVendor(activeDetailVendor)}
                  className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl active:scale-[0.97] shadow-sm shadow-accent/15 flex items-center gap-1"
                >
                  <i className="ph ph-pencil text-sm"></i>
                  Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Form Modal (Editing Details) */}
      {editingVendor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setEditingVendor(null)} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200 rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <i className="ph ph-users text-lg text-muted-foreground"></i>
                <h2 className="text-lg font-bold text-foreground leading-none font-display">Edit Vendor</h2>
              </div>
              <button onClick={() => setEditingVendor(null)} className="size-8 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all duration-200 active:scale-95">
                <i className="ph ph-x text-sm"></i>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveVendor} className="flex-1 flex flex-col min-h-0 bg-background/35">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Avatar Upload */}
                <div className="bg-card border border-card-border p-4 rounded-xl space-y-4">
                  <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider select-none">Identity Image</h3>
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-xl border border-card-border overflow-hidden bg-foreground/[0.03] flex items-center justify-center shrink-0 shadow-inner relative group">
                      {vendorForm.avatar ? (
                        <img className="w-full h-full object-cover rounded-xl" alt="Vendor preview" src={vendorForm.avatar} />
                      ) : (
                        <i className="ph ph-image text-foreground/20 text-2xl"></i>
                      )}
                    </div>
                    <label className="btn-secondary text-[11px] min-h-8 px-3.5 py-1.5 cursor-pointer rounded-xl font-semibold transition-all">
                      <span>{vendorForm.avatar ? "Change Image" : "Add Image"}</span>
                      <input className="sr-only" type="file" accept="image/*" onChange={handleEditVendorImageChange} />
                    </label>
                  </div>
                </div>

                {/* Profile Information */}
                <div className="bg-card border border-card-border p-4 rounded-xl space-y-4">
                  <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider select-none">Profile Details</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-name">Vendor Name</label>
                      <input id="edit-vendor-name" required value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} placeholder="Vendor Name" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-company">Company</label>
                      <input id="edit-vendor-company" value={vendorForm.company || ""} onChange={(event) => setVendorForm({ ...vendorForm, company: event.target.value })} placeholder="Company Name" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-email">Email Address</label>
                        <input id="edit-vendor-email" type="email" value={vendorForm.email || ""} onChange={(event) => setVendorForm({ ...vendorForm, email: event.target.value })} placeholder="vendor@example.com" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-phone">Phone Number</label>
                        <input id="edit-vendor-phone" type="tel" value={vendorForm.phone || ""} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} placeholder="+1 (555) 019-9000" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-address">Billing Address</label>
                      <textarea id="edit-vendor-address" value={vendorForm.address || ""} onChange={(event) => setVendorForm({ ...vendorForm, address: event.target.value })} placeholder="Vendor address" className="field-control min-h-20 px-3.5 py-2.5 resize-none text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                    </div>
                  </div>
                </div>

                {/* Payments & Notes */}
                <div className="bg-card border border-card-border p-4 rounded-xl space-y-4">
                  <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider select-none">Payments & Notes</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-paypal">PayPal Username / Link</label>
                      <input id="edit-vendor-paypal" value={vendorForm.paypal || ""} onChange={(event) => setVendorForm({ ...vendorForm, paypal: event.target.value })} placeholder="e.g. paypal.me/username" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-stripe">Stripe Link</label>
                      <input id="edit-vendor-stripe" value={vendorForm.stripe || ""} onChange={(event) => setVendorForm({ ...vendorForm, stripe: event.target.value })} placeholder="e.g. buy.stripe.com/abc" className="field-control px-3.5 py-2.5 text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted tracking-wider uppercase" htmlFor="edit-vendor-notes">Internal Notes</label>
                      <textarea id="edit-vendor-notes" value={vendorForm.notes || ""} onChange={(event) => setVendorForm({ ...vendorForm, notes: event.target.value })} placeholder="Notes about payment terms, rates or credentials..." className="field-control min-h-20 px-3.5 py-2.5 resize-none text-[13px] bg-background/50 border border-card-border focus:border-accent rounded-xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-card-border bg-card shrink-0">
                <button type="button" onClick={() => setEditingVendor(null)} className="btn-ghost px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-foreground/[0.04]">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-5 py-2.5 text-xs font-semibold rounded-xl active:scale-[0.97] shadow-sm shadow-accent/15" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PayableFormModal } from "./components/PayableFormModal";
import { PayableList } from "./components/PayableList";
import { ModalOverlay } from "@/components/workspace-form-modal";
import { PaymentSummary, PaymentTrackingForm } from "@/components/payment-tracking";
import { PhoneInput } from "@/components/phone-input";

import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getInvoiceItemsTotal,
  getOutsourcingInvoiceTotal,
  getOutsourcingTotals,
  type InvoiceItem,
  type InvoiceWorkflowStatus,
  type OutsourcingInvoice,
  type PaymentRecord,
  type Vendor,
  CURRENCIES,
  createAvatar,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData, type VendorDraft } from "@/hooks/use-user-data";
import { exportVendorStatementPdf } from "@/lib/pdf-export";
import {
  downloadOutsourcingPdfWithMessage,
  openShareChannelNow,
  shareOutsourcingPdf,
  type ShareChannel,
} from "@/lib/share-billable-pdf";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
import { SHARE_CHANNEL_ICONS, ShareChannelIcon } from "@/components/brand-icons/share-channel-icons";
import { ShareWhatsAppButton } from "@/components/share-whatsapp-button";
import type { WhatsAppTarget } from "@/lib/whatsapp-phone";
import PlusIcon from "@/components/icons/plus-icon";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import RosetteDiscountCheckIcon from "@/components/icons/rosette-discount-check-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import TriangleAlertIcon from "@/components/icons/triangle-alert-icon";
import { PageStatsRow } from "@/components/page-stats-row";
import { Reveal } from "@/components/reveal";
import PenIcon from "@/components/icons/pen-icon";
import DownloadIcon from "@/components/icons/download-icon";
import { Users, Plus } from "lucide-react";
import type { AnimatedIconHandle } from "@/components/icons/types";
import {
  STATUS_FILTERS,
  TEMPLATES,
  createEmptyForm,
  createItem,
  getFormFromVendor,
  getOutsourcingForm,
  getOutsourcingPaymentState,
  getVendorPaypalUrl,
  getVendorStripeUrl,
  todayInputValue,
  type ModalMode,
  type OutsourcingForm,
  type SaveVendorMode,
  type VendorMode,
} from "./outsourcing-helpers";

export default function Outsourcing() {
  const plusIconRef = useRef<AnimatedIconHandle>(null);
  const totalOutsourcedRef = useRef<AnimatedIconHandle>(null);
  const vendorsIconRef = useRef<AnimatedIconHandle>(null);
  const settledIconRef = useRef<AnimatedIconHandle>(null);
  const openBillsIconRef = useRef<AnimatedIconHandle>(null);

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
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [sharingChannel, setSharingChannel] = useState<ShareChannel | null>(null);
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

  function getOutsourcingContactMessage(invoice: OutsourcingInvoice) {
    return `Hi ${invoice.vendor}, here are the details for payable record ${invoice.id}.`;
  }

  async function handleShareOutsourcing(channel: ShareChannel, invoice: OutsourcingInvoice) {
    setSharingChannel(channel);

    try {
      const message = getOutsourcingContactMessage(invoice);
      await shareOutsourcingPdf(channel, invoice, activeProfile, currency, message);
    } catch (error) {
      notify.error({
        title: "Could not share payable",
        description: getToastErrorMessage(error),
      });
    } finally {
      setSharingChannel(null);
    }
  }

  function beginOutsourcingShare(channel: ShareChannel, invoice: OutsourcingInvoice, whatsappTarget?: WhatsAppTarget) {
    openShareChannelNow(channel, {
      message: getOutsourcingContactMessage(invoice),
      phone: invoice.phone,
      profilePhone: activeProfile?.phone,
      email: invoice.email,
      subject: `Payable Details: ${invoice.id}`,
      whatsappTarget,
    });
    void handleShareOutsourcing(channel, invoice);
  }

  function beginOutsourcingWhatsAppShare(invoice: OutsourcingInvoice, target: WhatsAppTarget) {
    beginOutsourcingShare("whatsapp", invoice, target);
  }

  async function handleDownloadOutsourcingPdf(invoice: OutsourcingInvoice) {
    setSharingChannel("message");

    try {
      await downloadOutsourcingPdfWithMessage(
        invoice,
        activeProfile,
        currency,
        getOutsourcingContactMessage(invoice),
      );
    } catch (error) {
      notify.error({
        title: "Could not prepare payable",
        description: getToastErrorMessage(error),
      });
    } finally {
      setSharingChannel(null);
    }
  }

  async function updateOutsourcingStatus(
    invoice: OutsourcingInvoice, 
    updates: {
      workflowStatus?: InvoiceWorkflowStatus;
      status?: OutsourcingInvoice["status"];
      amountPaid?: number;
      paidAt?: string;
      payments?: PaymentRecord[];
    }
  ) {
    if (isSaving) {
      return;
    }

    const invoiceForm = getOutsourcingForm(invoice, vendors);
    setIsSaving(true);
    try {
      const savedInvoice = await notifyPromise(saveOutsourcingInvoice({
        ...invoiceForm,
        id: invoice.id,
        vendorId: invoice.vendorId,
        vendor: invoice.vendor,
        status: updates.status ?? invoice.status,
        workflowStatus: updates.workflowStatus ?? invoice.workflowStatus,
        amountPaid: updates.amountPaid !== undefined ? updates.amountPaid : invoice.amountPaid,
        paidAt: updates.paidAt !== undefined ? updates.paidAt : invoice.paidAt,
        payments: updates.payments ?? invoiceForm.payments,
        saveVendorMode: "onetime",
        templateName: invoice.templateName || TEMPLATES.find(t => t.id === (invoice.templateId || invoiceForm.templateId))?.name || TEMPLATES[0].name,
      }).then((result) => {
        if (!result) {
          throw new Error("Create a profile before updating status.");
        }
        return result;
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

      setShareInvoice((current) => (current?.id === savedInvoice.id ? savedInvoice : current));
      setShowPaymentOptions(false);
    } catch (saveError) {
      console.error(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!shareInvoice) {
      return;
    }

    const freshInvoice = outsourcingInvoices.find((entry) => entry.id === shareInvoice.id);
    if (freshInvoice) {
      setShareInvoice(freshInvoice);
    }
  }, [outsourcingInvoices, shareInvoice?.id]);

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
    setIsTemplateDropdownOpen(false);
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
        <Reveal phase="header" className="mb-10">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <AnimatedText as="p" text={PAGE_EYEBROWS["/outsourcing"]} effect="micro-scale-fade" className="section-eyebrow" />
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
        </Reveal>

        <PageStatsRow
          stats={[
            {
              label: "Total Outsourced",
              hint: "all-time",
              icon: FileDescriptionIcon,
              iconRef: totalOutsourcedRef,
              value: <AnimatedNumber value={formatCurrency(totals.totalAmount, currency)} />,
            },
            {
              label: "Active Vendors",
              hint: "saved",
              icon: RosetteDiscountCheckIcon,
              iconRef: vendorsIconRef,
              value: <AnimatedNumber value={vendors.length} />,
            },
            {
              label: "Total Settled",
              hint: `${totals.paidCount} paid`,
              tone: "positive",
              icon: WalletIcon,
              iconRef: settledIconRef,
              value: <AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} />,
            },
            {
              label: "Open Bills",
              hint: "pending",
              tone: "warning",
              icon: TriangleAlertIcon,
              iconRef: openBillsIconRef,
              value: <AnimatedNumber value={formatCurrency(totals.totalAmount - totals.paidAmount, currency)} />,
            },
          ]}
        />

        {/* Two Column Content Area */}
        <Reveal phase="section" className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main List Column */}
          <div className="space-y-6">
            <PayableList
              filteredInvoices={filteredInvoices}
              currency={currency}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              openEditModal={openEditModal}
              openShareModal={openShareModal}
              handleExportOutsourcingInvoice={handleExportOutsourcingInvoice}
            />
          </div>

          {/* Saved Vendors Column (Deck style) */}
          <div className="space-y-4">
            <div className="surface-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-card-border pb-3 select-none">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="text-[11.5px] font-bold text-muted tracking-wider uppercase">Saved Vendors ({vendors.length})</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setForm({ ...createEmptyForm(), vendorMode: "new" });
                    setModalMode("create");
                  }} 
                  className="text-[11px] text-accent font-bold hover:text-accent-hover flex items-center gap-1 tracking-wider uppercase hover:underline cursor-pointer"
                >
                  <Plus className="size-3" /> Add
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
        </Reveal>
      </main>

      {isFormMode && (
        <ModalOverlay onClose={closeModal}>
          <PayableFormModal
            modalMode={modalMode === "edit" ? "edit" : "create"}
            form={form}
            setForm={setForm}
            vendors={vendors}
            currency={currency}
            isSaving={isSaving}
            needsVendorSaveChoice={needsVendorSaveChoice}
            TEMPLATES={TEMPLATES}
            selectedTemplate={selectedTemplate}
            isTemplateDropdownOpen={isTemplateDropdownOpen}
            setIsTemplateDropdownOpen={setIsTemplateDropdownOpen}
            closeModal={closeModal}
            submitOutsourcingInvoice={submitOutsourcingInvoice}
            setVendorMode={setVendorMode}
            handleVendorSelect={handleVendorSelect}
            handleVendorImageChange={handleVendorImageChange}
            updateItem={updateItem}
            removeItem={removeItem}
            invoiceTotal={invoiceTotal}
            createItem={createItem}
            profilePhone={activeProfile?.phone}
          />
        </ModalOverlay>
      )}

      {modalMode === "view" && selectedInvoice && (
        <ModalOverlay onClose={closeModal}>
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card/95 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <AnimatedText
                    as="h2"
                    text={selectedInvoice.id}
                    effect="fade-through"
                    className="text-lg font-bold text-foreground leading-none font-display"
                    replayKey={selectedInvoice.id}
                  />
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mt-1.5">
                    Payable Preview
                  </p>
                </div>
                <span className="ml-2 px-2 py-0.5 text-[9px] font-bold rounded bg-foreground/[0.04] border border-card-border text-muted uppercase tracking-wider">
                  {getOutsourcingPaymentState(selectedInvoice)}
                </span>
              </div>
              <button type="button" onClick={closeModal} className="size-8 flex items-center justify-center rounded-full border border-card-border/40 bg-foreground/[0.02] text-muted hover:text-foreground hover:bg-foreground/[0.06] hover:border-card-border/80 active:scale-95 transition-[transform,background-color,border-color,color] duration-200 ease-out group" aria-label="Close modal">
                <span className="material-symbols-outlined text-[16px] group-hover:rotate-90 transition-transform duration-300">close</span>
              </button>
            </div>
                <div className="flex-1 flex flex-col min-h-0 bg-background/20 overflow-hidden">
                  {/* Scrollable Center View Content */}
                  <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
                      
                      {/* Left Part: Line Items & Payments */}
                      <div className="space-y-6">
                        {/* Table Items Card */}
                        <div className="overflow-hidden rounded-xl border border-card-border bg-card shadow-xs">
                          <div className="grid grid-cols-[1fr_70px_110px] gap-3 bg-foreground/[0.02] px-4.5 py-3 text-[9px] font-bold text-muted tracking-widest uppercase border-b border-card-border select-none">
                            <span>Work Description</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Amount</span>
                          </div>
                          <div className="divide-y divide-card-border/50">
                            {(selectedInvoice.items || []).map((item) => (
                              <div key={item.id} className="grid grid-cols-[1fr_70px_110px] gap-3 px-4.5 py-3 text-[12.5px] hover:bg-foreground/[0.01] transition-colors items-center">
                                <span className="font-bold text-foreground leading-normal">{item.description}</span>
                                <span className="text-right text-muted font-mono"><AnimatedNumber value={item.quantity} /></span>
                                <span className="text-right font-extrabold text-foreground font-mono"><AnimatedNumber value={formatCurrency(item.quantity * item.price, selectedInvoice.currency || currency)} /></span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between border-t border-card-border px-4.5 py-4 bg-foreground/[0.01]">
                            <span className="text-[9px] font-bold text-muted tracking-widest uppercase">Total Payable</span>
                            <span className="text-xl font-bold text-foreground font-display font-mono"><AnimatedNumber value={formatCurrency(getOutsourcingInvoiceTotal(selectedInvoice), selectedInvoice.currency || currency)} /></span>
                          </div>
                        </div>

                        <PaymentSummary currency={selectedInvoice.currency || currency} record={selectedInvoice} title="Payment Audits" isOutsourcing />
                      </div>

                      {/* Right Part: Vendor & Terms Sidebar */}
                      <div className="space-y-5">
                        {/* Payee Vendor Card */}
                        <div className="bg-card border border-card-border rounded-xl p-5 shadow-xs space-y-4">
                          <p className="text-[9px] font-bold text-muted tracking-widest uppercase border-b border-card-border/40 pb-1 select-none">Pay To Details</p>
                          <div className="flex flex-col items-center text-center pb-2">
                            {selectedInvoice.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img className="size-14 rounded-xl object-cover border border-card-border shadow-sm mb-3" alt={selectedInvoice.vendor} src={selectedInvoice.avatar} />
                            ) : (
                              <div className="size-14 rounded-xl border border-card-border shrink-0 flex items-center justify-center font-bold text-lg bg-accent/15 text-accent mb-3 shadow-inner">
                                {(selectedInvoice.vendor || "V")[0].toUpperCase()}
                              </div>
                            )}
                            <p className="text-[13.5px] font-bold text-foreground leading-tight truncate w-full">{selectedInvoice.vendor}</p>
                            {selectedInvoice.company && (
                              <p className="text-[10px] text-muted mt-0.5 font-medium truncate w-full">{selectedInvoice.company}</p>
                            )}
                          </div>
                          
                          <div className="text-[11.5px] text-muted space-y-2 leading-relaxed border-t border-card-border/40 pt-3">
                            {selectedInvoice.email && (
                              <p className="truncate flex items-center gap-1.5"><i className="ph ph-envelope text-[13px] text-muted/65"></i>{selectedInvoice.email}</p>
                            )}
                            {selectedInvoice.phone && (
                              <p className="truncate flex items-center gap-1.5"><i className="ph ph-phone text-[13px] text-muted/65"></i>{selectedInvoice.phone}</p>
                            )}
                            {selectedInvoice.paypal && (
                              <p className="truncate flex items-center gap-1.5 text-accent"><i className="ph ph-paypal-logo text-[13px]"></i>{selectedInvoice.paypal}</p>
                            )}
                            {selectedInvoice.address && (
                              <div className="border-t border-card-border/30 pt-2 mt-2">
                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1">Billing Address</span>
                                <p className="text-[11px] whitespace-pre-line leading-normal">{selectedInvoice.address}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dates Terms card */}
                        <div className="bg-card border border-card-border rounded-xl p-4.5 shadow-xs space-y-3.5 text-[12px]">
                          <p className="text-[9px] font-bold text-muted tracking-widest uppercase border-b border-card-border/40 pb-1 select-none">Invoice Schedule</p>
                          <div className="flex items-center justify-between">
                            <span className="text-muted font-medium flex items-center gap-1.5"><i className="ph ph-calendar text-[14px]"></i>Invoice Date</span>
                            <span className="font-bold text-foreground font-mono">{selectedInvoice.date}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted font-medium flex items-center gap-1.5"><i className="ph ph-clock text-[14px]"></i>Due Date</span>
                            <span className="font-bold text-foreground font-mono">{selectedInvoice.dueDate || "None"}</span>
                          </div>
                          {selectedInvoice.currency && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted font-medium flex items-center gap-1.5"><i className="ph ph-currency-dollar text-[14px]"></i>Currency Override</span>
                              <span className="font-bold text-foreground uppercase">{selectedInvoice.currency}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
            <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-card-border bg-card shrink-0 z-10">
              <button type="button" onClick={() => handleExportOutsourcingInvoice(selectedInvoice)} className="btn-secondary min-h-9 px-4 rounded-xl text-[12px] font-bold flex items-center gap-1.5 active:scale-[0.98]">
                <DownloadIcon size={14} />
                Download PDF
              </button>
              <button type="button" onClick={() => openEditModal(selectedInvoice)} className="btn-primary min-h-9 px-5 rounded-xl text-[12px] font-bold active:scale-[0.98] shadow-md flex items-center gap-1.5">
                <PenIcon size={14} />
                Edit Payable
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}


      {/* Share / Outsourcing Delivery Link Modal */}
      {shareInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => { setShareInvoice(null); setShowPaymentOptions(false); }} />
          <div className="modal-surface relative max-w-md w-full p-6 animate-in zoom-in-95 duration-200 rounded-xl">
            <div className="flex items-center justify-between mb-4 border-b border-card-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 font-display select-none">
                <i className="ph ph-paper-plane-tilt text-lg text-accent"></i>
                Send Payable & Share
              </h3>
              <button onClick={() => { setShareInvoice(null); setShowPaymentOptions(false); }} className="size-8 flex items-center justify-center rounded-lg border border-card-border hover:border-accent/30 hover:bg-foreground/[0.04] text-muted hover:text-foreground transition-all duration-200 active:scale-95">
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
                          }}
                          className="btn-primary bg-[#0070ba] hover:bg-[#003087] text-white text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                          }}
                          className="btn-primary bg-[#635bff] hover:bg-[#0a2540] text-white text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
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
                        }}
                        disabled={isSaving}
                        className="btn-secondary text-[11px] py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-foreground/[0.04] border border-card-border disabled:opacity-50"
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
                        const isPaid = getOutsourcingPaymentState(shareInvoice) === "Paid";
                        if (isPaid) {
                          void updateOutsourcingStatus(shareInvoice, {
                            status: "Unpaid",
                            amountPaid: 0,
                            paidAt: undefined,
                            payments: [],
                          });
                          return;
                        }

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
                        }
                      }}
                      disabled={isSaving}
                      className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-lg flex items-center justify-center gap-1 border border-card-border disabled:opacity-50 ${
                        getOutsourcingPaymentState(shareInvoice) === "Paid" 
                          ? "bg-positive/15 text-positive border-positive/20 font-bold shadow-2xs" 
                          : ""
                      }`}
                    >
                      <i className="ph ph-credit-card text-sm"></i>
                      {getOutsourcingPaymentState(shareInvoice) === "Paid" ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                    
                    <button 
                      onClick={() => { 
                        void updateOutsourcingStatus(shareInvoice, { workflowStatus: "Delivered" }); 
                      }}
                      disabled={isSaving}
                      className={`btn-secondary text-[11px] py-2 transition-all duration-200 rounded-lg flex items-center justify-center gap-1 border border-card-border disabled:opacity-50 ${
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
              <div className="surface-card p-4 border border-card-border rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Share Channels</span>
                <div className="grid grid-cols-3 gap-2">
                  {shareInvoice.phone ? (
                    <button
                      type="button"
                      disabled={sharingChannel !== null}
                      onClick={() => beginOutsourcingShare("message", shareInvoice)}
                      className="btn-secondary text-[11px] py-2 text-center flex flex-col items-center justify-center gap-1.5 hover:bg-foreground/[0.02] transition-colors border-card-border disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ShareChannelIcon src={SHARE_CHANNEL_ICONS.messages} alt="Google Messages" />
                      <span>{sharingChannel === "message" ? "Preparing…" : "Message"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={sharingChannel !== null}
                      onClick={() => { void handleDownloadOutsourcingPdf(shareInvoice); }}
                      className="btn-secondary text-[11px] py-2 text-center flex flex-col items-center justify-center gap-1.5 hover:bg-foreground/[0.02] transition-colors border-card-border disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ShareChannelIcon src={SHARE_CHANNEL_ICONS.messages} alt="Google Messages" />
                      <span>{sharingChannel === "message" ? "Preparing…" : "Download PDF"}</span>
                    </button>
                  )}

                  <ShareWhatsAppButton
                    phone={shareInvoice.phone}
                    profilePhone={activeProfile?.phone}
                    busy={sharingChannel === "whatsapp"}
                    disabled={sharingChannel !== null}
                    onSelectTarget={(target) => beginOutsourcingWhatsAppShare(shareInvoice, target)}
                  />

                  {shareInvoice.email ? (
                    <button
                      type="button"
                      disabled={sharingChannel !== null}
                      onClick={() => beginOutsourcingShare("gmail", shareInvoice)}
                      className="btn-secondary text-[11px] py-2 text-center flex flex-col items-center justify-center gap-1.5 hover:bg-foreground/[0.02] transition-colors border-card-border disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ShareChannelIcon src={SHARE_CHANNEL_ICONS.gmail} alt="Gmail" />
                      <span>{sharingChannel === "gmail" ? "Preparing…" : "Gmail"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="btn-secondary text-[11px] py-2 text-center flex flex-col items-center justify-center gap-1.5 opacity-40 cursor-not-allowed border-card-border"
                    >
                      <ShareChannelIcon src={SHARE_CHANNEL_ICONS.gmail} alt="Gmail" />
                      <span>Gmail</span>
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
              <div className="grid grid-cols-3 gap-3 sm:gap-4 min-w-0">
                <div className="rounded-xl border border-card-border p-3.5 sm:p-4 bg-foreground/[0.01] min-w-0 overflow-hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted select-none truncate" title="Outstanding">Outstanding</p>
                  <p 
                    className={`mt-1 font-display text-base sm:text-lg font-bold currency-value truncate block ${vendorOutstanding > 0 ? "text-chart-strong" : "text-foreground"}`}
                    title={formatCurrency(vendorOutstanding, currency)}
                  >
                    <AnimatedNumber value={formatCurrency(vendorOutstanding, currency)} />
                  </p>
                </div>
                <div className="rounded-xl border border-card-border p-3.5 sm:p-4 bg-foreground/[0.01] min-w-0 overflow-hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted select-none truncate" title="Total Paid">Total Paid</p>
                  <p 
                    className="mt-1 font-display text-base sm:text-lg font-bold text-positive truncate block"
                    title={formatCurrency(vendorTotalPaid, currency)}
                  >
                    <AnimatedNumber value={formatCurrency(vendorTotalPaid, currency)} />
                  </p>
                </div>
                <div className="rounded-xl border border-card-border p-3.5 sm:p-4 bg-foreground/[0.01] min-w-0 overflow-hidden">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted select-none truncate" title="Payables Count">Payables Count</p>
                  <p 
                    className="mt-1 font-display text-base sm:text-lg font-bold text-foreground truncate block"
                    title={String(vendorInvoices.length)}
                  >
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
                        <PhoneInput
                          id="edit-vendor-phone"
                          value={vendorForm.phone || ""}
                          onChange={(phone) => setVendorForm({ ...vendorForm, phone })}
                          hintPhone={activeProfile?.phone || vendorForm.phone}
                          inputClassName="text-[13px] bg-background/50 rounded-xl"
                          selectClassName="text-[12px] bg-background/50 rounded-xl"
                        />
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

"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PaymentSummary, PaymentTrackingForm, createPaymentRecord } from "@/components/payment-tracking";
import {
  formatCurrency,
  getAmountPaid,
  getBalanceDue,
  getInvoiceItemsTotal,
  getInvoiceTotal,
  getInvoiceTotals,
  getPaymentState,
  type Client,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoiceWorkflowStatus,
  type PaymentAttachment,
  type PaymentRecord,
  type UserProfile,
} from "@/data/invoices";
import type { TodoTask } from "@/data/todos";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

const STATUS_FILTERS = ["All", "Paid", "Unpaid", "Overdue"] as const;
const STATUSES: InvoiceStatus[] = ["Paid", "Unpaid", "Overdue"];
const WORKFLOW_STATUSES: InvoiceWorkflowStatus[] = ["Draft", "Sent", "Work Confirmed", "Delivered"];
const JOB_COLORS = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#e11d48", "#0891b2", "#ca8a04", "#4f46e5"];
const TEMPLATES = [
  {
    id: "classic",
    name: "Classic Invoice",
    description: "A clean one-page invoice with profile, client, work, and total.",
  },
] as const;

type ModalMode = "create" | "edit" | "view" | null;
type ClientMode = "saved" | "new";
type SaveClientMode = "regular" | "onetime";

type InvoiceForm = {
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

function createEmptyForm(): InvoiceForm {
  return {
    templateId: TEMPLATES[0].id,
    clientMode: "saved",
    clientId: "",
    client: "",
    email: "",
    phone: "",
    whatsapp: "",
    company: "",
    address: "",
    deliveryLink: "",
    avatar: "",
    date: todayInputValue(),
    dueDate: "",
    status: "Unpaid",
    workflowStatus: "Draft",
    items: [createItem()],
    paymentNotes: "",
    payments: [],
    receiptAttachments: [],
    saveClientMode: null,
  };
}

function toDateInputValue(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function getJobColor(invoiceId: string) {
  const colorIndex = [...invoiceId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % JOB_COLORS.length;
  return JOB_COLORS[colorIndex];
}

function getWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");

  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : "";
}

function getInvoiceContactMessage(invoice: Invoice) {
  return `Hi ${invoice.client}, ${invoice.id} is ready for review.`;
}

function getProfileHourlyRate(profile: UserProfile | null | undefined) {
  const profileWithBilling = profile as (UserProfile & { hourlyRate?: unknown }) | null | undefined;

  return typeof profileWithBilling?.hourlyRate === "number" ? profileWithBilling.hourlyRate : 50;
}

function parseEstimateToHours(estimate?: string): number {
  if (!estimate) return 0;
  const cleaned = estimate.trim().toLowerCase();
  
  const hourMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*h/);
  const minMatch = cleaned.match(/(\d+)\s*m/);
  
  let hours = 0;
  if (hourMatch) {
    hours += parseFloat(hourMatch[1]);
  }
  if (minMatch) {
    hours += parseInt(minMatch[1], 10) / 60;
  }
  
  if (!hourMatch && !minMatch) {
    const rawNumber = parseFloat(cleaned);
    if (!isNaN(rawNumber)) {
      hours = rawNumber;
    }
  }
  
  return Math.round(hours * 100) / 100;
}

function getFormFromClient(client: Client, currentForm: InvoiceForm): InvoiceForm {
  return {
    ...currentForm,
    clientMode: "saved",
    clientId: client.id,
    client: client.name,
    email: client.email,
    phone: client.phone,
    whatsapp: client.whatsapp || "",
    company: client.company || "",
    address: client.address || "",
    deliveryLink: client.deliveryLink || "",
    avatar: client.avatar,
    saveClientMode: null,
  };
}

function getInvoiceForm(invoice: Invoice, clients: Client[]): InvoiceForm {
  const matchingClient = clients.find((client) => client.id === invoice.clientId || client.name === invoice.client);
  const fallbackItems = invoice.items && invoice.items.length > 0
    ? invoice.items
    : [createItem("Invoice total", 1, getInvoiceTotal(invoice))];

  return {
    templateId: invoice.templateId || TEMPLATES[0].id,
    clientMode: matchingClient ? "saved" : "new",
    clientId: matchingClient?.id || "",
    client: invoice.client,
    email: invoice.email,
    phone: invoice.phone,
    whatsapp: invoice.whatsapp || matchingClient?.whatsapp || "",
    company: invoice.company || matchingClient?.company || "",
    address: invoice.address || matchingClient?.address || "",
    deliveryLink: invoice.deliveryLink || matchingClient?.deliveryLink || "",
    avatar: invoice.avatar,
    date: toDateInputValue(invoice.date) || todayInputValue(),
    dueDate: toDateInputValue(invoice.dueDate),
    status: invoice.status,
    workflowStatus: invoice.workflowStatus || "Draft",
    items: fallbackItems,
    paymentNotes: invoice.paymentNotes || "",
    payments: invoice.payments || [],
    receiptAttachments: invoice.receiptAttachments || [],
    saveClientMode: null,
  };
}

export default function Invoices() {
  const { invoices, clientRecords, saveInvoice, exportInvoice } = useInvoices();
  const { activeProfile, todoTasks = [], saveTodoTasks } = useUserData();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(createEmptyForm);
  const [needsClientSaveChoice, setNeedsClientSaveChoice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingTaskInvoice, setPendingTaskInvoice] = useState<Invoice | null>(null);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);

  const [importedTaskIds, setImportedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    setImportedTaskIds([]);
  }, [form.client]);

  const importableTasks = useMemo(() => {
    if (!form.client.trim()) return [];
    const clientQuery = form.client.trim().toLowerCase();
    return todoTasks.filter(task => 
      task.client && 
      task.client.trim().toLowerCase() === clientQuery &&
      task.stage === "done" &&
      !task.tags.includes("Billed")
    );
  }, [todoTasks, form.client]);

  function importTask(task: TodoTask) {
    if (importedTaskIds.includes(task.id)) return;
    
    const parsedHours = parseEstimateToHours(task.estimate);
    const hourlyRate = getProfileHourlyRate(activeProfile);
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      description: task.title + (task.description ? `: ${task.description}` : ""),
      quantity: parsedHours || 1,
      price: hourlyRate,
    };

    setForm((currentForm) => {
      const hasSingleEmptyItem = 
        currentForm.items.length === 1 && 
        !currentForm.items[0].description.trim() && 
        currentForm.items[0].quantity === 1 && 
        currentForm.items[0].price === 0;

      const nextItems = hasSingleEmptyItem
        ? [newItem]
        : [...currentForm.items, newItem];

      return {
        ...currentForm,
        items: nextItems,
      };
    });

    setImportedTaskIds((prev) => [...prev, task.id]);
    notify.success({
      title: "Task imported",
      description: `"${task.title}" was added to line items.`,
    });
  }

  function importAllTasks(tasks: TodoTask[]) {
    const hourlyRate = getProfileHourlyRate(activeProfile);
    const newItems = tasks
      .filter(task => !importedTaskIds.includes(task.id))
      .map(task => {
        const parsedHours = parseEstimateToHours(task.estimate);
        return {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${task.id}`,
          description: task.title + (task.description ? `: ${task.description}` : ""),
          quantity: parsedHours || 1,
          price: hourlyRate,
        };
      });

    if (newItems.length === 0) return;

    setForm((currentForm) => {
      const hasSingleEmptyItem = 
        currentForm.items.length === 1 && 
        !currentForm.items[0].description.trim() && 
        currentForm.items[0].quantity === 1 && 
        currentForm.items[0].price === 0;

      const nextItems = hasSingleEmptyItem
        ? newItems
        : [...currentForm.items, ...newItems];

      return {
        ...currentForm,
        items: nextItems,
      };
    });

    setImportedTaskIds((prev) => [...prev, ...tasks.map(t => t.id)]);
    notify.success({
      title: "All tasks imported",
      description: `${newItems.length} tasks added to line items.`,
    });
  }

  const filteredInvoices = useMemo(() => invoices.filter((invoice) => {
    const normalizedSearch = searchQuery.toLowerCase();
    const matchesStatus = activeFilter === "All" || invoice.status === activeFilter;
    const matchesSearch = searchQuery === "" ||
      invoice.client.toLowerCase().includes(normalizedSearch) ||
      invoice.id.toLowerCase().includes(normalizedSearch) ||
      invoice.email.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  }), [activeFilter, invoices, searchQuery]);

  const totals = getInvoiceTotals(invoices);
  const isFormMode = modalMode === "create" || modalMode === "edit";
  const selectedTemplate = TEMPLATES.find((template) => template.id === form.templateId) || TEMPLATES[0];
  const invoiceTotal = getInvoiceItemsTotal(form.items);
  const modalTitle = modalMode === "create" ? "New Invoice" : modalMode === "edit" ? "Edit Invoice" : selectedInvoice?.id || "Invoice";

  function openCreateModal(prefillClient?: Client) {
    const initialForm = createEmptyForm();
    const firstClient = prefillClient || clientRecords[0];

    setSelectedInvoice(null);
    setNeedsClientSaveChoice(false);
    setForm(firstClient ? getFormFromClient(firstClient, initialForm) : { ...initialForm, clientMode: "new" });
    setModalMode("create");
  }

  useEffect(() => {
    const quickClientId = window.sessionStorage.getItem("billcraft.quick-invoice-client-id");

    if (!quickClientId || clientRecords.length === 0 || modalMode) {
      return;
    }

    const quickClient = clientRecords.find((client) => client.id === quickClientId);

    if (!quickClient) {
      window.sessionStorage.removeItem("billcraft.quick-invoice-client-id");
      return;
    }

    window.sessionStorage.removeItem("billcraft.quick-invoice-client-id");
    setSelectedInvoice(null);
    setNeedsClientSaveChoice(false);
    setForm(getFormFromClient(quickClient, createEmptyForm()));
    setModalMode("create");
  }, [clientRecords, modalMode]);

  function openEditModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setNeedsClientSaveChoice(false);
    setForm(getInvoiceForm(invoice, clientRecords));
    setModalMode("edit");
  }

  function openViewModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setNeedsClientSaveChoice(false);
    setForm(getInvoiceForm(invoice, clientRecords));
    setModalMode("view");
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setModalMode(null);
    setSelectedInvoice(null);
    setNeedsClientSaveChoice(false);
    setForm(createEmptyForm());
  }

  function setClientMode(clientMode: ClientMode) {
    setNeedsClientSaveChoice(false);

    if (clientMode === "saved") {
      const firstClient = clientRecords[0];
      setForm((currentForm) => firstClient ? getFormFromClient(firstClient, currentForm) : { ...currentForm, clientMode: "saved" });
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      clientMode: "new",
      clientId: "",
      client: "",
      email: "",
      phone: "",
      whatsapp: "",
      company: "",
      address: "",
      deliveryLink: "",
      avatar: "",
      saveClientMode: null,
    }));
  }

  function handleClientSelect(clientId: string) {
    const client = clientRecords.find((currentClient) => currentClient.id === clientId);

    if (!client) {
      setForm((currentForm) => ({ ...currentForm, clientId, client: "" }));
      return;
    }

    setForm((currentForm) => getFormFromClient(client, currentForm));
  }

  function handleClientImageChange(event: ChangeEvent<HTMLInputElement>) {
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

  async function submitInvoice(saveClientMode?: SaveClientMode) {
    const normalizedItems = form.items.filter((item) => item.description.trim() || item.quantity > 0 || item.price > 0);
    const clientName = form.client.trim();

    if (isSaving) {
      return;
    }

    if (!clientName) {
      notify.warning({
        title: "Client required",
        description: "Add a client name before saving this invoice.",
      });
      return;
    }

    if (normalizedItems.length === 0) {
      notify.warning({
        title: "Add work items",
        description: "Include at least one billable item before saving.",
      });
      return;
    }

    if (form.clientMode === "new" && !saveClientMode && !form.saveClientMode) {
      setNeedsClientSaveChoice(true);
      notify.info({
        title: "Save this client?",
        description: "Choose whether this client should be reusable or one-time only.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = modalMode === "edit";
      const paymentTotal = form.payments.reduce((sum, payment) => sum + Math.max(Number(payment.amount) || 0, 0), 0);
      const latestPayment = [...form.payments].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
      const savedInvoice = await notifyPromise(saveInvoice({
        id: modalMode === "edit" ? selectedInvoice?.id : undefined,
        clientId: form.clientMode === "saved" ? form.clientId : undefined,
        client: clientName,
        email: form.email,
        phone: form.phone,
        whatsapp: form.whatsapp,
        company: form.company,
        address: form.address,
        deliveryLink: form.deliveryLink,
        avatar: form.avatar,
        date: form.date,
        dueDate: form.dueDate,
        status: form.status,
        workflowStatus: form.workflowStatus,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        items: normalizedItems,
        amountPaid: form.payments.length > 0 ? paymentTotal : form.status === "Paid" ? invoiceTotal : 0,
        paidAt: latestPayment?.paidAt || (form.status === "Paid" ? form.date : undefined),
        paymentMethod: latestPayment?.method,
        paymentNotes: form.paymentNotes,
        receiptAttachments: form.receiptAttachments,
        payments: form.payments,
        saveClientMode: form.clientMode === "new" ? saveClientMode || form.saveClientMode || "onetime" : "onetime",
      }).then((savedInvoice) => {
        if (!savedInvoice) {
          throw new Error("Create a profile before saving invoices.");
        }

        return savedInvoice;
      }), {
        loading: {
          title: isEditing ? "Updating invoice..." : "Creating invoice...",
          description: "Saving your local billing record.",
        },
        success: (savedInvoice) => ({
          title: isEditing ? "Invoice updated" : "Invoice created",
          description: `${savedInvoice.id} for ${savedInvoice.client} is saved.`,
        }),
        error: (error) => ({
          title: isEditing ? "Invoice update failed" : "Invoice creation failed",
          description: getToastErrorMessage(error, "Unable to save this invoice."),
        }),
      });

      if (importedTaskIds.length > 0) {
        const nextTasks = todoTasks.map(task => {
          if (importedTaskIds.includes(task.id)) {
            const tags = task.tags || [];
            if (!tags.includes("Billed")) {
              return {
                ...task,
                tags: [...tags, "Billed"],
                updatedAt: new Date().toISOString(),
              };
            }
          }
          return task;
        });
        await saveTodoTasks(nextTasks);
      }

      setModalMode(null);
      setSelectedInvoice(null);
      setNeedsClientSaveChoice(false);
      setForm(createEmptyForm());
      setImportedTaskIds([]);
      if (!isEditing && savedInvoice.items && savedInvoice.items.length > 0) {
        setPendingTaskInvoice(savedInvoice);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitInvoice();
  }

  function useClientDeliveryLocation() {
    const selectedClient = clientRecords.find((client) => client.id === form.clientId);

    if (!selectedClient?.deliveryLink) {
      return;
    }

    setForm((currentForm) => ({ ...currentForm, deliveryLink: selectedClient.deliveryLink || "" }));
  }

  function useProfileDeliveryLocation() {
    if (!activeProfile?.defaultDeliveryLink) {
      return;
    }

    setForm((currentForm) => ({ ...currentForm, deliveryLink: activeProfile.defaultDeliveryLink || "" }));
  }

  async function createTodoCardsForInvoice(invoice: Invoice) {
    if (isCreatingTasks) {
      return;
    }

    const invoiceItems = invoice.items?.filter((item) => item.description.trim()) || [];

    if (invoiceItems.length === 0) {
      setPendingTaskInvoice(null);
      return;
    }

    const now = new Date().toISOString();
    const jobColor = getJobColor(invoice.id);
    const nextTasks: TodoTask[] = [
      ...invoiceItems.map((item, index): TodoTask => ({
        id: `todo-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        title: item.description.trim(),
        description: `${invoice.id} · ${formatCurrency(item.quantity * item.price, currency)}`,
        client: invoice.client,
        clientId: invoice.clientId,
        clientEmail: invoice.email,
        clientPhone: invoice.phone,
        clientWhatsapp: invoice.whatsapp,
        invoiceId: invoice.id,
        jobColor,
        deliveryLink: invoice.deliveryLink,
        dueDate: toDateInputValue(invoice.dueDate) || undefined,
        estimate: item.quantity > 1 ? `${item.quantity} units` : undefined,
        stage: "backlog",
        priority: "Medium",
        tags: ["Invoice", invoice.id],
        order: index,
        createdAt: now,
        updatedAt: now,
      })),
      ...todoTasks.map((task) => task.stage === "backlog" ? { ...task, order: task.order + invoiceItems.length } : task),
    ];

    setIsCreatingTasks(true);

    try {
      await notifyPromise(saveTodoTasks(nextTasks), {
        loading: {
          title: "Creating task cards...",
          description: "Adding this invoice work to the To-Do board.",
        },
        success: {
          title: "Tasks added",
          description: `${invoiceItems.length} card${invoiceItems.length === 1 ? "" : "s"} created for ${invoice.id}.`,
        },
        error: (error) => ({
          title: "Task creation failed",
          description: getToastErrorMessage(error, "Unable to add these cards."),
        }),
      });
      setPendingTaskInvoice(null);
    } finally {
      setIsCreatingTasks(false);
    }
  }

  async function updateInvoiceWorkflowStatus(invoice: Invoice, workflowStatus: InvoiceWorkflowStatus) {
    const invoiceForm = getInvoiceForm(invoice, clientRecords);

    setIsSaving(true);

    try {
      const updatedInvoice = await notifyPromise(saveInvoice({
        ...invoiceForm,
        id: invoice.id,
        clientId: invoice.clientId,
        client: invoice.client,
        workflowStatus,
        templateName: invoice.templateName || TEMPLATES[0].name,
        saveClientMode: "onetime",
      }).then((savedInvoice) => {
        if (!savedInvoice) {
          throw new Error("Create a profile before updating invoices.");
        }

        return savedInvoice;
      }), {
        loading: {
          title: "Updating work status...",
          description: `${invoice.id} is being updated.`,
        },
        success: {
          title: "Work status updated",
          description: `${invoice.id} is now ${workflowStatus.toLowerCase()}.`,
        },
        error: (error) => ({
          title: "Status update failed",
          description: getToastErrorMessage(error, "Unable to update this invoice."),
        }),
      });

      setSelectedInvoice(updatedInvoice);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExportInvoice(invoice: Invoice) {
    try {
      await exportInvoice(invoice);
      notify.success({
        title: "Download started",
        description: `${invoice.id} was exported as a PDF.`,
      });
    } catch (error) {
      notify.error({
        title: "Download failed",
        description: getToastErrorMessage(error, "Unable to export this invoice."),
      });
    }
  }

  return (
    <>
      <main className="app-main flex-1">
        <div className="page-heading">
          <div>
            <AnimatedText as="p" text="Billing" effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Invoices"
              effect="micro-scale-fade"
              className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
              delayMs={70}
            />
          </div>
          <button onClick={() => openCreateModal()} className="btn-primary active:scale-[0.97]">
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Invoice
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="surface-featured p-4 relative overflow-hidden">
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Billed</p>
            <p className="text-xl font-semibold text-[var(--featured-text)] font-display"><AnimatedNumber value={formatCurrency(totals.totalAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Total</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={invoices.length} /> <span className="text-[12px] font-normal text-[var(--muted)]">invoices</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Collected</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Attention</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={totals.unpaidCount + totals.overdueCount} /> <span className="text-[12px] font-normal text-[var(--accent)]">pending</span></p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="search-field" data-expanded={searchQuery.length > 0}>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search invoices..."
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
                  <img className="w-full h-full object-cover" alt={invoice.client} src={invoice.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[14px] text-[var(--foreground)] group-hover:text-[var(--accent)] transition-smooth truncate">{invoice.client}</h3>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
                    <span className="font-medium">{invoice.id}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[var(--foreground)]/15" />
                    {invoice.date}
                    <span className="hidden sm:inline w-0.5 h-0.5 rounded-full bg-[var(--foreground)]/15" />
                    <span className="hidden sm:inline">{invoice.templateName || "Classic Invoice"}</span>
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                  <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase mt-0.5">
                    <AnimatedNumber value={formatCurrency(getAmountPaid(invoice), currency)} /> collected
                  </p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 ${invoice.statusColor}`}>
                  {paymentState}
                </span>
                <span className="hidden md:inline-flex px-2 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 bg-[var(--foreground)]/[0.05] text-[var(--muted)]">
                  {invoice.workflowStatus || "Draft"}
                </span>
                <div className="hidden sm:flex gap-0.5 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <span onClick={(event) => { event.stopPropagation(); openViewModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="View">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); handleExportInvoice(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Export PDF">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 sm:hidden">
                <p className="text-base font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                <p className="text-[11px] font-medium text-[var(--muted)]"><AnimatedNumber value={formatCurrency(balanceDue, currency)} /> due</p>
              </div>
            </button>
              );
            })()
          ))}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">receipt_long</span>
              <AnimatedText as="p" text="No invoices yet" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--card-border)]">
          <p className="text-[11px] text-[var(--muted)] font-medium">Showing <AnimatedNumber value={filteredInvoices.length} /> of <AnimatedNumber value={invoices.length} /> invoices</p>
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
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Client</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Select a saved client or enter a one-time client for this invoice.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-full border border-[var(--card-border)] bg-[var(--foreground)]/[0.04] p-1">
                      <button
                        type="button"
                        onClick={() => setClientMode("saved")}
                        disabled={clientRecords.length === 0}
                        className={`min-h-8 rounded-full px-3 text-[12px] font-semibold transition-smooth ${
                          form.clientMode === "saved"
                            ? "bg-[var(--action)] text-[var(--action-text)]"
                            : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04]"
                        }`}
                      >
                        Saved
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientMode("new")}
                        className={`min-h-8 rounded-full px-3 text-[12px] font-semibold transition-smooth ${
                          form.clientMode === "new"
                            ? "bg-[var(--action)] text-[var(--action-text)]"
                            : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04]"
                        }`}
                      >
                        New
                      </button>
                    </div>
                  </div>

                  {form.clientMode === "saved" && clientRecords.length > 0 ? (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="saved-client">Saved Client</label>
                      <select id="saved-client" required value={form.clientId} onChange={(event) => handleClientSelect(event.target.value)} className="field-control px-3 py-2">
                        {clientRecords.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                      <div className="mt-3 flex items-start gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] p-3">
                        {form.avatar ? (
                          <img className="size-10 rounded-xl object-cover border border-[var(--card-border)]" alt={form.client} src={form.avatar} />
                        ) : (
                          <span className="size-10 rounded-xl bg-[var(--foreground)]/[0.04] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">person</span>
                          </span>
                        )}
                        <div className="min-w-0 text-[12px] text-[var(--muted)]">
                          <p className="font-semibold text-[var(--foreground)] truncate">{form.client}</p>
                          <p className="truncate">{form.email || "No email saved"}</p>
                          <p className="truncate">{form.phone || "No phone saved"}</p>
                          <p className="truncate">{form.whatsapp || "No WhatsApp saved"}</p>
                          {form.deliveryLink && <p className="mt-1 truncate text-[var(--accent)]">{form.deliveryLink}</p>}
                          {form.address && <p className="mt-1 whitespace-pre-line">{form.address}</p>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                          {form.avatar ? (
                            <img className="w-full h-full object-cover" alt="Client preview" src={form.avatar} />
                          ) : (
                            <span className="material-symbols-outlined text-[var(--foreground)]/25">image</span>
                          )}
                        </div>
                        <label className="btn-secondary text-[12px] min-h-8 px-3 py-1.5 cursor-pointer">
                          <span>{form.avatar ? "Change Image" : "Add Image"}</span>
                          <input className="sr-only" type="file" accept="image/*" onChange={handleClientImageChange} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-client">Client Name</label>
                          <input id="invoice-client" required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} placeholder="Client or company name" className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-company">Company</label>
                          <input id="invoice-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" className="field-control px-3 py-2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-email">Email</label>
                          <input id="invoice-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="billing@example.com" className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-phone">Phone</label>
                          <input id="invoice-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 000-0000" className="field-control px-3 py-2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-whatsapp">WhatsApp</label>
                          <input id="invoice-whatsapp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="+1 (555) 000-0000" className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-delivery-link-new">Finished Work Folder</label>
                          <input id="invoice-delivery-link-new" type="url" value={form.deliveryLink} onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })} placeholder="https://drive.google.com/..." className="field-control px-3 py-2" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-address">Address</label>
                        <textarea id="invoice-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Billing address" className="field-control min-h-20 px-3 py-2 resize-none" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="surface-card p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Delivery Location</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Pick where the finished product should be uploaded after the work is done.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={useClientDeliveryLocation} disabled={!clientRecords.find((client) => client.id === form.clientId)?.deliveryLink} className="btn-secondary min-h-8 px-3 py-1.5 text-[11px] disabled:opacity-50">
                        <span className="material-symbols-outlined text-[14px]">folder_shared</span>
                        Client location
                      </button>
                      <button type="button" onClick={useProfileDeliveryLocation} disabled={!activeProfile?.defaultDeliveryLink} className="btn-secondary min-h-8 px-3 py-1.5 text-[11px] disabled:opacity-50">
                        <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                        My Drive location
                      </button>
                    </div>
                  </div>
                  <input
                    id="invoice-delivery-link"
                    type="url"
                    value={form.deliveryLink}
                    onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="field-control px-3 py-2"
                  />
                </div>

                {importableTasks.length > 0 && (
                  <div className="surface-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] bg-[var(--foreground)]/[0.01]">
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Unbilled Done Tasks</p>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Found completed tasks for {form.client}. Import them to line items.</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => importAllTasks(importableTasks)} 
                        disabled={importableTasks.every(t => importedTaskIds.includes(t.id))}
                        className="btn-secondary text-[11px] min-h-8 px-3 py-1.5 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">done_all</span>
                        Import All
                      </button>
                    </div>
                    <div className="divide-y divide-[var(--card-border)] max-h-48 overflow-y-auto">
                      {importableTasks.map((task) => {
                        const isImported = importedTaskIds.includes(task.id);
                        const parsedHours = parseEstimateToHours(task.estimate);
                        return (
                          <div key={task.id} className="flex items-center justify-between gap-4 p-3 hover:bg-[var(--foreground)]/[0.01] transition-smooth">
                            <div className="min-w-0">
                              <p className="text-[12.5px] font-semibold text-[var(--foreground)] truncate">{task.title}</p>
                              <p className="text-[11px] text-[var(--muted)] truncate">
                                {task.estimate ? `Estimate: ${task.estimate}` : "No estimate"} · {parsedHours > 0 ? `${parsedHours} hours` : "1.00 hours"} billable
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => importTask(task)}
                              disabled={isImported}
                              className={`btn-secondary min-h-7 px-2.5 py-1 text-[10.5px] flex items-center gap-1 ${isImported ? "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20" : ""}`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {isImported ? "check_circle" : "add"}
                              </span>
                              {isImported ? "Imported" : "Import"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-date">Date</label>
                    <input id="invoice-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field-control px-3 py-2" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-due-date">Due Date</label>
                    <input id="invoice-due-date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="field-control px-3 py-2" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-status">Status</label>
                    <select
                      id="invoice-status"
                      value={form.status}
                      onChange={(event) => {
                        const status = event.target.value as InvoiceStatus;
                        setForm((currentForm) => ({
                          ...currentForm,
                          status,
                          payments: modalMode === "edit" && status === "Paid" && currentForm.payments.length === 0
                            ? [createPaymentRecord(invoiceTotal)]
                            : currentForm.payments,
                        }));
                      }}
                      className="field-control px-3 py-2"
                    >
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-workflow-status">Work Status</label>
                    <select
                      id="invoice-workflow-status"
                      value={form.workflowStatus}
                      onChange={(event) => setForm({ ...form, workflowStatus: event.target.value as InvoiceWorkflowStatus })}
                      className="field-control px-3 py-2"
                    >
                      {WORKFLOW_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                </div>

                <div className="surface-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
                    <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Work Items</p>
                    <button type="button" onClick={() => setForm({ ...form, items: [...form.items, createItem()] })} className="btn-secondary text-[11px] min-h-8 px-3 py-1.5">
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add Item
                    </button>
                  </div>
                  <div className="divide-y divide-[var(--card-border)]">
                    {form.items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_90px_130px_40px] gap-3 p-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor={`item-description-${item.id}`}>Work Done</label>
                          <input id={`item-description-${item.id}`} required value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Logo design, consultation, repair work..." className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor={`item-quantity-${item.id}`}>Qty</label>
                          <input id={`item-quantity-${item.id}`} type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} className="field-control px-3 py-2" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor={`item-price-${item.id}`}>Price</label>
                          <input id={`item-price-${item.id}`} type="number" min="0" step="0.01" value={item.price} onChange={(event) => updateItem(index, { price: Number(event.target.value) })} className="field-control px-3 py-2" />
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
                    <span className="text-[12px] font-semibold text-[var(--muted)] tracking-wider uppercase">Invoice Total</span>
                    <span className="text-2xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(invoiceTotal, currency)} /></span>
                  </div>
                </div>

                {modalMode === "edit" && (
                  <PaymentTrackingForm
                    currency={currency}
                    total={invoiceTotal}
                    payments={form.payments}
                    paymentNotes={form.paymentNotes}
                    onPaymentsChange={(payments) => setForm((currentForm) => ({ ...currentForm, payments }))}
                    onPaymentNotesChange={(paymentNotes) => setForm((currentForm) => ({ ...currentForm, paymentNotes }))}
                  />
                )}

                {needsClientSaveChoice && (
                  <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 p-4">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] mb-1">Save this client?</p>
                    <p className="text-[12px] text-[var(--muted)] mb-3">Regular clients are added to the Clients page. One-time clients stay only on this invoice.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void submitInvoice("regular")} className="btn-primary active:scale-[0.97]">
                        Save Regular Client
                      </button>
                      <button type="button" onClick={() => void submitInvoice("onetime")} className="btn-secondary">
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
                    {isSaving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Invoice"}
                  </button>
                </div>
              </form>
            ) : selectedInvoice && (
              <div className="space-y-5">
                <div className="surface-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 border-b border-[var(--card-border)] pb-5 mb-5">
                    <div className="flex items-center gap-3">
                      {activeProfile?.profilePic ? (
                        <img className="size-12 rounded-xl object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                      ) : (
                        <div className="size-12 rounded-xl bg-[var(--foreground)]/[0.04] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">person</span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">{activeProfile?.businessName || activeProfile?.name || "BillCraft"}</h3>
                        <p className="text-[12px] text-[var(--muted)]">{activeProfile?.profession || "Invoice profile"}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">{selectedInvoice.templateName || "Classic Invoice"}</p>
                      <p className="text-2xl font-semibold text-[var(--foreground)] font-display">{selectedInvoice.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-2">Bill To</p>
                      <div className="flex items-start gap-3">
                        <img className="size-10 rounded-xl object-cover border border-[var(--card-border)]" alt={selectedInvoice.client} src={selectedInvoice.avatar} />
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--foreground)]">{selectedInvoice.client}</p>
                          <p className="text-[12px] text-[var(--muted)]">{selectedInvoice.email || "No email added"}</p>
                          <p className="text-[12px] text-[var(--muted)]">{selectedInvoice.phone || "No phone added"}</p>
                          {selectedInvoice.whatsapp && <p className="text-[12px] text-[var(--muted)]">WhatsApp: {selectedInvoice.whatsapp}</p>}
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
                        <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-1.5">Status</p>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">{getPaymentState(selectedInvoice)}</p>
                      </div>
                      <div className="surface-card p-3.5 col-span-2">
                        <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-1.5">Work Status</p>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">{selectedInvoice.workflowStatus || "Draft"}</p>
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
                      <span className="text-[12px] font-semibold text-[var(--muted)] tracking-wider uppercase">Total</span>
                      <span className="text-2xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(selectedInvoice), currency)} /></span>
                    </div>
                  </div>

                  {activeProfile?.signature && (
                    <div className="mt-5 flex justify-end">
                      <div className="text-right">
                        <img className="ml-auto h-14 max-w-44 object-contain" alt="Signature" src={activeProfile.signature} />
                        <p className="mt-1 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Signature</p>
                      </div>
                    </div>
                  )}
                </div>

                <PaymentSummary currency={currency} record={selectedInvoice} />

                <div className="surface-card p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Delivery</p>
                      {selectedInvoice.deliveryLink ? (
                        <a href={selectedInvoice.deliveryLink} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[13px] font-semibold text-[var(--accent)]">
                          {selectedInvoice.deliveryLink}
                        </a>
                      ) : (
                        <p className="mt-1 text-[12px] text-[var(--muted)]">No upload location selected for this invoice.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedInvoice.email && (
                        <a className="btn-secondary min-h-8 px-3 py-1.5 text-[11px]" href={`mailto:${selectedInvoice.email}?subject=${encodeURIComponent(`${selectedInvoice.id} finished work`)}&body=${encodeURIComponent(getInvoiceContactMessage(selectedInvoice))}`}>
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          Email
                        </a>
                      )}
                      {selectedInvoice.whatsapp && getWhatsAppUrl(selectedInvoice.whatsapp, getInvoiceContactMessage(selectedInvoice)) && (
                        <a className="btn-secondary min-h-8 px-3 py-1.5 text-[11px]" href={getWhatsAppUrl(selectedInvoice.whatsapp, getInvoiceContactMessage(selectedInvoice))} target="_blank" rel="noreferrer">
                          <span className="material-symbols-outlined text-[14px]">chat</span>
                          WhatsApp
                        </a>
                      )}
                      {selectedInvoice.deliveryLink && (
                        <a className="btn-secondary min-h-8 px-3 py-1.5 text-[11px]" href={selectedInvoice.deliveryLink} target="_blank" rel="noreferrer">
                          <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                          Upload
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button onClick={() => handleExportInvoice(selectedInvoice)} className="btn-secondary">
                    Export PDF
                  </button>
                  {selectedInvoice.workflowStatus !== "Sent" && (
                    <button onClick={() => void updateInvoiceWorkflowStatus(selectedInvoice, "Sent")} className="btn-secondary" disabled={isSaving}>
                      Mark Sent
                    </button>
                  )}
                  {selectedInvoice.workflowStatus !== "Work Confirmed" && (
                    <button onClick={() => void updateInvoiceWorkflowStatus(selectedInvoice, "Work Confirmed")} className="btn-secondary" disabled={isSaving}>
                      Work Confirmed
                    </button>
                  )}
                  <button onClick={() => openEditModal(selectedInvoice)} className="btn-primary active:scale-[0.97]">
                    Edit Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingTaskInvoice && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button aria-label="Close task prompt" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm" onClick={() => setPendingTaskInvoice(null)} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-xl p-5 sm:p-7">
            <div className="mb-5">
              <AnimatedText as="p" text="Next Step" effect="micro-scale-fade" className="section-eyebrow" replayKey="invoice-task-prompt" />
              <AnimatedText
                as="h2"
                text="Add this invoice to To-Do?"
                effect="fade-through"
                className="text-2xl font-semibold text-[var(--foreground)] font-display"
                replayKey={`task-prompt-${pendingTaskInvoice.id}`}
              />
              <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">
                BillCraft can create one task card for each work item on {pendingTaskInvoice.id}. Matching cards share the same color so they read as one job on the board.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.02] p-3">
              {(pendingTaskInvoice.items || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-[var(--card)] px-3 py-2">
                  <span className="h-8 w-1 rounded-full" style={{ backgroundColor: getJobColor(pendingTaskInvoice.id) }} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{item.description}</p>
                    <p className="text-[11px] text-[var(--muted)]">{pendingTaskInvoice.client}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingTaskInvoice(null)} className="btn-ghost" disabled={isCreatingTasks}>
                Skip
              </button>
              <button type="button" onClick={() => void createTodoCardsForInvoice(pendingTaskInvoice)} className="btn-primary active:scale-[0.97]" disabled={isCreatingTasks}>
                {isCreatingTasks ? "Adding..." : "Add To-Do Cards"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

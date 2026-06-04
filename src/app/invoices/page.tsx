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
  CURRENCY_RATES,
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
  { id: "classic", name: "Classic Invoice", description: "A clean one-page invoice with profile, client, work, and total." },
  { id: "minimal", name: "Minimalist Style", description: "A simple, light layout with high whitespace, clean typography, and subtle borders." },
  { id: "bold", name: "Bold Modern", description: "Strong high-contrast header blocks, solid borders, and striking emphasis." },
  { id: "branded", name: "Palette Accent", description: "Dynamic branded accent colors and borders matched to your profile theme." },
  { id: "detailed", name: "Detailed Grid", description: "A double-bordered grid structure perfect for itemized work and tax breakdowns." },
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
    paymentLink: "",
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
    currency: "",
    discount: 0,
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
    paymentLink: invoice.paymentLink || "",
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
    currency: invoice.currency || "",
    discount: invoice.discount || 0,
  };
}

export default function Invoices() {
  const { invoices, clientRecords, saveInvoice, exportInvoice, deleteInvoices, updateInvoicesStatus } = useInvoices();
  const { activeProfile, todoTasks = [], saveTodoTasks, catalogItems = [] } = useUserData();
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

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [importedTaskIds, setImportedTaskIds] = useState<string[]>([]);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);

  // Task-to-invoice automation state
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

  // Integration simulator states
  const [isSimulatingStripe, setIsSimulatingStripe] = useState(false);
  const [stripeStep, setStripeStep] = useState<string>("");
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);
  const [emailSendingStatus, setEmailSendingStatus] = useState<"idle" | "generating" | "attaching" | "sending" | "sent">("idle");

  function openShareModal(invoice: Invoice) {
    setShareInvoice(invoice);
  }

  // Reset selection state when filters or search queries change
  useEffect(() => {
    setSelectedInvoiceIds([]);
  }, [activeFilter, searchQuery]);

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
  const invoiceSubtotal = getInvoiceItemsTotal(form.items);
  const invoiceTotal = Math.max(0, invoiceSubtotal - (Number(form.discount) || 0));
  const modalTitle = modalMode === "create" ? "New Invoice" : modalMode === "edit" ? "Edit Invoice" : selectedInvoice?.id || "Invoice";

  // Prefill invoice creation modal when task-to-invoice automation query parameter is set
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const taskId = params.get("prefillTaskId");
      if (taskId && todoTasks.length > 0 && !modalMode) {
        const task = todoTasks.find((t) => t.id === taskId);
        if (task && !task.invoiceId) {
          // Clear query parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          const parsedHours = parseEstimateToHours(task.estimate);
          const hourlyRate = getProfileHourlyRate(activeProfile);
          const price = hourlyRate || 50;
          const quantity = parsedHours || 1;

          const prefillForm = createEmptyForm();
          prefillForm.clientMode = "new";
          prefillForm.client = task.client || "";
          prefillForm.email = task.clientEmail || "";
          prefillForm.phone = task.clientPhone || "";
          prefillForm.whatsapp = task.clientWhatsapp || "";
          prefillForm.deliveryLink = task.deliveryLink || "";
          prefillForm.items = [{
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            description: task.title + (task.description ? `: ${task.description}` : ""),
            quantity,
            price
          }];
          
          // Match existing client record if possible
          const matchingClient = clientRecords.find(c => c.name.toLowerCase() === (task.client || "").toLowerCase());
          if (matchingClient) {
            prefillForm.clientMode = "saved";
            prefillForm.clientId = matchingClient.id;
            prefillForm.email = matchingClient.email || prefillForm.email;
            prefillForm.phone = matchingClient.phone || prefillForm.phone;
            prefillForm.whatsapp = matchingClient.whatsapp || prefillForm.whatsapp;
            prefillForm.deliveryLink = matchingClient.deliveryLink || prefillForm.deliveryLink;
          }

          setForm(prefillForm);
          setModalMode("create");
          setLinkedTaskId(taskId);
        }
      }
    }
  }, [todoTasks, activeProfile, clientRecords, modalMode]);

  // Handle sandbox logs initialization when viewing an invoice
  useEffect(() => {
    if (selectedInvoice) {
      setWebhookLogs([
        `[${new Date().toLocaleTimeString()}] [SYSTEM] Webhook listener initialized for ${selectedInvoice.id}`,
        `[${new Date().toLocaleTimeString()}] [SYSTEM] Listening for Stripe/PayPal payment webhooks...`
      ]);
      setIsSimulatingStripe(false);
      setStripeStep("");
      setEmailSendingStatus("idle");
    }
  }, [selectedInvoice]);

  // Stripe Checkout simulator
  const simulateStripeCheckout = async () => {
    if (!selectedInvoice) return;
    setIsSimulatingStripe(true);
    setStripeStep("Initiating Stripe Checkout...");
    
    const addLog = (log: string) => {
      setWebhookLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
    };
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStripeStep("Redirecting to Stripe sandbox...");
    addLog("[STRIPE] checkout.session.created: session_id = cs_test_" + Math.random().toString(36).slice(2, 10));
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    setStripeStep("Processing secure card payment...");
    addLog("[STRIPE] payment_intent.succeeded: intent_id = pi_test_" + Math.random().toString(36).slice(2, 10));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStripeStep("Payment confirmed by network!");
    addLog("[STRIPE] event: checkout.session.completed (verified signature)");
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const paymentTotal = getInvoiceTotal(selectedInvoice);
      const newPayment = {
        id: `payment-${Date.now().toString(36)}`,
        amount: paymentTotal,
        paidAt: new Date().toISOString(),
        method: "Stripe Simulation",
        notes: "Automated simulation via checkout portal"
      };
      
      const updatedInvoice = await saveInvoice({
        ...selectedInvoice,
        templateId: selectedInvoice.templateId || "classic",
        templateName: selectedInvoice.templateName || "Classic Invoice",
        items: selectedInvoice.items || [],
        status: "Paid",
        amountPaid: paymentTotal,
        payments: [...(selectedInvoice.payments || []), newPayment],
        paidAt: newPayment.paidAt,
        paymentMethod: newPayment.method,
      });
      
      if (updatedInvoice) {
        setSelectedInvoice(updatedInvoice);
        addLog(`[BILLCRAFT] Webhook handler updated ${selectedInvoice.id} status to PAID`);
        notify.success({
          title: "Payment simulated successfully",
          description: "Stripe checkout completed and status updated to Paid.",
        });
      }
    } catch (err) {
      addLog(`[ERROR] Failed to save simulated status: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSimulatingStripe(false);
      setStripeStep("");
    }
  };

  // Email Reminder simulator
  const simulateEmailReminder = async () => {
    if (!selectedInvoice) return;
    setEmailSendingStatus("generating");
    
    const addLog = (log: string) => {
      setWebhookLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
    };
    
    addLog("[MAILER] Starting email reminder compilation...");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setEmailSendingStatus("attaching");
    addLog("[MAILER] Generating invoice PDF attachment...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setEmailSendingStatus("sending");
    addLog(`[MAILER] Dispatching reminder mail to client ${selectedInvoice.email || "billing@example.com"}...`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    setEmailSendingStatus("sent");
    addLog(`[MAILER] Reminder email successfully delivered to client SMTP server.`);
    
    notify.success({
      title: "Reminder email sent!",
      description: `Payment notification email sent to ${selectedInvoice.client}.`,
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEmailSendingStatus("idle");
  };

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
        paymentLink: form.paymentLink || undefined,
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
        currency: form.currency || undefined,
        discount: Number(form.discount) || 0,
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

      // Link tasks to the newly created invoice!
      const tasksToUpdate = [...importedTaskIds];
      if (linkedTaskId) {
        tasksToUpdate.push(linkedTaskId);
      }

      if (tasksToUpdate.length > 0 && savedInvoice) {
        const nextTasks = todoTasks.map(task => {
          if (tasksToUpdate.includes(task.id)) {
            const tags = task.tags || [];
            const nextTags = [...tags];
            if (!nextTags.includes("Billed")) {
              nextTags.push("Billed");
            }
            return {
              ...task,
              invoiceId: savedInvoice.id,
              tags: nextTags,
              updatedAt: new Date().toISOString(),
            };
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
      setLinkedTaskId(null);
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

  async function handleBulkExport() {
    if (selectedInvoiceIds.length === 0) return;
    setIsBulkExporting(true);
    try {
      const selectedInvoices = invoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
      for (let i = 0; i < selectedInvoices.length; i++) {
        const invoice = selectedInvoices[i];
        await exportInvoice(invoice);
        notify.success({
          title: `Download started (${i + 1}/${selectedInvoices.length})`,
          description: `${invoice.id} exported successfully.`,
        });
        if (i < selectedInvoices.length - 1) {
          // Stagger exports to prevent browser popup block
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      setSelectedInvoiceIds([]);
    } catch (error) {
      notify.error({
        title: "Bulk export failed",
        description: getToastErrorMessage(error, "Unable to export selected invoices."),
      });
    } finally {
      setIsBulkExporting(false);
    }
  }

  async function handleBulkDelete() {
    const count = selectedInvoiceIds.length;
    if (count === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete the ${count} selected invoice${count > 1 ? "s" : ""}? This action cannot be undone.`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await deleteInvoices(selectedInvoiceIds);
      notify.success({
        title: "Invoices deleted",
        description: `Successfully deleted ${count} invoice${count > 1 ? "s" : ""}.`,
      });
      setSelectedInvoiceIds([]);
    } catch (error) {
      notify.error({
        title: "Bulk deletion failed",
        description: getToastErrorMessage(error, "Unable to delete selected invoices."),
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleBulkStatusChange(status: InvoiceStatus) {
    const count = selectedInvoiceIds.length;
    if (count === 0) return;

    setIsBulkUpdatingStatus(true);
    try {
      await updateInvoicesStatus(selectedInvoiceIds, status);
      notify.success({
        title: "Status updated",
        description: `Successfully set status of ${count} invoice${count > 1 ? "s" : ""} to ${status}.`,
      });
      setSelectedInvoiceIds([]);
    } catch (error) {
      notify.error({
        title: "Bulk status update failed",
        description: getToastErrorMessage(error, "Unable to update selected invoices."),
      });
    } finally {
      setIsBulkUpdatingStatus(false);
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

        {filteredInvoices.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 mb-2 bg-[var(--card)]/40 border border-[var(--card-border)]/40 rounded-xl">
            <div className="flex items-center gap-3">
              <label 
                className="relative flex items-center justify-center size-5 rounded-full border-2 border-[var(--card-border)] hover:border-[var(--accent)] cursor-pointer transition-smooth shrink-0 bg-[var(--field)] shadow-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={filteredInvoices.length > 0 && selectedInvoiceIds.length === filteredInvoices.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedInvoiceIds(filteredInvoices.map((inv) => inv.id));
                    } else {
                      setSelectedInvoiceIds([]);
                    }
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--accent)] opacity-0 scale-0 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-200">
                  <span className="material-symbols-outlined text-[12px] text-white font-extrabold select-none">check</span>
                </span>
              </label>
              <span className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase select-none">
                Select All ({filteredInvoices.length})
              </span>
            </div>
            {selectedInvoiceIds.length > 0 && (
              <button
                onClick={() => setSelectedInvoiceIds([])}
                className="text-[11px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] tracking-wider uppercase transition-smooth"
              >
                Clear Selection ({selectedInvoiceIds.length})
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {filteredInvoices.map((invoice) => (
            (() => {
              const balanceDue = getBalanceDue(invoice);
              const paymentState = getPaymentState(invoice);
              const isChecked = selectedInvoiceIds.includes(invoice.id);

              return (
            <div
              key={invoice.id}
              onClick={() => openViewModal(invoice)}
              className="surface-card w-full cursor-pointer p-4 lg:p-5 hover:border-[var(--foreground)]/12 transition-smooth group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openViewModal(invoice);
                }
              }}
            >
              <div className="flex items-center gap-4">
                {/* Checkbox Selector */}
                <label 
                  className="relative flex items-center justify-center size-5 rounded-full border-2 border-[var(--card-border)] hover:border-[var(--accent)] cursor-pointer transition-smooth shrink-0 bg-[var(--field)] shadow-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoiceIds((prev) => [...prev, invoice.id]);
                      } else {
                        setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoice.id));
                      }
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[var(--accent)] opacity-0 scale-0 peer-checked:opacity-100 peer-checked:scale-100 transition-all duration-200">
                    <span className="material-symbols-outlined text-[12px] text-white font-extrabold select-none">check</span>
                  </span>
                </label>

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
                  <span onClick={(event) => { event.stopPropagation(); openShareModal(invoice); }} className="size-8 flex items-center justify-center rounded-full text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Send/Share">
                    <span className="material-symbols-outlined text-[16px]">send</span>
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
            </div>
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
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal} />
          {isFormMode ? (
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
                        {modalMode === "edit" ? `Edit Session · ${selectedInvoice?.id}` : "Draft Workspace"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider hidden sm:inline">Template:</span>
                      <select
                        value={form.templateId}
                        onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                        className="text-[12px] font-semibold bg-[var(--foreground)]/[0.04] border border-[var(--card-border)] rounded-full px-3 py-1 text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      >
                        {TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id} className="text-[var(--foreground)] bg-[var(--background)]">{t.name}</option>
                        ))}
                      </select>
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
                        <div className="flex gap-0.5 rounded-full border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setClientMode("saved")}
                            disabled={clientRecords.length === 0}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-smooth ${
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
                            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-smooth ${
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
                              {form.address && (
                                <p className="text-[var(--muted)] truncate mt-1 bg-[var(--foreground)]/[0.01] px-1 py-0.5 rounded border border-[var(--card-border)]/20 whitespace-pre-line leading-normal line-clamp-2">
                                  {form.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-xl border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                              {form.avatar ? (
                                <img className="w-full h-full object-cover" alt="Client preview" src={form.avatar} />
                              ) : (
                                <span className="material-symbols-outlined text-[var(--foreground)]/25">image</span>
                              )}
                            </div>
                            <label className="btn-secondary text-[11px] min-h-7 px-2.5 py-1 cursor-pointer hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                              <span>{form.avatar ? "Change Image" : "Add Image"}</span>
                              <input className="sr-only" type="file" accept="image/*" onChange={handleClientImageChange} />
                            </label>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-client">Client Name</label>
                              <input id="invoice-client" required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} placeholder="Client or company name" className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-company">Company</label>
                              <input id="invoice-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-email">Email</label>
                              <input id="invoice-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="billing@example.com" className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-phone">Phone</label>
                              <input id="invoice-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 000-0000" className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-whatsapp">WhatsApp</label>
                              <input id="invoice-whatsapp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} placeholder="+1 (555) 000-0000" className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-delivery-link-new">Work Folder</label>
                              <input id="invoice-delivery-link-new" type="url" value={form.deliveryLink} onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })} placeholder="https://drive.google.com/..." className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-address">Address</label>
                            <textarea id="invoice-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Billing address" className="field-control min-h-16 px-3 py-1.5 text-[13px] resize-none" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dates & Workflow Metadata Card */}
                    <div className="surface-card p-4 space-y-3">
                      <h3 className="text-[11px] font-bold text-[var(--muted)] tracking-wider uppercase flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">date_range</span>
                        Dates & Workflow
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-date">Issue Date</label>
                          <input id="invoice-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field-control px-3 py-1.5 text-[13px]" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-due-date">Due Date</label>
                          <input id="invoice-due-date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="field-control px-3 py-1.5 text-[13px]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-currency">Currency</label>
                          <select
                            id="invoice-currency"
                            value={form.currency || ""}
                            onChange={(event) => {
                              const newCurrency = event.target.value;
                              const oldCurrency = form.currency || currency;
                              
                              setForm((currentForm) => {
                                const currencyMode = window.localStorage.getItem("billcraft.currency-mode.v1") || "visual";
                                let nextItems = currentForm.items;
                                let nextDiscount = currentForm.discount || 0;
                                
                                if (currencyMode === "convert" && newCurrency && oldCurrency) {
                                  const rate = (CURRENCY_RATES[newCurrency] || 1.0) / (CURRENCY_RATES[oldCurrency] || 1.0);
                                  nextItems = currentForm.items.map((item) => ({
                                    ...item,
                                    price: Math.round(item.price * rate * 100) / 100,
                                  }));
                                  nextDiscount = Math.round(nextDiscount * rate * 100) / 100;
                                }
                                
                                return {
                                  ...currentForm,
                                  currency: newCurrency,
                                  items: nextItems,
                                  discount: nextDiscount,
                                };
                              });
                            }}
                            className="field-control px-2 py-1.5 text-[13px]"
                          >
                            <option value="" className="text-[var(--foreground)] bg-[var(--background)]">Global ({currency})</option>
                            <option value="USD" className="text-[var(--foreground)] bg-[var(--background)]">USD ($)</option>
                            <option value="EUR" className="text-[var(--foreground)] bg-[var(--background)]">EUR (€)</option>
                            <option value="GBP" className="text-[var(--foreground)] bg-[var(--background)]">GBP (£)</option>
                            <option value="LKR" className="text-[var(--foreground)] bg-[var(--background)]">LKR (Rs)</option>
                            <option value="INR" className="text-[var(--foreground)] bg-[var(--background)]">INR (₹)</option>
                          </select>
                        </div>
                        
                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-status">Bill Status</label>
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
                            className="field-control px-2 py-1.5 text-[13px]"
                          >
                            {STATUSES.map((status) => <option key={status} value={status} className="text-[var(--foreground)] bg-[var(--background)]">{status}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1 col-span-1">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-workflow-status">Work Status</label>
                          <select
                            id="invoice-workflow-status"
                            value={form.workflowStatus}
                            onChange={(event) => setForm({ ...form, workflowStatus: event.target.value as InvoiceWorkflowStatus })}
                            className="field-control px-2 py-1.5 text-[13px]"
                          >
                            {WORKFLOW_STATUSES.map((status) => <option key={status} value={status} className="text-[var(--foreground)] bg-[var(--background)]">{status}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Integrations Card */}
                    <div className="surface-card p-4 space-y-3">
                      <h3 className="text-[11px] font-bold text-[var(--muted)] tracking-wider uppercase flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">link</span>
                        External Integrations
                      </h3>

                      {/* Delivery Link Input */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-delivery-link">Finished Product Folder</label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={useClientDeliveryLocation}
                              disabled={!clientRecords.find((client) => client.id === form.clientId)?.deliveryLink}
                              className="text-[9px] font-bold text-[var(--accent)] hover:text-[var(--accent)]/80 disabled:opacity-40 transition-smooth"
                              title="Copy from Client records"
                            >
                              Client Loc
                            </button>
                            <span className="text-[9px] text-[var(--muted)]">|</span>
                            <button
                              type="button"
                              onClick={useProfileDeliveryLocation}
                              disabled={!activeProfile?.defaultDeliveryLink}
                              className="text-[9px] font-bold text-[var(--accent)] hover:text-[var(--accent)]/80 disabled:opacity-40 transition-smooth"
                              title="Copy from My Drive Profile"
                            >
                              My Drive
                            </button>
                          </div>
                        </div>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]">folder_shared</span>
                          <input
                            id="invoice-delivery-link"
                            type="url"
                            value={form.deliveryLink}
                            onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
                            placeholder="https://drive.google.com/..."
                            className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                          />
                        </div>
                      </div>

                      {/* Payment Link Input */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="invoice-payment-link">Stripe / PayPal Gateway Link</label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const mockId = Math.random().toString(36).slice(2, 10);
                                const total = form.items.reduce((sum, item) => sum + (item.quantity * item.price), 0) - (form.discount || 0);
                                setForm({ ...form, paymentLink: `https://checkout.stripe.com/c/pay/${mockId}#amount=${total}` });
                              }}
                              className="text-[9px] font-bold text-[#635bff] hover:opacity-80 transition-smooth"
                            >
                              + Stripe
                            </button>
                            <span className="text-[9px] text-[var(--muted)]">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                const email = form.email || "merchant@example.com";
                                const total = form.items.reduce((sum, item) => sum + (item.quantity * item.price), 0) - (form.discount || 0);
                                setForm({ ...form, paymentLink: `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(email)}&amount=${total}&item_name=Invoice` });
                              }}
                              className="text-[9px] font-bold text-[#003087] hover:opacity-80 transition-smooth"
                            >
                              + PayPal
                            </button>
                          </div>
                        </div>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]">payments</span>
                          <input
                            id="invoice-payment-link"
                            type="url"
                            value={form.paymentLink || ""}
                            onChange={(event) => setForm({ ...form, paymentLink: event.target.value })}
                            placeholder="https://checkout.stripe.com/pay/..."
                            className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Work Items Ledger & Calculations (58% width) */}
                  <div className="w-full md:w-[58%] bg-[var(--card)] flex flex-col overflow-y-auto p-5 space-y-5">
                    
                    {/* Unbilled Done Tasks Notification Drawer */}
                    {importableTasks.length > 0 && (
                      <div className="rounded-xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/[0.05] to-transparent p-4 relative overflow-hidden shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] animate-pulse">playlist_add_check</span>
                              Smart Task Automation
                            </p>
                            <p className="text-[10px] text-[var(--muted)] mt-0.5">Found completed tasks for {form.client}. Import them to line items.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => importAllTasks(importableTasks)}
                            disabled={importableTasks.every(t => importedTaskIds.includes(t.id))}
                            className="btn-primary text-[10px] min-h-7 px-3 py-1 bg-[var(--accent)] hover:bg-[var(--accent)]/90 border-0 disabled:opacity-50 active:scale-[0.97]"
                          >
                            Import All
                          </button>
                        </div>
                        
                        <div className="divide-y divide-[var(--card-border)]/50 max-h-36 overflow-y-auto">
                          {importableTasks.map((task) => {
                            const isImported = importedTaskIds.includes(task.id);
                            const parsedHours = parseEstimateToHours(task.estimate);
                            return (
                              <div key={task.id} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                                <div className="min-w-0">
                                  <p className="text-[12px] font-bold text-[var(--foreground)] truncate">{task.title}</p>
                                  <p className="text-[10px] text-[var(--muted)] truncate">
                                    {task.estimate ? `Estimate: ${task.estimate}` : "No estimate"} · {parsedHours > 0 ? `${parsedHours} hours` : "1.00 hours"} billable
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => importTask(task)}
                                  disabled={isImported}
                                  className={`min-h-7 px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${
                                    isImported 
                                      ? "bg-[var(--positive)]/10 text-[var(--positive)] border-[var(--positive)]/20" 
                                      : "bg-[var(--card)] border-[var(--card-border)] hover:border-[var(--accent)]/50 text-[var(--foreground)]"
                                  }`}
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

                    {/* Line Items ledger */}
                    <div className="surface-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] bg-[var(--foreground)]/[0.01]">
                        <p className="text-[11px] font-bold text-[var(--foreground)] tracking-wider uppercase">Work Done & Services</p>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, items: [...form.items, createItem()] })}
                          className="btn-secondary text-[11px] min-h-7 px-2.5 py-1 hover:bg-[var(--foreground)]/[0.04] transition-smooth flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span> Add Service
                        </button>
                      </div>

                      <div className="divide-y divide-[var(--card-border)]">
                        {form.items.map((item, index) => (
                          <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_36px] gap-3 p-4 relative group">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider" htmlFor={`item-description-${item.id}`}>Description</label>
                                {catalogItems.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] text-[var(--accent)]">bolt</span>
                                    <select
                                      className="text-[9px] bg-transparent border-0 text-[var(--accent)] font-semibold cursor-pointer outline-none max-w-[130px] truncate"
                                      onChange={(e) => {
                                        const selectedId = e.target.value;
                                        if (selectedId) {
                                          const catItem = catalogItems.find(c => c.id === selectedId);
                                          if (catItem) {
                                            updateItem(index, {
                                              description: catItem.description || catItem.name,
                                              price: catItem.defaultPrice
                                            });
                                          }
                                          e.target.value = "";
                                        }
                                      }}
                                      defaultValue=""
                                    >
                                      <option value="" disabled className="text-[var(--foreground)] bg-[var(--background)]">Catalog Fill</option>
                                      {catalogItems.map(cat => (
                                        <option key={cat.id} value={cat.id} className="text-[var(--foreground)] bg-[var(--background)]">
                                          {cat.name} ({formatCurrency(cat.defaultPrice, form.currency || currency)})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                              <input id={`item-description-${item.id}`} required value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="What service did you perform?" className="field-control px-3 py-1.5 text-[13px]" />
                            </div>
                            
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider" htmlFor={`item-quantity-${item.id}`}>Qty / Hrs</label>
                              <input id={`item-quantity-${item.id}`} type="number" min="0" step="1" value={item.quantity} onChange={(event) => {
                                const cleanVal = event.target.value.replace(/^0+(?=\d)/, '');
                                updateItem(index, { quantity: Number(cleanVal) });
                              }} className="field-control px-3 py-1.5 text-[13px] text-center" />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider" htmlFor={`item-price-${item.id}`}>Rate ({form.currency || currency})</label>
                              <input id={`item-price-${item.id}`} type="number" min="0" step="0.01" value={item.price} onChange={(event) => {
                                const cleanVal = event.target.value.replace(/^0+(?=\d)/, '');
                                updateItem(index, { price: Number(cleanVal) });
                              }} className="field-control px-3 py-1.5 text-[13px] text-right font-mono" />
                            </div>

                            <div className="flex sm:items-end justify-center">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="size-8 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--negative)] hover:bg-[var(--negative)]/10 transition-smooth shrink-0"
                                aria-label="Remove item"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Summary Card */}
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.01] p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-[12px] font-semibold text-[var(--muted)]">
                        <span>Subtotal</span>
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

                {/* Footer Action Bar */}
                <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card)] shrink-0 z-10">
                  <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 rounded-full text-[12px] font-bold">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary min-h-9 px-5 rounded-full text-[12px] font-bold shadow-md active:scale-[0.97]" disabled={isSaving}>
                    {isSaving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Create Invoice"}
                  </button>
                </div>
              </form>
            </div>
          ) : selectedInvoice && (
            <div role="dialog" aria-modal="true" className="modal-surface relative max-w-3xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-200">
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
                    {(selectedInvoice.items || []).map((item) => {
                      const activeInvoiceCurrency = selectedInvoice.currency || currency;
                      return (
                        <div key={item.id} className="grid grid-cols-[1fr_70px_110px] gap-3 border-t border-[var(--card-border)] px-4 py-3 text-[13px]">
                          <span className="font-medium text-[var(--foreground)]">{item.description}</span>
                          <span className="text-right text-[var(--muted)]"><AnimatedNumber value={item.quantity} /></span>
                          <span className="text-right font-semibold text-[var(--foreground)]"><AnimatedNumber value={formatCurrency(item.quantity * item.price, activeInvoiceCurrency)} /></span>
                        </div>
                      );
                    })}
                    {(() => {
                      const activeInvoiceCurrency = selectedInvoice.currency || currency;
                      const invoiceViewSubtotal = (selectedInvoice.items || []).reduce((sum, item) => sum + item.quantity * item.price, 0);
                      const invoiceViewDiscount = selectedInvoice.discount || 0;
                      const invoiceViewTotal = getInvoiceTotal(selectedInvoice);
                      return (
                        <>
                          {invoiceViewDiscount > 0 && (
                            <>
                              <div className="flex items-center justify-between border-t border-[var(--card-border)] px-4 py-2 text-[13px]">
                                <span className="text-[12px] text-[var(--muted)]">Subtotal</span>
                                <span className="font-medium text-[var(--foreground)]">{formatCurrency(invoiceViewSubtotal, activeInvoiceCurrency)}</span>
                              </div>
                              <div className="flex items-center justify-between px-4 py-2 text-[13px]">
                                <span className="text-[12px] text-[var(--muted)]">Discount</span>
                                <span className="font-medium text-[var(--accent)]">-{formatCurrency(invoiceViewDiscount, activeInvoiceCurrency)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex items-center justify-between border-t border-[var(--card-border)] px-4 py-4">
                            <span className="text-[12px] font-semibold text-[var(--muted)] tracking-wider uppercase">Total</span>
                            <span className="text-2xl font-semibold text-[var(--foreground)] font-display">
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
                        <p className="mt-1 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Signature</p>
                      </div>
                    </div>
                  )}
                </div>

                <PaymentSummary currency={currency} record={selectedInvoice} />

                {/* Glassmorphic Simulated Integrations & Webhooks Panel */}
                <div className="surface-card p-5 border border-dashed border-[var(--accent)]/[0.25] bg-[var(--accent)]/[0.01] rounded-2xl relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 p-3 flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-semibold tracking-wider text-emerald-500 uppercase">Live Sandbox Simulator</span>
                  </div>

                  <h4 className="text-[13px] font-bold text-[var(--foreground)] tracking-wide uppercase flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">sync_alt</span>
                    Integration Simulations
                  </h4>
                  <p className="text-[11px] text-[var(--muted)] mb-4">
                    Trigger sandbox simulations to test custom client flows, Stripe checkouts, email reminder automations, and live webhook events.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Simulator Action Controls */}
                    <div className="space-y-3">
                      {/* Stripe simulation */}
                      <div className="surface-card p-3.5 bg-[var(--foreground)]/[0.01] border border-[var(--card-border)] rounded-xl flex flex-col justify-between min-h-[110px]">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="material-symbols-outlined text-[16px] text-[#635bff]">payments</span>
                            <h5 className="text-[12px] font-semibold text-[var(--foreground)]">Stripe Payment Gateway</h5>
                          </div>
                          <p className="text-[11px] text-[var(--muted)]">
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
                      <div className="surface-card p-3.5 bg-[var(--foreground)]/[0.01] border border-[var(--card-border)] rounded-xl flex flex-col justify-between min-h-[110px]">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="material-symbols-outlined text-[16px] text-sky-500">mail</span>
                            <h5 className="text-[12px] font-semibold text-[var(--foreground)]">Client Reminder dispatch</h5>
                          </div>
                          <p className="text-[11px] text-[var(--muted)]">
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
                                Connecting to client mail...
                              </>
                            )}
                            {emailSendingStatus === "sent" && (
                              <>
                                <span className="material-symbols-outlined text-[14px] text-emerald-500">check</span>
                                Delivered Successfully!
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live Webhook logs terminal console */}
                    <div className="flex flex-col h-full min-h-[235px] surface-card bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-[10px] text-zinc-300">
                      <div className="bg-zinc-900 px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="size-1.5 bg-red-500 rounded-full animate-pulse"></span>
                          Webhook Event Logs (Terminal)
                        </span>
                        <button
                          type="button"
                          onClick={() => setWebhookLogs([])}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors text-[9px]"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent max-h-[190px]">
                        {webhookLogs.length === 0 ? (
                          <div className="text-zinc-600 italic">No webhook events logged yet. Trigger Stripe checkout or send email to log events...</div>
                        ) : (
                          webhookLogs.map((log, index) => {
                            let colorClass = "text-zinc-300";
                            if (log.includes("[STRIPE]")) colorClass = "text-[#8a85ff]";
                            else if (log.includes("[BILLCRAFT]")) colorClass = "text-emerald-400 font-semibold";
                            else if (log.includes("[SYSTEM]")) colorClass = "text-amber-400/80";
                            else if (log.includes("[MAILER]")) colorClass = "text-sky-400";
                            else if (log.includes("[ERROR]")) colorClass = "text-rose-400 font-bold";
                            return (
                              <div key={index} className={`leading-relaxed whitespace-pre-wrap ${colorClass}`}>
                                {log}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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
                      <button type="button" onClick={() => openShareModal(selectedInvoice)} className="btn-primary min-h-8 px-3 py-1.5 text-[11px]">
                        <span className="material-symbols-outlined text-[14px]">send</span>
                        Send / Share
                      </button>
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
      )}

      {pendingTaskInvoice && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button aria-label="Close task prompt" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPendingTaskInvoice(null)} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-xl p-5 sm:p-7 animate-in fade-in-50 zoom-in-95 duration-200">
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

      {/* Floating Glassmorphic Bulk Actions Bar */}
      {selectedInvoiceIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center justify-between gap-4 md:gap-6 px-4 md:px-6 py-3.5 max-w-[92vw] md:max-w-2xl bg-[var(--card)]/85 backdrop-blur-xl border border-[var(--card-border)]/70 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] rounded-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-6 rounded-full bg-[var(--accent)] text-white text-[12px] font-bold shadow-sm">
              {selectedInvoiceIds.length}
            </div>
            <span className="text-[12px] font-semibold text-[var(--foreground)] tracking-wide whitespace-nowrap hidden sm:inline">
              Selected
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--card-border)] hidden sm:block" />

          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Download PDFs button */}
            <button
              onClick={handleBulkExport}
              disabled={isBulkExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] active:scale-[0.97] transition-smooth disabled:opacity-50"
              title="Download PDFs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span className="hidden md:inline">{isBulkExporting ? "Exporting..." : "Download PDFs"}</span>
            </button>

            {/* Change Status Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                disabled={isBulkUpdatingStatus}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] active:scale-[0.97] transition-smooth disabled:opacity-50 ${isStatusDropdownOpen ? "bg-[var(--foreground)]/[0.05]" : ""}`}
                title="Change Status"
              >
                <span className="material-symbols-outlined text-[16px]">change_circle</span>
                <span>Status</span>
                <span className="material-symbols-outlined text-[12px] transition-transform duration-200" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                  keyboard_arrow_up
                </span>
              </button>

              {/* Elegant floating dropup menu */}
              {isStatusDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 min-w-[140px] bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <p className="text-[9px] font-semibold text-[var(--muted)] tracking-wider uppercase px-2 py-1 select-none">Update to</p>
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setIsStatusDropdownOpen(false);
                          void handleBulkStatusChange(status);
                        }}
                        className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] transition-smooth"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status === "Paid" ? "var(--positive)" : status === "Overdue" ? "var(--accent)" : "var(--muted)" }} />
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Delete button */}
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[var(--negative)] hover:bg-[var(--negative)]/10 active:scale-[0.97] transition-smooth disabled:opacity-50"
              title="Delete Selected"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span className="hidden md:inline">{isBulkDeleting ? "Deleting..." : "Delete"}</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--card-border)]" />

          {/* Clear button */}
          <button
            onClick={() => setSelectedInvoiceIds([])}
            className="size-8 flex items-center justify-center rounded-lg text-[var(--foreground)]/40 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] active:scale-[0.92] transition-smooth"
            title="Deselect All"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {shareInvoice && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in duration-200">
          <div className="modal-surface w-full max-w-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
              <h3 className="text-lg font-semibold text-[var(--foreground)] font-display flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[var(--accent)]">send</span>
                Send Invoice
              </h3>
              <button onClick={() => setShareInvoice(null)} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>
            
            <p className="text-[12px] text-[var(--muted)]">Select how you want to send <strong>{shareInvoice.id}</strong> to <strong>{shareInvoice.client}</strong>:</p>
            
            <div className="space-y-2">
              {(() => {
                const contactChannels = [];
                if (shareInvoice.email) {
                  contactChannels.push({
                    id: "email",
                    label: "Email",
                    icon: "mail",
                    href: `mailto:${shareInvoice.email}?subject=${encodeURIComponent(`${shareInvoice.id} finished work`)}&body=${encodeURIComponent(getInvoiceContactMessage(shareInvoice))}`,
                    external: false,
                  });
                }
                if (shareInvoice.whatsapp) {
                  contactChannels.push({
                    id: "whatsapp",
                    label: "WhatsApp",
                    icon: "chat",
                    href: getWhatsAppUrl(shareInvoice.whatsapp, getInvoiceContactMessage(shareInvoice)),
                    external: true,
                  });
                }
                if (shareInvoice.phone && !shareInvoice.whatsapp) {
                  contactChannels.push({
                    id: "sms",
                    label: "Normal Message (SMS)",
                    icon: "sms",
                    href: `sms:${shareInvoice.phone}?body=${encodeURIComponent(getInvoiceContactMessage(shareInvoice))}`,
                    external: false,
                  });
                }
                
                return (
                  <>
                    {contactChannels.map((channel) => (
                      <a
                        key={channel.id}
                        href={channel.href}
                        target={channel.external ? "_blank" : undefined}
                        rel={channel.external ? "noreferrer" : undefined}
                        onClick={() => setShareInvoice(null)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--accent)]/55 hover:bg-[var(--accent)]/[0.03] transition-smooth group"
                      >
                        <span className="size-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--action-text)] flex items-center justify-center shrink-0 transition-smooth">
                          <span className="material-symbols-outlined text-[18px]">{channel.icon}</span>
                        </span>
                        <div className="text-left">
                          <span className="block text-[13px] font-semibold text-[var(--foreground)]">{channel.label}</span>
                          <span className="block text-[10px] text-[var(--muted)]">Send instantly via {channel.label.toLowerCase()}</span>
                        </div>
                        <span className="ml-auto material-symbols-outlined text-[18px] text-[var(--muted)] group-hover:text-[var(--accent)] transition-smooth">chevron_right</span>
                      </a>
                    ))}
                    {contactChannels.length === 0 && (
                      <div className="text-center py-6 text-[12px] text-[var(--muted)]">
                        No contact details found for this client. Please edit the client/invoice to add an email or phone number.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </>
  );
}

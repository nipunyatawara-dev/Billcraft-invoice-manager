"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import {
  formatCurrency,
  getInvoiceItemsTotal,
  getInvoiceTotal,
  getInvoiceTotals,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { InvoiceList } from "./components/InvoiceList";
import { InvoiceFormModal } from "./components/InvoiceFormModal";
import { InvoicePreviewModal } from "./components/InvoicePreviewModal";

const STATUSES: InvoiceStatus[] = ["Paid", "Unpaid", "Overdue"];
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
  const { activeProfile, todoTasks = [], saveTodoTasks } = useUserData();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState("All");
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
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  const [importedTaskIds, setImportedTaskIds] = useState<string[]>([]);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);

  // Task-to-invoice automation state
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

  // Integration simulator states
  const [isSimulatingStripe, setIsSimulatingStripe] = useState(false);
  const [stripeStep, setStripeStep] = useState<string>("");
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);
  const [emailSendingStatus, setEmailSendingStatus] = useState<"idle" | "generating" | "attaching" | "sending" | "sent">("idle");

  const openCreateModal = useCallback((prefillClient?: Client) => {
    const initialForm = createEmptyForm();
    const firstClient = prefillClient || clientRecords[0];

    setSelectedInvoice(null);
    setNeedsClientSaveChoice(false);
    setForm(firstClient ? getFormFromClient(firstClient, initialForm) : { ...initialForm, clientMode: "new" });
    setModalMode("create");
  }, [clientRecords]);

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id && invoices.length > 0 && !selectedInvoice && modalMode === null) {
        const invoice = invoices.find(i => i.id === id);
        if (invoice) {
          setSelectedInvoice(invoice);
          setModalMode("view");
        }
      }
    }
  }, [invoices, selectedInvoice, modalMode]);

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

  // Open invoice creation modal when action=new query parameter is set
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      if (action === "new" && !modalMode) {
        // Clear query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        openCreateModal();
      }
    }
  }, [modalMode, openCreateModal]);

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

  function handleClientImageChange(event: React.ChangeEvent<HTMLInputElement>) {
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
              className="text-3xl lg:text-[40px] font-semibold text-foreground leading-[1.1]"
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
            <p className="text-[11px] font-semibold text-featured-text/40 tracking-wider uppercase mb-2.5">Total Billed</p>
            <p className="text-xl font-semibold text-featured-text font-display"><AnimatedNumber value={formatCurrency(totals.totalAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2.5">Total</p>
            <p className="text-xl font-semibold text-foreground font-display"><AnimatedNumber value={invoices.length} /> <span className="text-[12px] font-normal text-muted">invoices</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2.5">Collected</p>
            <p className="text-xl font-semibold text-foreground font-display"><AnimatedNumber value={formatCurrency(totals.paidAmount, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2.5">Attention</p>
            <p className="text-xl font-semibold text-foreground font-display"><AnimatedNumber value={totals.unpaidCount + totals.overdueCount} /> <span className="text-[12px] font-normal text-accent">pending</span></p>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedInvoiceIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 mb-4 bg-accent/5 border border-accent/15 rounded-xl animate-in slide-in-from-top-3 duration-250">
            <span className="text-[11px] font-extrabold text-accent uppercase tracking-wider">
              Bulk Actions ({selectedInvoiceIds.length}):
            </span>
            <button
              onClick={handleBulkExport}
              disabled={isBulkExporting}
              className="btn-secondary text-[11px] min-h-7 px-3 py-1 font-semibold flex items-center gap-1"
            >
              {isBulkExporting ? "Exporting..." : <>
                <span className="material-symbols-outlined text-[13px]">download</span>
                Export PDF
              </>}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="btn-secondary text-[11px] min-h-7 px-3 py-1 font-semibold text-negative hover:bg-negative/10 hover:border-transparent flex items-center gap-1"
            >
              {isBulkDeleting ? "Deleting..." : <>
                <span className="material-symbols-outlined text-[13px]">delete</span>
                Delete
              </>}
            </button>
            <div className="relative">
              <button
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                disabled={isBulkUpdatingStatus}
                className="btn-secondary text-[11px] min-h-7 px-3 py-1 font-semibold flex items-center gap-1"
              >
                Change Status
                <span className="material-symbols-outlined text-[13px]">expand_more</span>
              </button>
              {isStatusDropdownOpen && (
                <>
                  <button type="button" aria-label="Close status dropdown" className="fixed inset-0 z-10" onClick={() => setIsStatusDropdownOpen(false)} />
                  <div className="absolute left-0 bottom-full mb-1 w-[130px] bg-card border border-card-border rounded-xl shadow-lg z-20 py-1">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          void handleBulkStatusChange(status);
                          setIsStatusDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-foreground/[0.04] transition-colors"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <InvoiceList
          filteredInvoices={filteredInvoices}
          selectedInvoiceIds={selectedInvoiceIds}
          setSelectedInvoiceIds={setSelectedInvoiceIds}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          openViewModal={openViewModal}
          openEditModal={openEditModal}
          openShareModal={openShareModal}
          handleExportInvoice={handleExportInvoice}
          currency={currency}
        />

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-card-border">
          <p className="text-[11px] text-muted font-medium">Showing <AnimatedNumber value={filteredInvoices.length} /> of <AnimatedNumber value={invoices.length} /> invoices</p>
        </div>
      </main>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-foreground/25 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal} />
          {isFormMode ? (
            <InvoiceFormModal
              modalMode={modalMode}
              form={form}
              setForm={setForm}
              clientRecords={clientRecords}
              currency={currency}
              isSaving={isSaving}
              needsClientSaveChoice={needsClientSaveChoice}
              importableTasks={importableTasks}
              importedTaskIds={importedTaskIds}
              TEMPLATES={TEMPLATES}
              selectedTemplate={selectedTemplate}
              isTemplateDropdownOpen={isTemplateDropdownOpen}
              setIsTemplateDropdownOpen={setIsTemplateDropdownOpen}
              closeModal={closeModal}
              submitInvoice={submitInvoice}
              setClientMode={setClientMode}
              handleClientSelect={handleClientSelect}
              handleClientImageChange={handleClientImageChange}
              updateItem={updateItem}
              removeItem={removeItem}
              importTask={importTask}
              importAllTasks={importAllTasks}
              useClientDeliveryLocation={useClientDeliveryLocation}
              useProfileDeliveryLocation={useProfileDeliveryLocation}
              invoiceSubtotal={invoiceSubtotal}
              invoiceTotal={invoiceTotal}
              createItem={createItem}
            />
          ) : selectedInvoice && (
            <InvoicePreviewModal
              selectedInvoice={selectedInvoice}
              activeProfile={activeProfile}
              currency={currency}
              closeModal={closeModal}
              isSimulatingStripe={isSimulatingStripe}
              stripeStep={stripeStep}
              webhookLogs={webhookLogs}
              emailSendingStatus={emailSendingStatus}
              simulateStripeCheckout={simulateStripeCheckout}
              simulateEmailReminder={simulateEmailReminder}
            />
          )}
        </div>
      )}

      {/* Task Automation Dialog */}
      {pendingTaskInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setPendingTaskInvoice(null)} />
          <div className="modal-surface relative max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="size-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-4">
              <span className="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1.5 font-display">Create to-do cards for this invoice?</h3>
            <p className="text-[12px] text-muted leading-relaxed mb-6">
              Automatically add {pendingTaskInvoice.items?.length || 1} task card{(pendingTaskInvoice.items?.length || 1) === 1 ? "" : "s"} to your To-Do board matching the line items on {pendingTaskInvoice.id}.
            </p>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => void createTodoCardsForInvoice(pendingTaskInvoice)}
                className="btn-primary flex-1 min-h-9 text-[12px] font-bold shadow-sm"
              >
                Yes, Create Tasks
              </button>
              <button 
                type="button" 
                onClick={() => setPendingTaskInvoice(null)}
                className="btn-ghost flex-1 min-h-9 text-[12px] font-bold"
              >
                No, Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share / Invoice Delivery Link Modal */}
      {shareInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShareInvoice(null)} />
          <div className="modal-surface relative max-w-lg w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5 font-display">
                <span className="material-symbols-outlined text-[18px] text-accent">send</span>
                Send Invoice & Delivery Link
              </h3>
              <button onClick={() => setShareInvoice(null)} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04]">
                <span className="material-symbols-outlined text-[16px] text-muted">close</span>
              </button>
            </div>
            
            <p className="text-[12px] text-muted mb-5 leading-normal">
              Manage work confirmation workflow and copy delivery links to share with {shareInvoice.client}.
            </p>

            <div className="space-y-4">
              {/* Delivery link */}
              {shareInvoice.deliveryLink ? (
                <div className="surface-card p-4 border border-card-border rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Product Delivery Link</span>
                    <button 
                      onClick={() => {
                        void navigator.clipboard.writeText(shareInvoice.deliveryLink || "");
                        notify.success({ title: "Link copied", description: "Delivery link copied to clipboard." });
                      }}
                      className="text-[10px] font-extrabold text-accent hover:underline uppercase"
                    >
                      Copy Link
                    </button>
                  </div>
                  <p className="text-[12px] text-foreground font-mono truncate select-all">{shareInvoice.deliveryLink}</p>
                </div>
              ) : (
                <div className="surface-card p-4 border border-dashed border-card-border rounded-xl text-center text-[12px] text-muted">
                  No work delivery link added to this invoice.
                </div>
              )}

              {/* Status workflow */}
              <div className="surface-card p-4 border border-card-border rounded-xl space-y-3">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Workflow Progress</span>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { void updateInvoiceWorkflowStatus(shareInvoice, "Sent"); setShareInvoice(null); }}
                    className={`btn-secondary text-[11px] py-1.5 ${shareInvoice.workflowStatus === "Sent" ? "bg-accent/10 text-accent border-accent/20 font-bold" : ""}`}
                  >
                    Mark as Sent
                  </button>
                  <button 
                    onClick={() => { void updateInvoiceWorkflowStatus(shareInvoice, "Work Confirmed"); setShareInvoice(null); }}
                    className={`btn-secondary text-[11px] py-1.5 ${shareInvoice.workflowStatus === "Work Confirmed" ? "bg-accent/10 text-accent border-accent/20 font-bold" : ""}`}
                  >
                    Confirm Work
                  </button>
                  <button 
                    onClick={() => { void updateInvoiceWorkflowStatus(shareInvoice, "Delivered"); setShareInvoice(null); }}
                    className={`btn-secondary text-[11px] py-1.5 ${shareInvoice.workflowStatus === "Delivered" ? "bg-accent/10 text-accent border-accent/20 font-bold" : ""}`}
                  >
                    Mark Delivered
                  </button>
                  {shareInvoice.phone && (
                    <a
                      href={getWhatsAppUrl(shareInvoice.phone, getInvoiceContactMessage(shareInvoice))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-[11px] py-1.5 text-center flex items-center justify-center gap-1 text-emerald-600 hover:bg-emerald-50"
                    >
                      <i className="ph ph-whatsapp text-sm"></i>
                      WhatsApp Client
                    </a>
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

import {
  getInvoiceTotal,
  type Client,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoiceWorkflowStatus,
  type PaymentAttachment,
  type PaymentRecord,
  type UserProfile,
} from "@/data/invoices";

export const STATUSES: InvoiceStatus[] = ["Paid", "Unpaid", "Overdue"];
export const JOB_COLORS = ["#2563eb", "#16a34a", "#f97316", "#a855f7", "#e11d48", "#0891b2", "#ca8a04", "#4f46e5"];
export const TEMPLATES = [
  { id: "classic", name: "Classic Invoice", description: "A clean one-page invoice with profile, client, work, and total." },
  { id: "minimal", name: "Minimalist Style", description: "A simple, light layout with high whitespace, clean typography, and subtle borders." },
  { id: "bold", name: "Bold Modern", description: "Strong high-contrast header blocks, solid borders, and striking emphasis." },
  { id: "branded", name: "Palette Accent", description: "Dynamic branded accent colors and borders matched to your profile theme." },
  { id: "detailed", name: "Detailed Grid", description: "A double-bordered grid structure perfect for itemized work and tax breakdowns." },
] as const;

export type ModalMode = "create" | "edit" | "view" | null;
export type ClientMode = "saved" | "new";
export type SaveClientMode = "regular" | "onetime";

export interface InvoiceForm {
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

export function createItem(description = "", quantity = 1, price = 0): InvoiceItem {
  return {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    description,
    quantity,
    price,
  };
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyForm(): InvoiceForm {
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
    discountType: "flat",
  };
}

export function toDateInputValue(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function getJobColor(invoiceId: string) {
  const colorIndex = [...invoiceId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % JOB_COLORS.length;
  return JOB_COLORS[colorIndex];
}

export function getInvoiceContactMessage(invoice: Invoice) {
  return `Hi ${invoice.client}, ${invoice.id} is ready for review.`;
}

export function getProfileHourlyRate(profile: UserProfile | null | undefined) {
  const profileWithBilling = profile as (UserProfile & { hourlyRate?: unknown }) | null | undefined;

  return typeof profileWithBilling?.hourlyRate === "number" ? profileWithBilling.hourlyRate : 50;
}

export function parseEstimateToHours(estimate?: string): number {
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

export function getFormFromClient(client: Client, currentForm: InvoiceForm): InvoiceForm {
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

export function getInvoiceForm(invoice: Invoice, clients: Client[]): InvoiceForm {
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
    discountType: invoice.discountType || "flat",
  };
}

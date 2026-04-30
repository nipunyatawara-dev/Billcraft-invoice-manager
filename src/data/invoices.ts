export interface Invoice {
  id: string;
  clientId?: string;
  client: string;
  avatar: string;
  date: string;
  dueDate?: string;
  amount: string;
  subtotal?: number;
  total?: number;
  templateId?: string;
  templateName?: string;
  items?: InvoiceItem[];
  status: "Paid" | "Unpaid" | "Overdue";
  statusColor: string;
  clientColor: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type InvoiceStatus = Invoice["status"];

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export const ANALYTICS_WIDGET_IDS = [
  "revenue-flow",
  "paid-ratio",
  "avg-invoice",
  "avg-ltv",
  "top-client",
  "revenue-trend",
  "status-mix",
  "top-clients",
  "invoice-aging",
  "collection-gauge",
] as const;

export type AnalyticsWidgetId = (typeof ANALYTICS_WIDGET_IDS)[number];

export interface AnalyticsPreferences {
  visibleWidgetIds: AnalyticsWidgetId[];
  widgetOrder: AnalyticsWidgetId[];
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  profession: string;
  email?: string;
  phone?: string;
  businessName?: string;
  profilePic?: string;
  signature?: string;
  analyticsPreferences?: AnalyticsPreferences;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ANALYTICS_WIDGET_ORDER: AnalyticsWidgetId[] = [...ANALYTICS_WIDGET_IDS];

export const DEFAULT_VISIBLE_ANALYTICS_WIDGET_IDS: AnalyticsWidgetId[] = [
  "revenue-flow",
  "paid-ratio",
  "avg-invoice",
  "top-client",
  "revenue-trend",
  "status-mix",
];

export const DEFAULT_ANALYTICS_PREFERENCES: AnalyticsPreferences = {
  visibleWidgetIds: [...DEFAULT_VISIBLE_ANALYTICS_WIDGET_IDS],
  widgetOrder: [...DEFAULT_ANALYTICS_WIDGET_ORDER],
  updatedAt: "",
};

const ANALYTICS_WIDGET_ID_SET = new Set<AnalyticsWidgetId>(ANALYTICS_WIDGET_IDS);

export function isAnalyticsWidgetId(value: unknown): value is AnalyticsWidgetId {
  return typeof value === "string" && ANALYTICS_WIDGET_ID_SET.has(value as AnalyticsWidgetId);
}

function getValidAnalyticsWidgetIds(value: unknown) {
  return Array.isArray(value) ? value.filter(isAnalyticsWidgetId) : [];
}

export function normalizeAnalyticsPreferences(preferences?: Partial<AnalyticsPreferences> | null): AnalyticsPreferences {
  const requestedOrder = getValidAnalyticsWidgetIds(preferences?.widgetOrder);
  const requestedVisible = getValidAnalyticsWidgetIds(preferences?.visibleWidgetIds);
  const widgetOrder = [
    ...requestedOrder,
    ...DEFAULT_ANALYTICS_WIDGET_ORDER.filter((widgetId) => !requestedOrder.includes(widgetId)),
  ];
  const visibleWidgetIds = requestedVisible.length > 0
    ? requestedVisible.filter((widgetId) => widgetOrder.includes(widgetId))
    : [...DEFAULT_VISIBLE_ANALYTICS_WIDGET_IDS];

  return {
    visibleWidgetIds,
    widgetOrder,
    updatedAt: typeof preferences?.updatedAt === "string" ? preferences.updatedAt : "",
  };
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Paid: "bg-[var(--positive)]/15 text-[var(--positive)]",
  Unpaid: "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/60",
  Overdue: "bg-[var(--accent)]/15 text-[var(--accent)]",
};

export const INVOICES: Invoice[] = [];

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  company?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OutsourcingInvoice {
  id: string;
  vendorId?: string;
  vendor: string;
  avatar: string;
  date: string;
  dueDate?: string;
  amount: string;
  subtotal?: number;
  total?: number;
  templateId?: string;
  templateName?: string;
  items?: InvoiceItem[];
  status: InvoiceStatus;
  statusColor: string;
  vendorColor: string;
  email: string;
  phone: string;
  company?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function getStatusColor(status: InvoiceStatus) {
  return STATUS_STYLES[status];
}

export function parseInvoiceAmount(amount: string) {
  return Number(amount.replace(/[^\d.-]/g, "")) || 0;
}

export function getInvoiceTotal(invoice: Invoice) {
  if (typeof invoice.total === "number") {
    return invoice.total;
  }

  return parseInvoiceAmount(invoice.amount);
}

export function getOutsourcingInvoiceTotal(invoice: OutsourcingInvoice) {
  if (typeof invoice.total === "number") {
    return invoice.total;
  }

  return parseInvoiceAmount(invoice.amount);
}

export function getInvoiceItemsTotal(items: InvoiceItem[] = []) {
  return items.reduce((sum, item) => {
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const price = Number.isFinite(item.price) ? item.price : 0;
    return sum + quantity * price;
  }, 0);
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDisplayDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function createAvatar(name: string) {
  const initials = (name || "Client")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";
  const palette = ["#d1d4f9", "#f0e7d5", "#c0aede", "#d6f3e5", "#f7d8ce"];
  const index = [...(name || "Client")].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="${palette[index]}"/><text x="48" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#212842">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getInvoiceTotals(invoices: Invoice[]) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const paidAmount = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const pendingAmount = invoices
    .filter((invoice) => invoice.status === "Unpaid")
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const overdueAmount = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    paidCount: invoices.filter((invoice) => invoice.status === "Paid").length,
    unpaidCount: invoices.filter((invoice) => invoice.status === "Unpaid").length,
    overdueCount: invoices.filter((invoice) => invoice.status === "Overdue").length,
  };
}

export function getOutsourcingTotals(invoices: OutsourcingInvoice[]) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + getOutsourcingInvoiceTotal(invoice), 0);
  const paidAmount = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + getOutsourcingInvoiceTotal(invoice), 0);
  const pendingAmount = invoices
    .filter((invoice) => invoice.status === "Unpaid")
    .reduce((sum, invoice) => sum + getOutsourcingInvoiceTotal(invoice), 0);
  const overdueAmount = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + getOutsourcingInvoiceTotal(invoice), 0);

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    paidCount: invoices.filter((invoice) => invoice.status === "Paid").length,
    unpaidCount: invoices.filter((invoice) => invoice.status === "Unpaid").length,
    overdueCount: invoices.filter((invoice) => invoice.status === "Overdue").length,
  };
}

export function getClientsFromInvoices(invoices: Invoice[]): (Client & { invoices: Invoice[]; totalBilled: number })[] {
  const clientMap = new Map<string, { client: Client; invoices: Invoice[]; totalBilled: number }>();
  
  for (const inv of invoices) {
    if (!clientMap.has(inv.client)) {
      clientMap.set(inv.client, {
        client: {
          id: inv.clientId || inv.client,
          name: inv.client,
          email: inv.email,
          phone: inv.phone,
          avatar: inv.avatar,
          company: inv.company,
          address: inv.address,
        },
        invoices: [],
        totalBilled: 0,
      });
    }
    const entry = clientMap.get(inv.client)!;
    entry.invoices.push(inv);
    entry.totalBilled += getInvoiceTotal(inv);
  }
  
  return Array.from(clientMap.values()).map(({ client, invoices, totalBilled }) => ({
    ...client,
    invoices,
    totalBilled,
  }));
}

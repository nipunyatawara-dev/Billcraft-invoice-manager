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
  discount?: number;
  discountType?: "flat" | "percent";
  currency?: string;
  templateId?: string;
  templateName?: string;
  items?: InvoiceItem[];
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  receiptAttachments?: PaymentAttachment[];
  payments?: PaymentRecord[];
  status: "Paid" | "Unpaid" | "Overdue";
  workflowStatus?: InvoiceWorkflowStatus;
  statusColor: string;
  clientColor: string;
  email: string;
  phone: string;
  whatsapp?: string;
  company?: string;
  address?: string;
  deliveryLink?: string;
  paymentLink?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrashItem {
  id: string;
  deletedAt: string;
  type: "invoice";
  data: Invoice;
}

export type InvoiceStatus = Invoice["status"];
export type InvoiceWorkflowStatus = "Draft" | "Sent" | "Work Confirmed" | "Delivered";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: "Travel" | "Software" | "Office Supplies" | "Meals" | "Marketing" | "Tax/Legal" | "Other";
  date: string;
  merchant: string;
  notes?: string;
  isTaxDeductible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  unit: "hour" | "flat" | "day" | "unit";
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  notes?: string;
  receiptAttachments?: PaymentAttachment[];
}

const ANALYTICS_WIDGET_IDS = [
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
  defaultDeliveryLink?: string;
  profilePic?: string;
  signature?: string;
  analyticsPreferences?: AnalyticsPreferences;
  hasPassword?: boolean;
  passwordHint?: string;
  passwordChangedAt?: string;
  lastBackupAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ANALYTICS_WIDGET_ORDER: AnalyticsWidgetId[] = [...ANALYTICS_WIDGET_IDS];

const DEFAULT_VISIBLE_ANALYTICS_WIDGET_IDS: AnalyticsWidgetId[] = [
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

function isAnalyticsWidgetId(value: unknown): value is AnalyticsWidgetId {
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
  Paid: "bg-positive/15 text-positive",
  Unpaid: "bg-foreground/[0.06] text-foreground/60",
  Overdue: "bg-accent/15 text-accent",
};

// Removed unused export INVOICES

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  avatar: string;
  company?: string;
  address?: string;
  deliveryLink?: string;
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
  discount?: number;
  currency?: string;
  templateId?: string;
  templateName?: string;
  items?: InvoiceItem[];
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  receiptAttachments?: PaymentAttachment[];
  payments?: PaymentRecord[];
  status: InvoiceStatus;
  workflowStatus?: InvoiceWorkflowStatus;
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

function parseInvoiceAmount(amount: string) {
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

export type PaymentTrackable = {
  dueDate?: string;
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  payments?: PaymentRecord[];
  receiptAttachments?: PaymentAttachment[];
  status: InvoiceStatus;
  total?: number;
  amount: string;
};

export function getPaymentRecordsTotal(payments: PaymentRecord[] = []) {
  return payments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return sum + (Number.isFinite(amount) ? Math.max(amount, 0) : 0);
  }, 0);
}

function getTrackableTotal(record: PaymentTrackable) {
  if (typeof record.total === "number") {
    return record.total;
  }

  return parseInvoiceAmount(record.amount);
}

export function getAmountPaid(record: PaymentTrackable) {
  const total = getTrackableTotal(record);
  const paymentsTotal = getPaymentRecordsTotal(record.payments);
  const fallbackPaid = typeof record.amountPaid === "number" ? record.amountPaid : 0;
  const paidAmount = paymentsTotal > 0 ? paymentsTotal : fallbackPaid > 0 ? fallbackPaid : record.status === "Paid" ? total : 0;

  return Math.min(Math.max(paidAmount, 0), total);
}

export function getBalanceDue(record: PaymentTrackable) {
  return Math.max(getTrackableTotal(record) - getAmountPaid(record), 0);
}

export function isDueDateOverdue(dueDate?: string) {
  if (!dueDate) {
    return false;
  }

  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

export function isRecordOverdue(record: PaymentTrackable) {
  return getBalanceDue(record) > 0 && (record.status === "Overdue" || isDueDateOverdue(record.dueDate));
}

export function getPaymentState(record: PaymentTrackable): "Paid" | "Partially Paid" | "Overdue" | "Unpaid" {
  const amountPaid = getAmountPaid(record);
  const balanceDue = getBalanceDue(record);

  if (balanceDue <= 0) {
    return "Paid";
  }

  if (isRecordOverdue(record)) {
    return amountPaid > 0 ? "Partially Paid" : "Overdue";
  }

  return amountPaid > 0 ? "Partially Paid" : "Unpaid";
}

export function getLatestPayment(payments: PaymentRecord[] = []) {
  return [...payments]
    .filter((payment) => payment.paidAt)
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())[0];
}

export const CURRENCY_RATES: Record<string, number> = {
  USD: 1.0,
  LKR: 300.0,
  EUR: 0.92,
  GBP: 0.78,
  INR: 83.5,
  AUD: 1.55,
  CAD: 1.37,
  JPY: 156.0,
  SGD: 1.35,
  AED: 3.67,
};

function convertCurrency(amount: number, from: string, to: string): number {
  const rateFrom = CURRENCY_RATES[from] || 1.0;
  const rateTo = CURRENCY_RATES[to] || 1.0;
  return (amount / rateFrom) * rateTo;
}

export function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.trim() || "USD",
      minimumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${String(currency).toUpperCase()} ${formatted}`;
  }
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

export function getInvoiceTotals(
  invoices: Invoice[],
  globalCurrency = "USD",
  currencyMode: "visual" | "convert" = "visual"
) {
  const isConvert = currencyMode === "convert";

  const totalAmount = invoices.reduce((sum, invoice) => {
    const amt = getInvoiceTotal(invoice);
    const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
    return sum + converted;
  }, 0);

  const paidAmount = invoices.reduce((sum, invoice) => {
    const amt = getAmountPaid(invoice);
    const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
    return sum + converted;
  }, 0);

  const pendingAmount = invoices
    .filter((invoice) => getBalanceDue(invoice) > 0 && !isRecordOverdue(invoice))
    .reduce((sum, invoice) => {
      const amt = getBalanceDue(invoice);
      const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
      return sum + converted;
    }, 0);

  const overdueAmount = invoices
    .filter(isRecordOverdue)
    .reduce((sum, invoice) => {
      const amt = getBalanceDue(invoice);
      const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
      return sum + converted;
    }, 0);

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    paidCount: invoices.filter((invoice) => getBalanceDue(invoice) <= 0).length,
    unpaidCount: invoices.filter((invoice) => getBalanceDue(invoice) > 0 && !isRecordOverdue(invoice)).length,
    overdueCount: invoices.filter(isRecordOverdue).length,
  };
}

export function getOutsourcingTotals(
  invoices: OutsourcingInvoice[],
  globalCurrency = "USD",
  currencyMode: "visual" | "convert" = "visual"
) {
  const isConvert = currencyMode === "convert";

  const totalAmount = invoices.reduce((sum, invoice) => {
    const amt = getOutsourcingInvoiceTotal(invoice);
    const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
    return sum + converted;
  }, 0);

  const paidAmount = invoices.reduce((sum, invoice) => {
    const amt = getAmountPaid(invoice);
    const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
    return sum + converted;
  }, 0);

  const pendingAmount = invoices
    .filter((invoice) => getBalanceDue(invoice) > 0 && !isRecordOverdue(invoice))
    .reduce((sum, invoice) => {
      const amt = getBalanceDue(invoice);
      const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
      return sum + converted;
    }, 0);

  const overdueAmount = invoices
    .filter(isRecordOverdue)
    .reduce((sum, invoice) => {
      const amt = getBalanceDue(invoice);
      const converted = isConvert ? convertCurrency(amt, invoice.currency || "USD", globalCurrency) : amt;
      return sum + converted;
    }, 0);

  return {
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    paidCount: invoices.filter((invoice) => getBalanceDue(invoice) <= 0).length,
    unpaidCount: invoices.filter((invoice) => getBalanceDue(invoice) > 0 && !isRecordOverdue(invoice)).length,
    overdueCount: invoices.filter(isRecordOverdue).length,
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

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
] as const;

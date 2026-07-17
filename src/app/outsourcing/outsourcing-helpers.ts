import {
  getBalanceDue,
  getInvoiceItemsTotal,
  getOutsourcingInvoiceTotal,
  type InvoiceItem,
  type InvoiceStatus,
  type OutsourcingInvoice,
  type PaymentAttachment,
  type PaymentRecord,
  type Vendor,
} from "@/data/invoices";

export const STATUS_FILTERS = ["All", "Paid", "Unpaid"] as const;
export const TEMPLATES = [
  {
    id: "outsourcing",
    name: "Outsourcing Invoice",
    description: "A payable record for work you need to pay to a vendor.",
  },
] as const;

export type ModalMode = "create" | "edit" | "view" | null;
export type VendorMode = "saved" | "new";
export type SaveVendorMode = "regular" | "onetime";

export type OutsourcingForm = {
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

export function createEmptyForm(): OutsourcingForm {
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

export function toDateInputValue(date?: string) {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

export function getFormFromVendor(vendor: Vendor, currentForm: OutsourcingForm): OutsourcingForm {
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

export function getOutsourcingForm(invoice: OutsourcingInvoice, vendors: Vendor[]): OutsourcingForm {
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

export function getOutsourcingPaymentState(invoice: OutsourcingInvoice): "Paid" | "Unpaid" {
  return getBalanceDue(invoice) <= 0 ? "Paid" : "Unpaid";
}

export function getVendorPaypalUrl(paypal: string, amount: number) {
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

export function getVendorStripeUrl(stripe: string) {
  if (!stripe) return "";
  const cleaned = stripe.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }
  return `https://${cleaned}`;
}

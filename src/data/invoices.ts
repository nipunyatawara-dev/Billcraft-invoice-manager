export interface Invoice {
  id: string;
  client: string;
  avatar: string;
  date: string;
  amount: string;
  status: "Paid" | "Unpaid" | "Overdue";
  statusColor: string;
  clientColor: string;
  email: string;
  phone: string;
}

export type InvoiceStatus = Invoice["status"];

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Paid: "bg-[var(--sage)]/15 text-[var(--sage)]",
  Unpaid: "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/60",
  Overdue: "bg-[var(--accent)]/15 text-[var(--accent)]",
};

export const INVOICES: Invoice[] = [
  {
    id: "#INV-0089",
    client: "Acme Corp",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsXeqo_w1hhyG5J0kVBACXMjyKrUpAOavnYe05vjVQhQ6TupxXOY6urT_uDg_aovFvQM9FVGKwnGSkJCJfiQHrWhpGS0OkKIctnqyEHDpgG81YNpHtbZkF4grPBORiQLbgsNleUjNLsTbhtSH_cvpx9UNuiqXqPyHlrElxGbUE6YY8FkObAeSaIxDuCAtTFTVZrA_AW7bBv1AsHOErx1NzARISTL8MPnwpz7I_L9ZdWiaPLYzlmVaWwEEV0EdWFk7_MTRnVggu_fI",
    date: "Oct 12, 2023",
    amount: "$2,450.00",
    status: "Paid",
    statusColor: "bg-[var(--sage)]/15 text-[var(--sage)]",
    clientColor: "bg-[var(--foreground)]/10",
    email: "billing@acmecorp.com",
    phone: "+1 (555) 234-5678"
  },
  {
    id: "#INV-0090",
    client: "Sarah Jenkins",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCDi7ktVtRXHtCGjKYlY3hUraj2z4v9h93mnRJoWdHQcidX3hT_UwnrRwbUlEh-NwV0zM_A3-1q1DA9LQgnaKMxRJUrLR0fTuNjVdprsV1IA3-TeJY_VM5lGn0mpXmmYUn6Ab6m3nuCbPZnL9lBdu2U_56Ltt5Rps9-q0538Nue77DiRYgHZ7QT3PMJolEZ99xrm9cjbweK_ocj77NaZsyFleo8879bysKPmsVKeRcfxGRYc4cQimFlVOtse9eGFOmf0mT295MifQ",
    date: "Oct 14, 2023",
    amount: "$850.00",
    status: "Unpaid",
    statusColor: "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/60",
    clientColor: "bg-[var(--foreground)]/10",
    email: "sarah@jenkins.design",
    phone: "+1 (555) 876-5432"
  },
  {
    id: "#INV-0091",
    client: "Global Logistics",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkMaqJSltMTbMHXmsFM_hXhpNf1BzjHFLW-ES7ZIAgZZbaLCLTDacEqWABBuE1b3e2eNM1ALPEGTSGLcTHiJbSHM8DxcnojHo5FS1AZttmx8U524sJWMAUzecbyKNvyUgAHyi0_XMQ18pSEGQeYJfbvXcfXOY3UERlwtRv7-dM2Tsoq1OdNxTrAH363vtmSEqtD8GqRbxBEyaO4bJEuRc9uwRtS4YJi8rVN4qaJydC8uiZsvjvFmyfPktcZ_yjIWFmx7yCsiaNWKw",
    date: "Oct 15, 2023",
    amount: "$5,120.00",
    status: "Overdue",
    statusColor: "bg-[var(--accent)]/15 text-[var(--accent)]",
    clientColor: "bg-[var(--foreground)]/10",
    email: "accounts@globallogistics.co",
    phone: "+1 (555) 321-7890"
  },
  {
    id: "#INV-0092",
    client: "Pixel Perfect Ltd",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuANMJLtMXpSsmkSFHVzC42VEDqWeZWIrggcJqfUrJUMISNnCcOLAVGAAoweif4AGm_KovI3V_tWdVuTGfLm1diKdY3jj2Ott1F0KFSJCqZBICQOk8REP-P3n9WCQP2uOizmID5U5uYyrn_U7UBP3dJosV9PiQfcEuO-2uwCmJXowL0Bxothp_flG0y1USEeorl49cduyYFaJMP6XRw14fXmyQEJvoUoVW_2a5lLZm1-F6R49gvsPcB4GlU6VvI02uPLIjdc65J2Mjs",
    date: "Oct 18, 2023",
    amount: "$1,200.00",
    status: "Paid",
    statusColor: "bg-[var(--sage)]/15 text-[var(--sage)]",
    clientColor: "bg-[var(--foreground)]/10",
    email: "hello@pixelperfect.io",
    phone: "+1 (555) 654-3210"
  }
];

export interface Client {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  company?: string;
  notes?: string;
}

export function getStatusColor(status: InvoiceStatus) {
  return STATUS_STYLES[status];
}

export function parseInvoiceAmount(amount: string) {
  return Number(amount.replace(/[^\d.-]/g, "")) || 0;
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
  const encodedName = encodeURIComponent(name || "Client");
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodedName}&backgroundColor=d1d4f9,f0e7d5,c0aede`;
}

export function getInvoiceTotals(invoices: Invoice[]) {
  const totalAmount = invoices.reduce((sum, invoice) => sum + parseInvoiceAmount(invoice.amount), 0);
  const paidAmount = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + parseInvoiceAmount(invoice.amount), 0);
  const pendingAmount = invoices
    .filter((invoice) => invoice.status === "Unpaid")
    .reduce((sum, invoice) => sum + parseInvoiceAmount(invoice.amount), 0);
  const overdueAmount = invoices
    .filter((invoice) => invoice.status === "Overdue")
    .reduce((sum, invoice) => sum + parseInvoiceAmount(invoice.amount), 0);

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
          name: inv.client,
          email: inv.email,
          phone: inv.phone,
          avatar: inv.avatar,
        },
        invoices: [],
        totalBilled: 0,
      });
    }
    const entry = clientMap.get(inv.client)!;
    entry.invoices.push(inv);
    entry.totalBilled += parseInvoiceAmount(inv.amount);
  }
  
  return Array.from(clientMap.values()).map(({ client, invoices, totalBilled }) => ({
    ...client,
    invoices,
    totalBilled,
  }));
}

import {
  createAvatar,
  getStatusColor,
  type Invoice,
  type InvoiceItem,
  type OutsourcingInvoice,
} from "@/data/invoices";
import type { LocalDataSnapshot } from "@/lib/user-data-store";

export function getNextInvoiceId(invoices: Invoice[]) {
  const highestNumber = invoices.reduce((highest, invoice) => {
    const parsed = Number(invoice.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);

  return `#INV-${String(highestNumber + 1).padStart(4, "0")}`;
}

export function getNextOutsourcingInvoiceId(invoices: OutsourcingInvoice[]) {
  const highestNumber = invoices.reduce((highest, invoice) => {
    const parsed = Number(invoice.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);

  return `#OUT-${String(highestNumber + 1).padStart(4, "0")}`;
}

export function normalizeLineItems(items: InvoiceItem[]) {
  return items
    .map((item, index) => ({
      id: item.id || `item-${Date.now().toString(36)}-${index}`,
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
    }))
    .filter((item) => item.description || item.quantity > 0 || item.price > 0);
}

export function hydrateSnapshot(snapshot: LocalDataSnapshot): LocalDataSnapshot {
  return {
    ...snapshot,
    profiles: snapshot.profiles || [],
    activeProfileId: snapshot.activeProfileId || snapshot.activeProfile?.id || null,
    activeProfile: snapshot.activeProfile || null,
    clients: snapshot.clients || [],
    invoices: (snapshot.invoices || []).map((invoice) => ({
      ...invoice,
      statusColor: getStatusColor(invoice.status),
      clientColor: invoice.clientColor || "bg-foreground/10",
      avatar: invoice.avatar || createAvatar(invoice.client),
      items: invoice.items || [],
    })),
    vendors: snapshot.vendors || [],
    outsourcingInvoices: (snapshot.outsourcingInvoices || []).map((invoice) => ({
      ...invoice,
      statusColor: getStatusColor(invoice.status),
      vendorColor: invoice.vendorColor || "bg-foreground/10",
      avatar: invoice.avatar || createAvatar(invoice.vendor),
      items: invoice.items || [],
    })),
    todoTasks: snapshot.todoTasks || [],
    expenses: snapshot.expenses || [],
    catalogItems: snapshot.catalogItems || [],
    trash: snapshot.trash || [],
  };
}

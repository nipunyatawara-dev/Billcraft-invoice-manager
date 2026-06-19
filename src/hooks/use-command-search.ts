import { useMemo } from "react";
import { type Client, type Invoice, type Vendor, type OutsourcingInvoice, type TodoTask, type Expense, type CatalogItem } from "@/hooks/use-user-data";
import { NAV_ITEMS, WORK_NAV_ITEMS, BOTTOM_NAV } from "@/lib/constants";

interface UseCommandSearchProps {
  searchQuery: string;
  clients: Client[];
  invoices: Invoice[];
  expenses: Expense[];
  catalogItems: CatalogItem[];
  todoTasks: TodoTask[];
  vendors: Vendor[];
  outsourcingInvoices: OutsourcingInvoice[];
}

export function useCommandSearch({
  searchQuery,
  clients,
  invoices,
  expenses,
  catalogItems,
  todoTasks,
  vendors,
  outsourcingInvoices,
}: UseCommandSearchProps) {
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    const results = [];
    
    // Pages
    const pages = [...NAV_ITEMS, ...WORK_NAV_ITEMS, ...BOTTOM_NAV].filter(p => p.label.toLowerCase().includes(q));
    if (pages.length) {
      results.push({ group: "Pages", items: pages.map(p => ({ id: p.href, label: p.label, icon: p.icon, href: p.href })) });
    }

    // Settings Tabs
    const settingsTabs = [
      { id: "profile", label: "Profile Settings", icon: "ph ph-user" },
      { id: "appearance", label: "Appearance", icon: "ph ph-palette" },
      { id: "notifications", label: "Notifications", icon: "ph ph-bell" },
      { id: "data", label: "Your Data", icon: "ph ph-database" },
      { id: "security", label: "Security", icon: "ph ph-shield" },
      { id: "trash", label: "Trash Bin", icon: "ph ph-trash" },
    ].filter(t => t.label.toLowerCase().includes(q));
    if (settingsTabs.length) {
      results.push({ group: "Settings", items: settingsTabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, href: `/settings?tab=${t.id}` })) });
    }

    // Clients
    const matchedClients = clients.filter(c => c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q));
    if (matchedClients.length) {
      results.push({ group: "Clients", items: matchedClients.map(c => ({ id: c.id, label: c.name + (c.company ? ` (${c.company})` : ''), icon: "ph ph-user-circle", href: `/clients?id=${c.id}` })) });
    }

    // Invoices
    const matchedInvoices = invoices.filter(i => i.id.toLowerCase().includes(q) || i.client.toLowerCase().includes(q));
    if (matchedInvoices.length) {
      results.push({ group: "Invoices", items: matchedInvoices.map(i => ({ id: i.id, label: `${i.id} - ${i.client}`, icon: "ph ph-receipt", href: `/invoices?id=${i.id}` })) });
    }

    // Expenses
    const matchedExpenses = expenses.filter(e => e.merchant.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    if (matchedExpenses.length) {
      results.push({ group: "Expenses", items: matchedExpenses.map(e => ({ id: e.id, label: `${e.merchant} - ${e.description}`, icon: "ph ph-wallet", href: `/expenses?id=${e.id}` })) });
    }

    // Catalog
    const matchedCatalog = catalogItems.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    if (matchedCatalog.length) {
      results.push({ group: "Catalog", items: matchedCatalog.map(c => ({ id: c.id, label: c.name, icon: "ph ph-box-arrow-down", href: `/catalog?id=${c.id}` })) });
    }

    // Todo
    const matchedTodos = todoTasks.filter(t => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    if (matchedTodos.length) {
      results.push({ group: "To-Do", items: matchedTodos.map(t => ({ id: t.id, label: t.title, icon: "ph ph-check-square-offset", href: `/todo?id=${t.id}` })) });
    }

    // Vendors
    const matchedVendors = vendors.filter(v => v.name.toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q) || (v.phone || "").toLowerCase().includes(q));
    if (matchedVendors.length) {
      results.push({ group: "Vendors", items: matchedVendors.map(v => ({ id: v.id, label: v.name, icon: "ph ph-storefront", href: `/outsourcing?vendor=${v.id}` })) });
    }

    // Payables (Outsourcing Invoices)
    const matchedPayables = outsourcingInvoices.filter(i => i.id.toLowerCase().includes(q) || i.vendor.toLowerCase().includes(q));
    if (matchedPayables.length) {
      results.push({ group: "Payables", items: matchedPayables.map(i => ({ id: i.id, label: `${i.id} - ${i.vendor}`, icon: "ph ph-receipt-x", href: `/outsourcing?id=${i.id}` })) });
    }

    return results;
  }, [searchQuery, clients, invoices, expenses, catalogItems, todoTasks, vendors, outsourcingInvoices]);

  return { searchResults };
}

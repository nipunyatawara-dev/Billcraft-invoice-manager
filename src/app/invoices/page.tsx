"use client";

import { formatCurrency, getInvoiceTotals, parseInvoiceAmount, type Invoice, type InvoiceStatus } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { FormEvent, useMemo, useState } from "react";

const STATUS_FILTERS = ["All", "Paid", "Unpaid", "Overdue"] as const;
const STATUSES: InvoiceStatus[] = ["Paid", "Unpaid", "Overdue"];

type ModalMode = "create" | "edit" | "view" | null;

type InvoiceForm = {
  client: string;
  email: string;
  phone: string;
  date: string;
  amount: string;
  status: InvoiceStatus;
};

const EMPTY_FORM: InvoiceForm = {
  client: "",
  email: "",
  phone: "",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  status: "Unpaid",
};

function toDateInputValue(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function toAmountInputValue(amount: string) {
  return amount.replace(/[$,]/g, "");
}

function getInvoiceForm(invoice: Invoice): InvoiceForm {
  return {
    client: invoice.client,
    email: invoice.email,
    phone: invoice.phone,
    date: toDateInputValue(invoice.date),
    amount: toAmountInputValue(invoice.amount),
    status: invoice.status,
  };
}

export default function Invoices() {
  const { invoices, saveInvoice, exportInvoice } = useInvoices();
  const { currency } = useCurrency();
  const [activeFilter, setActiveFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);

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

  function openCreateModal() {
    setSelectedInvoice(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModalMode("create");
  }

  function openEditModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setForm(getInvoiceForm(invoice));
    setModalMode("edit");
  }

  function openViewModal(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setForm(getInvoiceForm(invoice));
    setModalMode("view");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedInvoice(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.client.trim() || !form.amount.trim()) {
      return;
    }

    saveInvoice({
      ...form,
      id: modalMode === "edit" ? selectedInvoice?.id : undefined,
      avatar: selectedInvoice?.avatar,
    });
    closeModal();
  }

  return (
    <>
      <main className="flex-1 max-w-[1100px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[13px] font-medium text-[var(--muted)] tracking-wide mb-1.5">Billing</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold tracking-tight text-[var(--foreground)] leading-[1.1]">
              Invoices
            </h1>
          </div>
          <button onClick={openCreateModal} className="bg-[var(--accent)] text-white px-4 py-2 font-medium rounded-lg flex items-center gap-1.5 hover:bg-[var(--accent-hover)] transition-smooth active:scale-[0.97] text-[13px]">
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Invoice
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[var(--featured)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-[var(--featured-text)]/[0.04] blur-2xl pointer-events-none" />
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Billed</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--featured-text)] font-display">{formatCurrency(totals.totalAmount, currency)}</p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Total</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{invoices.length} <span className="text-[12px] font-normal text-[var(--muted)]">invoices</span></p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Paid</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{totals.paidCount} <span className="text-[12px] font-normal text-[var(--sage)]">cleared</span></p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Attention</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{totals.unpaidCount + totals.overdueCount} <span className="text-[12px] font-normal text-[var(--accent)]">pending</span></p>
          </div>
        </div>

        {/* Search + Filter Chips */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)]/25 text-[18px]">search</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-9 pr-3 border border-[var(--card-border)] rounded-lg py-2 text-[13px] bg-transparent outline-none transition-smooth text-[var(--foreground)] placeholder:text-[var(--foreground)]/25 focus:border-[var(--foreground)]/20"
              placeholder="Search invoices..."
              type="text"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-smooth active:scale-[0.95] tracking-wide uppercase ${
                  activeFilter === filter
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04] border border-[var(--card-border)]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Cards */}
        <div className="space-y-2">
          {filteredInvoices.map((invoice) => (
            <button
              type="button"
              key={invoice.id}
              onClick={() => openViewModal(invoice)}
              className="w-full text-left bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 lg:p-5 hover:border-[var(--foreground)]/12 transition-smooth group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg border border-[var(--card-border)] overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" alt={invoice.client} src={invoice.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[14px] text-[var(--foreground)] group-hover:text-[var(--accent)] transition-smooth truncate">{invoice.client}</h3>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
                    <span className="font-medium">{invoice.id}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[var(--foreground)]/15"></span>
                    {invoice.date}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-lg font-semibold tracking-tight text-[var(--foreground)] font-display">{formatCurrency(parseInvoiceAmount(invoice.amount), currency)}</p>
                  <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase mt-0.5">{currency}</p>
                </div>
                <span className={`px-2 py-1 text-[10px] font-semibold rounded-md tracking-wide uppercase shrink-0 ${invoice.statusColor}`}>
                  {invoice.status}
                </span>
                <div className="flex gap-0.5 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <span onClick={(event) => { event.stopPropagation(); openViewModal(invoice); }} className="size-8 flex items-center justify-center rounded-lg text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="View">
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); exportInvoice(invoice); }} className="size-8 flex items-center justify-center rounded-lg text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Download">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} className="size-8 flex items-center justify-center rounded-lg text-[var(--foreground)]/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth" title="Edit">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 sm:hidden">
                <p className="text-base font-semibold tracking-tight text-[var(--foreground)] font-display">{formatCurrency(parseInvoiceAmount(invoice.amount), currency)}</p>
              </div>
            </button>
          ))}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">search_off</span>
              <p className="text-[13px] text-[var(--muted)] font-medium">No invoices match your filters</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--card-border)]">
          <p className="text-[11px] text-[var(--muted)] font-medium">Showing {filteredInvoices.length} of {invoices.length} invoices</p>
        </div>
      </main>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="relative bg-[var(--background)] rounded-2xl w-full max-w-xl p-7 shadow-2xl max-h-[90vh] overflow-y-auto border border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)] font-display">
                {modalMode === "create" ? "New Invoice" : modalMode === "edit" ? "Edit Invoice" : selectedInvoice?.id}
              </h2>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>

            {isFormMode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-client">Client</label>
                  <input id="invoice-client" required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} placeholder="Client or company name" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-email">Email</label>
                    <input id="invoice-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="billing@example.com" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-phone">Phone</label>
                    <input id="invoice-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 000-0000" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-date">Date</label>
                    <input id="invoice-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-amount">Amount</label>
                    <input id="invoice-amount" required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="invoice-status">Status</label>
                    <select id="invoice-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as InvoiceStatus })} className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth">
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-smooth rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="bg-[var(--accent)] text-white px-5 py-2 font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-smooth active:scale-[0.97] text-[13px]">
                    {modalMode === "edit" ? "Save Changes" : "Create Invoice"}
                  </button>
                </div>
              </form>
            ) : selectedInvoice && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <img className="size-12 rounded-lg object-cover" alt={selectedInvoice.client} src={selectedInvoice.avatar} />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{selectedInvoice.client}</h3>
                    <p className="text-[12px] text-[var(--muted)]">{selectedInvoice.email || "No email added"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Amount", formatCurrency(parseInvoiceAmount(selectedInvoice.amount), currency)],
                    ["Status", selectedInvoice.status],
                    ["Date", selectedInvoice.date],
                    ["Phone", selectedInvoice.phone || "No phone added"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-[var(--card-border)] p-3.5">
                      <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-1.5">{label}</p>
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => exportInvoice(selectedInvoice)} className="px-4 py-2 border border-[var(--card-border)] text-[var(--muted)] rounded-lg text-[13px] font-medium hover:bg-[var(--foreground)]/[0.03] transition-smooth">
                    Download
                  </button>
                  <button onClick={() => openEditModal(selectedInvoice)} className="bg-[var(--accent)] text-white px-5 py-2 font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-smooth active:scale-[0.97] text-[13px]">
                    Edit Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-[var(--card-border)] p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

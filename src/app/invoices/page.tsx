"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
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
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-1">Billing</p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] leading-[1.1]">
              Invoices
            </h1>
          </div>
          <button onClick={openCreateModal} className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-5 py-2.5 font-medium rounded-full flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.97] text-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Invoice
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#212842] dark:bg-[#F0E7D5] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#F0E7D5]/5 dark:bg-[#212842]/5 blur-2xl pointer-events-none" />
            <p className="text-xs font-medium text-[#F0E7D5]/50 dark:text-[#212842]/50 tracking-wide uppercase mb-3">Total Billed</p>
            <p className="text-2xl font-semibold tracking-tight text-[#F0E7D5] dark:text-[#212842] font-display">{formatCurrency(totals.totalAmount, currency)}</p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Total</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{invoices.length} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">invoices</span></p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Paid</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{totals.paidCount} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">cleared</span></p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Attention</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{totals.unpaidCount + totals.overdueCount} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">pending</span></p>
          </div>
        </div>

        {/* Search + Filter Chips */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#212842]/30 dark:text-[#F0E7D5]/30 text-[20px]">search</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-11 pr-4 border border-[#212842]/8 dark:border-[#F0E7D5]/8 rounded-full py-2.5 text-sm bg-transparent outline-none transition-all text-[#212842] dark:text-[#F0E7D5] placeholder:text-[#212842]/30 dark:placeholder:text-[#F0E7D5]/30 focus:border-[#212842]/25 dark:focus:border-[#F0E7D5]/25"
              placeholder="Search invoices..."
              type="text"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all active:scale-[0.95] tracking-wide uppercase ${
                  activeFilter === filter
                    ? "bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842]"
                    : "text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 border border-[#212842]/8 dark:border-[#F0E7D5]/8"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Cards */}
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <button
              type="button"
              key={invoice.id}
              onClick={() => openViewModal(invoice)}
              className="w-full text-left bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl border border-[#212842]/6 dark:border-[#F0E7D5]/6 p-5 lg:p-6 hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="size-12 rounded-2xl border border-[#212842]/8 dark:border-[#F0E7D5]/8 overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" alt={invoice.client} src={invoice.avatar} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[15px] text-[#212842] dark:text-[#F0E7D5] group-hover:opacity-70 transition-opacity truncate">{invoice.client}</h3>
                  <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-0.5 flex items-center gap-2">
                    <span className="font-medium">{invoice.id}</span>
                    <span className="w-1 h-1 rounded-full bg-[#212842]/20 dark:bg-[#F0E7D5]/20"></span>
                    {invoice.date}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{formatCurrency(parseInvoiceAmount(invoice.amount), currency)}</p>
                  <p className="text-[10px] text-[#212842]/30 dark:text-[#F0E7D5]/30 tracking-wide uppercase mt-0.5">USD</p>
                </div>
                <span className={`px-3 py-1.5 text-[10px] font-semibold rounded-full tracking-wide uppercase shrink-0 ${invoice.statusColor}`}>
                  {invoice.status}
                </span>
                <div className="flex gap-1 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <span onClick={(event) => { event.stopPropagation(); openViewModal(invoice); }} className="size-9 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors" title="View">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); exportInvoice(invoice); }} className="size-9 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors" title="Download">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </span>
                  <span onClick={(event) => { event.stopPropagation(); openEditModal(invoice); }} className="size-9 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors" title="Edit">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 sm:hidden">
                <p className="text-lg font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{formatCurrency(parseInvoiceAmount(invoice.amount), currency)}</p>
              </div>
            </button>
          ))}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[48px] text-[#212842]/15 dark:text-[#F0E7D5]/15 mb-4 block">search_off</span>
              <p className="text-sm text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">No invoices match your filters</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#212842]/6 dark:border-[#F0E7D5]/6">
          <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">Showing {filteredInvoices.length} of {invoices.length} invoices</p>
        </div>
      </main>

      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[#212842]/40 dark:bg-[#212842]/60 backdrop-blur-sm" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="relative bg-[#F0E7D5] dark:bg-[#2d3555] rounded-3xl w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-[#212842] dark:text-[#F0E7D5] font-display">
                {modalMode === "create" ? "New Invoice" : modalMode === "edit" ? "Edit Invoice" : selectedInvoice?.id}
              </h2>
              <button onClick={closeModal} className="size-9 flex items-center justify-center rounded-xl hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
                <span className="material-symbols-outlined text-[20px] text-[#212842]/40 dark:text-[#F0E7D5]/40">close</span>
              </button>
            </div>

            {isFormMode ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="invoice-client">Client</label>
                  <input id="invoice-client" required value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} placeholder="Client or company name" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="invoice-email">Email</label>
                    <input id="invoice-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="billing@example.com" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="invoice-phone">Phone</label>
                    <input id="invoice-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+1 (555) 000-0000" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="invoice-date">Date</label>
                    <input id="invoice-date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="invoice-amount">Amount</label>
                    <input id="invoice-amount" required type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="invoice-status">Status</label>
                    <select id="invoice-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as InvoiceStatus })} className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors">
                      {STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:text-[#212842] dark:hover:text-[#F0E7D5] transition-colors rounded-full">
                    Cancel
                  </button>
                  <button type="submit" className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-6 py-2.5 font-medium rounded-full hover:opacity-90 transition-all active:scale-[0.97] text-sm">
                    {modalMode === "edit" ? "Save Changes" : "Create Invoice"}
                  </button>
                </div>
              </form>
            ) : selectedInvoice && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <img className="size-14 rounded-2xl object-cover" alt={selectedInvoice.client} src={selectedInvoice.avatar} />
                  <div>
                    <h3 className="text-xl font-semibold text-[#212842] dark:text-[#F0E7D5]">{selectedInvoice.client}</h3>
                    <p className="text-sm text-[#212842]/40 dark:text-[#F0E7D5]/40">{selectedInvoice.email || "No email added"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Amount", formatCurrency(parseInvoiceAmount(selectedInvoice.amount), currency)],
                    ["Status", selectedInvoice.status],
                    ["Date", selectedInvoice.date],
                    ["Phone", selectedInvoice.phone || "No phone added"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-[#212842]/6 dark:border-[#F0E7D5]/6 p-4">
                      <p className="text-[10px] font-semibold text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-widest uppercase mb-2">{label}</p>
                      <p className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => exportInvoice(selectedInvoice)} className="px-5 py-2.5 border border-[#212842]/10 dark:border-[#F0E7D5]/10 text-[#212842]/60 dark:text-[#F0E7D5]/60 rounded-full text-sm font-medium hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
                    Download
                  </button>
                  <button onClick={() => openEditModal(selectedInvoice)} className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-6 py-2.5 font-medium rounded-full hover:opacity-90 transition-all active:scale-[0.97] text-sm">
                    Edit Invoice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-[#212842]/6 dark:border-[#F0E7D5]/6 p-6 text-center">
        <p className="text-xs font-medium text-[#212842]/30 dark:text-[#F0E7D5]/30">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}

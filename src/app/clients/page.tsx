"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, formatDisplayDate, getAmountPaid, getBalanceDue, getInvoiceTotal, getPaymentState, type Client, type Invoice } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { useUserData } from "@/hooks/use-user-data";
import { exportClientStatementPdf } from "@/lib/pdf-export";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type ClientWithInvoices = Client & { invoices: Invoice[]; totalBilled: number };

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
  address: string;
  deliveryLink: string;
  avatar: string;
  notes: string;
};

const EMPTY_FORM: ClientForm = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  company: "",
  address: "",
  deliveryLink: "",
  avatar: "",
  notes: "",
};

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const { invoices, clientRecords, saveClient } = useInvoices();
  const { activeProfile } = useUserData();
  const { currency } = useCurrency();
  const shouldReduceMotion = useReducedMotion();

  const clients = useMemo<ClientWithInvoices[]>(() => (
    clientRecords.map((client) => {
      const clientInvoices = invoices.filter((invoice) => invoice.clientId === client.id || invoice.client === client.name);

      return {
        ...client,
        invoices: clientInvoices,
        totalBilled: clientInvoices.reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0),
      };
    })
  ), [clientRecords, invoices]);

  const filteredClients = clients.filter((client) => {
    const normalizedSearch = searchQuery.toLowerCase();

    return searchQuery === "" ||
      client.name.toLowerCase().includes(normalizedSearch) ||
      client.email.toLowerCase().includes(normalizedSearch) ||
      (client.whatsapp || "").toLowerCase().includes(normalizedSearch) ||
      (client.company || "").toLowerCase().includes(normalizedSearch);
  });

  const totalRevenue = clients.reduce((sum, client) => sum + client.totalBilled, 0);
  const selectedClientData = selectedClientId ? clients.find((client) => client.id === selectedClientId) : null;
  const clientModalTitle = editingClientId ? "Edit Client" : "Add Client";

  function openAddClient() {
    setEditingClientId(null);
    setForm(EMPTY_FORM);
    setShowClientModal(true);
  }

  function openEdit(client: Client) {
    setEditingClientId(client.id);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp || "",
      company: client.company || "",
      address: client.address || "",
      deliveryLink: client.deliveryLink || "",
      avatar: client.avatar,
      notes: client.notes || "",
    });
    setShowClientModal(true);
  }

  function closeModal() {
    if (isSaving) {
      return;
    }

    setShowClientModal(false);
    setEditingClientId(null);
    setForm(EMPTY_FORM);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
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

  async function handleSaveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || isSaving) {
      if (!isSaving) {
        notify.warning({
          title: "Client name required",
          description: "Add a name before saving this client.",
        });
      }
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingClientId);
      const savedClient = await notifyPromise(saveClient(editingClientId, form).then((client) => {
        if (!client) {
          throw new Error("Create a profile before saving clients.");
        }

        return client;
      }), {
        loading: {
          title: isEditing ? "Updating client..." : "Adding client...",
          description: "Saving client details locally.",
        },
        success: (client) => ({
          title: isEditing ? "Client updated" : "Client added",
          description: `${client.name} is ready for future invoices.`,
        }),
        error: (error) => ({
          title: isEditing ? "Client update failed" : "Client save failed",
          description: getToastErrorMessage(error, "Unable to save this client."),
        }),
      });

      if (savedClient) {
        setSelectedClientId(savedClient.id);
      }

      setShowClientModal(false);
      setEditingClientId(null);
      setForm(EMPTY_FORM);
    } finally {
      setIsSaving(false);
    }
  }

  function getStatusBreakdown(clientInvoices: Invoice[]) {
    const paid = clientInvoices.filter((invoice) => getBalanceDue(invoice) <= 0).length;
    const unpaid = clientInvoices.filter((invoice) => getBalanceDue(invoice) > 0 && getPaymentState(invoice) !== "Overdue").length;
    const overdue = clientInvoices.filter((invoice) => getPaymentState(invoice) === "Overdue").length;

    return { paid, unpaid, overdue };
  }

  function getAveragePaymentDays(clientInvoices: Invoice[]) {
    const paidInvoices = clientInvoices
      .map((invoice) => {
        const paidAt = invoice.paidAt || invoice.payments?.[0]?.paidAt;
        const invoiceDate = new Date(invoice.date);
        const paymentDate = paidAt ? new Date(paidAt) : null;

        if (!paymentDate || Number.isNaN(invoiceDate.getTime()) || Number.isNaN(paymentDate.getTime())) {
          return null;
        }

        return Math.max(Math.round((paymentDate.getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000)), 0);
      })
      .filter((days): days is number => typeof days === "number");

    return paidInvoices.length > 0
      ? Math.round(paidInvoices.reduce((sum, days) => sum + days, 0) / paidInvoices.length)
      : null;
  }

  async function handleExportStatement(client: ClientWithInvoices) {
    try {
      await exportClientStatementPdf(client, activeProfile, currency);
      notify.success({
        title: "Download started",
        description: `Billing statement for ${client.name} was exported as a PDF.`,
      });
    } catch (error) {
      notify.error({
        title: "Download failed",
        description: getToastErrorMessage(error, "Unable to export billing statement."),
      });
    }
  }

  function quickCreateInvoice(clientId: string) {
    window.sessionStorage.setItem("billcraft.quick-invoice-client-id", clientId);
    window.location.href = "/invoices";
  }

  function toggleClient(clientId: string) {
    setSelectedClientId((currentClientId) => currentClientId === clientId ? null : clientId);
  }

  function handleClientCardKeyDown(event: KeyboardEvent<HTMLDivElement>, clientId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleClient(clientId);
  }

  return (
    <>
      <main className="app-main flex-1">
        <div className="page-heading">
          <div>
            <AnimatedText as="p" text="Manage" effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Clients"
              effect="micro-scale-fade"
              className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
              delayMs={70}
            />
          </div>
          <button onClick={openAddClient} className="btn-primary active:scale-[0.97]">
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add Client
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="surface-featured p-4 relative overflow-hidden">
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Revenue</p>
            <p className="text-xl font-semibold text-[var(--featured-text)] font-display"><AnimatedNumber value={formatCurrency(totalRevenue, currency)} /></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Regular Clients</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={clients.length} /> <span className="text-[12px] font-normal text-[var(--positive)]">saved</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Invoices</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={invoices.length} /> <span className="text-[12px] font-normal text-[var(--muted)]">total</span></p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Avg / Client</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(clients.length > 0 ? totalRevenue / clients.length : 0, currency)} /></p>
          </div>
        </div>

        <div className="mb-6">
          <div className="search-field" data-expanded={searchQuery.length > 0}>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search clients..."
              type="text"
            />
            <span className="search-icon-btn">
              <span className="material-symbols-outlined text-[15px]">search</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {filteredClients.map((client) => {
            const breakdown = getStatusBreakdown(client.invoices);
            const isSelected = selectedClientId === client.id;
            const outstandingBalance = client.invoices.reduce((sum, invoice) => sum + getBalanceDue(invoice), 0);
            const averagePaymentDays = getAveragePaymentDays(client.invoices);

            return (
              <div key={client.id} className="flex flex-col">
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isSelected}
                  aria-controls={`client-details-${client.id}`}
                  onClick={() => toggleClient(client.id)}
                  onKeyDown={(event) => handleClientCardKeyDown(event, client.id)}
                  className={`surface-card p-5 cursor-pointer transition-smooth group ${
                    isSelected
                      ? "border-[var(--accent)]/30 rounded-b-none"
                      : "border-[var(--card-border)] hover:border-[var(--foreground)]/12"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-xl border border-[var(--card-border)] overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" alt={client.name} src={client.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[14px] text-[var(--foreground)] truncate">{client.name}</h3>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{client.email || client.whatsapp || client.company || "No contact details"}</p>
                        </div>
                        <button
                          onClick={(event) => { event.stopPropagation(); openEdit(client); }}
                          className="size-7 flex items-center justify-center rounded-full text-[var(--foreground)]/20 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth opacity-0 group-hover:opacity-100"
                          aria-label={`Edit ${client.name}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                        <div>
                          <p className="text-base font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(client.totalBilled, currency)} /></p>
                          <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase">Total Billed</p>
                        </div>
                        <div className="w-px h-7 bg-[var(--card-border)]" />
                        <div>
                          <p className="text-base font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={client.invoices.length} /></p>
                          <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase">Invoices</p>
                        </div>
                        <div className="w-px h-7 bg-[var(--card-border)]" />
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.paid > 0 && <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full tracking-wide uppercase bg-[var(--positive)]/15 text-[var(--positive)]"><AnimatedNumber value={breakdown.paid} /> paid</span>}
                          {breakdown.unpaid > 0 && <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full tracking-wide uppercase bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/50"><AnimatedNumber value={breakdown.unpaid} /> unpaid</span>}
                          {breakdown.overdue > 0 && <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full tracking-wide uppercase bg-[var(--accent)]/15 text-[var(--accent)]"><AnimatedNumber value={breakdown.overdue} /> overdue</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-border)]">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted)]">
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">phone</span>
                          {client.phone}
                        </span>
                      )}
                      {client.whatsapp && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">chat</span>
                          {client.whatsapp}
                        </span>
                      )}
                      {client.company && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">business</span>
                          {client.company}
                        </span>
                      )}
                    </div>
                    <span className={`material-symbols-outlined text-[16px] text-[var(--foreground)]/20 transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isSelected && selectedClientData && (
                    <motion.div
                      key={`${client.id}-details`}
                      id={`client-details-${client.id}`}
                      initial={shouldReduceMotion ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: shouldReduceMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-b-2xl border border-t-0 border-[var(--accent)]/30 bg-[var(--foreground)]/[0.02] overflow-hidden">
                        <div className="grid grid-cols-1 gap-3 border-b border-[var(--card-border)] p-5 lg:grid-cols-4">
                          <div className="rounded-xl border border-[var(--card-border)] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Outstanding</p>
                            <p className="mt-1 font-display text-lg font-semibold text-[var(--foreground)]"><AnimatedNumber value={formatCurrency(outstandingBalance, currency)} /></p>
                          </div>
                          <div className="rounded-xl border border-[var(--card-border)] p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Avg Pay Time</p>
                            <p className="mt-1 font-display text-lg font-semibold text-[var(--foreground)]">{averagePaymentDays === null ? "No data" : <><AnimatedNumber value={averagePaymentDays} /> days</>}</p>
                          </div>
                          <div className="rounded-xl border border-[var(--card-border)] p-3 lg:col-span-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Delivery Location</p>
                            {client.deliveryLink ? (
                              <a
                                href={client.deliveryLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block truncate text-[12px] font-semibold text-[var(--accent)]"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {client.deliveryLink}
                              </a>
                            ) : (
                              <p className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">No finished-work folder saved yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.25fr_0.75fr]">
                          <div className="border-b border-[var(--card-border)] lg:border-b-0 lg:border-r">
                            <div className="flex items-center justify-between gap-3 px-5 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Invoices</p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => handleExportStatement(client)} className="btn-secondary min-h-8 px-3 py-1.5 text-[11px]">
                                  <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                  Statement PDF
                                </button>
                                <button type="button" onClick={() => quickCreateInvoice(client.id)} className="btn-secondary min-h-8 px-3 py-1.5 text-[11px]">
                                  <span className="material-symbols-outlined text-[14px]">add</span>
                                  Create Invoice
                                </button>
                              </div>
                            </div>
                            {selectedClientData.invoices.length > 0 ? selectedClientData.invoices.map((invoice) => (
                              <div key={invoice.id} className="flex items-center justify-between gap-3 border-t border-[var(--card-border)] px-5 py-3 transition-smooth hover:bg-[var(--foreground)]/[0.02]">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="material-symbols-outlined text-[16px] text-[var(--foreground)]/25">receipt_long</span>
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{invoice.id}</p>
                                    <p className="text-[11px] text-[var(--muted)]">{invoice.date} · <AnimatedNumber value={formatCurrency(getAmountPaid(invoice), currency)} /> collected</p>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-[13px] font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                                  <p className="text-[10px] font-medium text-[var(--muted)]"><AnimatedNumber value={formatCurrency(getBalanceDue(invoice), currency)} /> due</p>
                                </div>
                              </div>
                            )) : (
                              <div className="border-t border-[var(--card-border)] px-5 py-5 text-[12px] text-[var(--muted)]">No invoices for this client yet.</div>
                            )}
                          </div>

                          <div>
                            <div className="px-5 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Contact History</p>
                            </div>
                            <div className="space-y-0 border-t border-[var(--card-border)]">
                              {[
                                client.createdAt ? { icon: "person_add", label: "Client added", date: client.createdAt } : null,
                                client.updatedAt && client.updatedAt !== client.createdAt ? { icon: "edit_note", label: "Contact updated", date: client.updatedAt } : null,
                                ...selectedClientData.invoices.slice(0, 4).map((invoice) => ({
                                  icon: getBalanceDue(invoice) <= 0 ? "payments" : "request_quote",
                                  label: `${invoice.id} ${getPaymentState(invoice).toLowerCase()}`,
                                  date: invoice.paidAt || invoice.date,
                                })),
                              ].filter(Boolean).map((event) => (
                                <div key={`${event!.label}-${event!.date}`} className="flex items-start gap-2.5 border-b border-[var(--card-border)] px-5 py-3 last:border-b-0">
                                  <span className="material-symbols-outlined mt-0.5 text-[15px] text-[var(--foreground)]/25">{event!.icon}</span>
                                  <div>
                                    <p className="text-[12px] font-semibold text-[var(--foreground)]">{event!.label}</p>
                                    <p className="text-[11px] text-[var(--muted)]">{formatDisplayDate(event!.date)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">person_search</span>
            <AnimatedText as="p" text="No regular clients found" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
          </div>
        )}
      </main>

      {showClientModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--card)] shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">person</span>
                <AnimatedText
                  as="h2"
                  text={clientModalTitle}
                  effect="fade-through"
                  className="text-lg font-bold text-[var(--foreground)] leading-none font-display"
                  replayKey={clientModalTitle}
                />
              </div>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth text-[var(--muted)] hover:text-[var(--foreground)]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveClient} className="flex-1 flex flex-col min-h-0 bg-[var(--background)]/35">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* 1. Identity & Brand Card */}
                <div className="surface-card p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Identity & Brand</h3>
                  
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-2xl border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0 shadow-inner relative group">
                      {form.avatar ? (
                        <img className="w-full h-full object-cover" alt="Client preview" src={form.avatar} />
                      ) : (
                        <span className="material-symbols-outlined text-[24px] text-[var(--foreground)]/20">person</span>
                      )}
                    </div>
                    <label className="btn-secondary text-[11px] min-h-7 px-3 py-1 cursor-pointer hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                      <span>{form.avatar ? "Change Avatar" : "Upload Picture"}</span>
                      <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-name">Client Name</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">person</span>
                        <input
                          id="client-name"
                          required
                          value={form.name}
                          onChange={(event) => setForm({ ...form, name: event.target.value })}
                          placeholder="Client or company name"
                          className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-company">Company</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">business</span>
                        <input
                          id="client-company"
                          value={form.company}
                          onChange={(event) => setForm({ ...form, company: event.target.value })}
                          placeholder="Company name"
                          className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Contact Coordinates Card */}
                <div className="surface-card p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Contact Coordinates</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-email">Email Address</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">mail</span>
                        <input
                          id="client-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                          placeholder="client@example.com"
                          className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-phone">Phone Number</label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">phone</span>
                        <input
                          id="client-phone"
                          value={form.phone}
                          onChange={(event) => setForm({ ...form, phone: event.target.value })}
                          placeholder="+1 (555) 000-0000"
                          className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-whatsapp">WhatsApp Contact</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">chat</span>
                      <input
                        id="client-whatsapp"
                        value={form.whatsapp}
                        onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Deliverables & Notes Card */}
                <div className="surface-card p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Work Delivery & Notes</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-delivery-link">Finished Work Folder</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">folder_shared</span>
                      <input
                        id="client-delivery-link"
                        type="url"
                        value={form.deliveryLink}
                        onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
                        placeholder="https://drive.google.com/..."
                        className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-address">Billing Address</label>
                    <textarea
                      id="client-address"
                      value={form.address}
                      onChange={(event) => setForm({ ...form, address: event.target.value })}
                      placeholder="Billing address for client statements"
                      className="field-control min-h-16 px-3 py-1.5 text-[13px] resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="client-notes">Relationship Notes</label>
                    <textarea
                      id="client-notes"
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="Scope rules, payment preferences, or context notes..."
                      className="field-control min-h-16 px-3 py-1.5 text-[13px] resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card)] shrink-0 z-10">
                <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 rounded-full text-[12px] font-bold">
                  Cancel
                </button>
                <button type="submit" className="btn-primary min-h-9 px-5 rounded-full text-[12px] font-bold shadow-md active:scale-[0.97]" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingClientId ? "Save Changes" : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}

"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState, useRef } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, formatDisplayDate, getAmountPaid, getBalanceDue, getInvoiceTotal, getPaymentState, type Client, type Invoice } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { exportClientStatementPdf } from "@/lib/pdf-export";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import { PhoneInput } from "@/components/phone-input";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
import UserPlusIcon from "@/components/icons/user-plus-icon";
import UsersIcon from "@/components/icons/users-icon";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import ChartLineIcon from "@/components/icons/chart-line-icon";
import PenIcon from "@/components/icons/pen-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import { PageStatsRow } from "@/components/page-stats-row";

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
  const userPlusIconRef = useRef<AnimatedIconHandle>(null);
  const totalRevenueRef = useRef<AnimatedIconHandle>(null);
  const activeClientsRef = useRef<AnimatedIconHandle>(null);
  const invoicesIconRef = useRef<AnimatedIconHandle>(null);
  const avgClientRef = useRef<AnimatedIconHandle>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        const searchInput = document.querySelector(".search-field input") as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { invoices, clients: clientRecords, saveClient, activeProfile } = useUserData();
  const { currency } = useCurrency();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id && clientRecords.length > 0 && !selectedClientId) {
        setSelectedClientId(id);
      }
    }
  }, [clientRecords, selectedClientId]);

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
        {/* Page Header Area */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <AnimatedText as="p" text={PAGE_EYEBROWS["/clients"]} effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Clients"
              effect="micro-scale-fade"
              className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
              delayMs={70}
            />
            <AnimatedText as="p" text="Organize customer records, statements, payments, and relationships." effect="micro-scale-fade" className="text-muted mt-2 text-base font-medium" delayMs={140} />
          </div>
          
          <button 
            onClick={openAddClient} 
            onMouseEnter={() => userPlusIconRef.current?.startAnimation()}
            onMouseLeave={() => userPlusIconRef.current?.stopAnimation()}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl active:scale-[0.97]"
          >
            <UserPlusIcon ref={userPlusIconRef} size={20} />
            Add Client
          </button>
        </header>

        <PageStatsRow
          stats={[
            {
              label: "Total Revenue",
              hint: "all-time",
              tone: "positive",
              icon: ChartLineIcon,
              iconRef: totalRevenueRef,
              value: <AnimatedNumber value={formatCurrency(totalRevenue, currency)} />,
            },
            {
              label: "Active Clients",
              hint: "saved",
              tone: "accent",
              icon: UsersIcon,
              iconRef: activeClientsRef,
              value: <AnimatedNumber value={clients.length} />,
            },
            {
              label: "Invoices",
              hint: "issued",
              icon: FileDescriptionIcon,
              iconRef: invoicesIconRef,
              value: <AnimatedNumber value={invoices.length} />,
            },
            {
              label: "Avg / Client",
              hint: "lifetime",
              icon: ChartLineIcon,
              iconRef: avgClientRef,
              value: (
                <AnimatedNumber
                  value={formatCurrency(clients.length > 0 ? totalRevenue / clients.length : 0, currency)}
                />
              ),
            },
          ]}
        />

        <div className="mb-6">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search clients..."
          />
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
                  className={`bg-card text-card-foreground border p-5 cursor-pointer transition-all duration-300 group ${
                    isSelected
                      ? "border-accent/30 rounded-t-xl rounded-b-none shadow-xl"
                      : "border-card-border hover:border-foreground/12 hover-row rounded-xl"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-xl border border-card-border overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm bg-accent/10 text-accent">
                      {client.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="w-full h-full object-cover" alt={client.name} src={client.avatar} />
                      ) : (
                        (client.name || "C")[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[14px] text-foreground truncate">{client.name}</h3>
                          <p className="text-[11px] text-muted mt-0.5 truncate">{client.email || client.whatsapp || client.company || "No contact details"}</p>
                        </div>
                        <button
                          onClick={(event) => { event.stopPropagation(); openEdit(client); }}
                          className="size-7 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          aria-label={`Edit ${client.name}`}
                        >
                          <PenIcon size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                        <div>
                          <p className="text-base font-semibold text-foreground font-display"><AnimatedNumber value={formatCurrency(client.totalBilled, currency)} /></p>
                          <p className="text-[10px] text-foreground/25 tracking-wide uppercase">Total Billed</p>
                        </div>
                        <div className="w-px h-7 bg-card-border" />
                        <div>
                          <p className="text-base font-semibold text-foreground font-display"><AnimatedNumber value={client.invoices.length} /></p>
                          <p className="text-[10px] text-foreground/25 tracking-wide uppercase">Invoices</p>
                        </div>
                        <div className="w-px h-7 bg-card-border" />
                        <div className="flex flex-wrap gap-1.5">
                          {breakdown.paid > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded-md tracking-wider uppercase bg-positive/10 border border-positive/10 text-positive"><AnimatedNumber value={breakdown.paid} /> paid</span>}
                          {breakdown.unpaid > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded-md tracking-wider uppercase bg-foreground/[0.03] border border-card-border text-muted"><AnimatedNumber value={breakdown.unpaid} /> unpaid</span>}
                          {breakdown.overdue > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded-md tracking-wider uppercase bg-accent/10 border border-accent/10 text-accent"><AnimatedNumber value={breakdown.overdue} /> overdue</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-card-border">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
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
                    <span className={`material-symbols-outlined text-[16px] text-foreground/20 transition-transform duration-200 ${isSelected ? "rotate-180" : ""}`}>
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
                      <div className="rounded-b-xl border border-t-0 border-accent/30 bg-foreground/[0.02] overflow-hidden">
                        <div className="grid grid-cols-1 gap-3 border-b border-card-border p-5 lg:grid-cols-4">
                          <div className="rounded-xl border border-card-border p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Outstanding</p>
                            <p className="mt-1 font-display text-lg font-semibold text-foreground"><AnimatedNumber value={formatCurrency(outstandingBalance, currency)} /></p>
                          </div>
                          <div className="rounded-xl border border-card-border p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Avg Pay Time</p>
                            <p className="mt-1 font-display text-lg font-semibold text-foreground">{averagePaymentDays === null ? "No data" : <><AnimatedNumber value={averagePaymentDays} /> days</>}</p>
                          </div>
                          <div className="rounded-xl border border-card-border p-3 lg:col-span-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Delivery Location</p>
                            {client.deliveryLink ? (
                              <a
                                href={client.deliveryLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block truncate text-[12px] font-semibold text-accent"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {client.deliveryLink}
                              </a>
                            ) : (
                              <p className="mt-1 line-clamp-2 text-[12px] text-muted">No finished-work folder saved yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.25fr_0.75fr]">
                          <div className="border-b border-card-border lg:border-b-0 lg:border-r">
                            <div className="flex items-center justify-between gap-3 px-5 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Invoices</p>
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
                              <div key={invoice.id} className="flex items-center justify-between gap-3 border-t border-card-border px-5 py-3 transition-smooth hover:bg-foreground/[0.02]">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="material-symbols-outlined text-[16px] text-foreground/25">receipt_long</span>
                                  <div className="min-w-0">
                                    <p className="truncate text-[13px] font-semibold text-foreground">{invoice.id}</p>
                                    <p className="text-[11px] text-muted">{invoice.date} · <AnimatedNumber value={formatCurrency(getAmountPaid(invoice), currency)} /> collected</p>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-[13px] font-semibold text-foreground font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                                  <p className="text-[10px] font-medium text-muted"><AnimatedNumber value={formatCurrency(getBalanceDue(invoice), currency)} /> due</p>
                                </div>
                              </div>
                            )) : (
                              <div className="border-t border-card-border px-5 py-5 text-[12px] text-muted">No invoices for this client yet.</div>
                            )}
                          </div>

                          <div>
                            <div className="px-5 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Contact History</p>
                            </div>
                            <div className="space-y-0 border-t border-card-border">
                              {[
                                client.createdAt ? { icon: "person_add", label: "Client added", date: client.createdAt } : null,
                                client.updatedAt && client.updatedAt !== client.createdAt ? { icon: "edit_note", label: "Contact updated", date: client.updatedAt } : null,
                                ...selectedClientData.invoices.slice(0, 4).map((invoice) => ({
                                  icon: getBalanceDue(invoice) <= 0 ? "payments" : "request_quote",
                                  label: `${invoice.id} ${getPaymentState(invoice).toLowerCase()}`,
                                  date: invoice.paidAt || invoice.date,
                                })),
                              ].filter(Boolean).map((event) => (
                                <div key={`${event!.label}-${event!.date}`} className="flex items-start gap-2.5 border-b border-card-border px-5 py-3 last:border-b-0">
                                  <span className="material-symbols-outlined mt-0.5 text-[15px] text-foreground/25">{event!.icon}</span>
                                  <div>
                                    <p className="text-[12px] font-semibold text-foreground">{event!.label}</p>
                                    <p className="text-[11px] text-muted">{formatDisplayDate(event!.date)}</p>
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
            <span className="material-symbols-outlined text-[42px] text-foreground/10 mb-3 block">person_search</span>
            <AnimatedText as="p" text="No regular clients found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
      </main>

      <AnimatePresence>
        {showClientModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-label="Close modal"
              className="absolute inset-0 bg-[#030303]/60 backdrop-blur-md cursor-default"
              onClick={closeModal}
            />
            
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="modal-surface relative max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
            >
              {/* Form */}
              <form onSubmit={handleSaveClient} className="flex-1 flex flex-col min-h-0">
                {/* Header inside form so it is sticky on the right */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-card-border/60 bg-card shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_6px_var(--accent)]"></span>
                    <span className="material-symbols-outlined text-[16px] text-muted">person</span>
                    <AnimatedText
                      as="h2"
                      text={clientModalTitle}
                      effect="fade-through"
                      className="text-base font-bold text-foreground leading-none font-display"
                      replayKey={clientModalTitle}
                    />
                  </div>
                  <button type="button" onClick={closeModal} className="size-7 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth text-muted hover:text-foreground">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                {/* Form fields */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* 1. Identity & Brand Card */}
                  <div className="surface-card p-4.5 rounded-xl border border-card-border bg-card space-y-4 shadow-sm">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest block">Profile & Company</span>
                    
                    <div className="flex items-center gap-4">
                      <div className="size-14 rounded-xl border border-card-border overflow-hidden bg-foreground/[0.03] flex items-center justify-center shrink-0 shadow-inner relative group">
                        {form.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="w-full h-full object-cover" alt="Client preview" src={form.avatar} />
                        ) : (
                          <span className="material-symbols-outlined text-[22px] text-foreground/20">person</span>
                        )}
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[10px] font-bold select-none">
                          <span>Upload</span>
                          <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                        </label>
                      </div>
                      <div>
                        <label className="btn-secondary text-[11px] min-h-7 px-3 py-1 cursor-pointer hover:bg-foreground/[0.04] transition-smooth inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                          <span>{form.avatar ? "Change Picture" : "Upload Picture"}</span>
                          <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                        </label>
                        <p className="text-[10px] text-muted mt-1">Recommended square format. Maximum size 1MB.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-name">Client Name *</label>
                        <input
                          id="client-name"
                          required
                          value={form.name}
                          onChange={(event) => setForm({ ...form, name: event.target.value })}
                          placeholder="Full Name"
                          className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-company">Company</label>
                        <input
                          id="client-company"
                          value={form.company}
                          onChange={(event) => setForm({ ...form, company: event.target.value })}
                          placeholder="e.g. Acme Corp"
                          className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Contact Coordinates Card */}
                  <div className="surface-card p-4.5 rounded-xl border border-card-border bg-card space-y-4 shadow-sm">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest block">Contact Information</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-email">Email Address</label>
                        <input
                          id="client-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm({ ...form, email: event.target.value })}
                          placeholder="client@company.com"
                          className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-phone">Phone Number</label>
                        <PhoneInput
                          id="client-phone"
                          value={form.phone}
                          onChange={(phone) => setForm({ ...form, phone })}
                          hintPhone={form.phone}
                          inputClassName="text-[12.5px] transition-all"
                          selectClassName="text-[12px] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-whatsapp">WhatsApp Contact</label>
                      <PhoneInput
                        id="client-whatsapp"
                        value={form.whatsapp}
                        onChange={(whatsapp) => setForm({ ...form, whatsapp })}
                        hintPhone={form.phone || form.whatsapp}
                        inputClassName="text-[12.5px] transition-all"
                        selectClassName="text-[12px] transition-all"
                      />
                    </div>
                  </div>

                  {/* 3. Deliverables & Notes Card */}
                  <div className="surface-card p-4.5 rounded-xl border border-card-border bg-card space-y-4 shadow-sm">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest block">Work Delivery & Address</span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-delivery-link">Finished Work Folder</label>
                      <input
                        id="client-delivery-link"
                        type="url"
                        value={form.deliveryLink}
                        onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
                        placeholder="https://drive.google.com/..."
                        className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-address">Billing Address</label>
                      <textarea
                        id="client-address"
                        value={form.address}
                        onChange={(event) => setForm({ ...form, address: event.target.value })}
                        placeholder="Billing address for client statements"
                        className="field-control min-h-16 px-3 py-2 text-[12.5px] resize-none transition-all bg-foreground/[0.01]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="client-notes">Relationship Notes</label>
                      <textarea
                        id="client-notes"
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        placeholder="Scope rules, payment preferences, or context notes..."
                        className="field-control min-h-16 px-3 py-2 text-[12.5px] resize-none transition-all bg-foreground/[0.01]"
                      />
                    </div>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-card-border/60 bg-card shrink-0 z-10">
                  <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 text-[12px] font-bold rounded-lg transition-all active:scale-[0.98]">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary min-h-9 px-5 text-[12px] font-bold shadow-md transition-all active:scale-[0.96] rounded-lg" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingClientId ? "Save Changes" : "Add Client"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}

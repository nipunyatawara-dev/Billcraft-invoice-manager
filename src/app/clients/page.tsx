"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState, useRef } from "react";
import { ClientFormModal, type ClientForm } from "./components/ClientFormModal";
import { ModalOverlay } from "@/components/workspace-form-modal";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, formatDisplayDate, getAmountPaid, getBalanceDue, getInvoiceTotal, getPaymentState, type Client, type Invoice } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { exportClientStatementPdf } from "@/lib/pdf-export";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
import UserPlusIcon from "@/components/icons/user-plus-icon";
import UsersIcon from "@/components/icons/users-icon";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import ChartLineIcon from "@/components/icons/chart-line-icon";
import PenIcon from "@/components/icons/pen-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import { PageStatsRow } from "@/components/page-stats-row";
import { Reveal } from "@/components/reveal";

type ClientWithInvoices = Client & { invoices: Invoice[]; totalBilled: number };


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
        <Reveal phase="header" className="mb-10">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
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
        </Reveal>

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

        <Reveal phase="section">
        <div className="mb-6">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search clients..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 min-w-0">
          {filteredClients.map((client) => {
            const breakdown = getStatusBreakdown(client.invoices);
            const isSelected = selectedClientId === client.id;
            const outstandingBalance = client.invoices.reduce((sum, invoice) => sum + getBalanceDue(invoice), 0);
            const averagePaymentDays = getAveragePaymentDays(client.invoices);

            return (
              <div key={client.id} className="flex flex-col min-w-0">
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isSelected}
                  aria-controls={`client-details-${client.id}`}
                  onClick={() => toggleClient(client.id)}
                  onKeyDown={(event) => handleClientCardKeyDown(event, client.id)}
                  className={`bg-card text-card-foreground border p-5 cursor-pointer transition-all duration-300 group min-w-0 overflow-hidden ${
                    isSelected
                      ? "border-accent/30 rounded-t-xl rounded-b-none shadow-xl"
                      : "border-card-border hover:border-foreground/12 hover-row rounded-xl"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="size-12 rounded-xl border border-card-border overflow-hidden shrink-0 flex items-center justify-center font-bold text-sm bg-accent/10 text-accent">
                      {client.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="w-full h-full object-cover" alt={client.name} src={client.avatar} />
                      ) : (
                        (client.name || "C")[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-[14px] text-foreground truncate" title={client.name}>{client.name}</h3>
                          <p className="text-[11px] text-muted mt-0.5 truncate">{client.email || client.whatsapp || client.company || "No contact details"}</p>
                        </div>
                        <button
                          onClick={(event) => { event.stopPropagation(); openEdit(client); }}
                          className="size-7 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                          aria-label={`Edit ${client.name}`}
                        >
                          <PenIcon size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 min-w-0">
                        <div className="min-w-0 max-w-[140px]">
                          <p className="text-base font-semibold text-foreground font-display truncate" title={formatCurrency(client.totalBilled, currency)}>
                            <AnimatedNumber value={formatCurrency(client.totalBilled, currency)} />
                          </p>
                          <p className="text-[10px] text-foreground/25 tracking-wide uppercase truncate">Total Billed</p>
                        </div>
                        <div className="w-px h-7 bg-card-border shrink-0" />
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-foreground font-display truncate">
                            <AnimatedNumber value={client.invoices.length} />
                          </p>
                          <p className="text-[10px] text-foreground/25 tracking-wide uppercase truncate">Invoices</p>
                        </div>
                        <div className="w-px h-7 bg-card-border shrink-0" />
                        <div className="flex flex-wrap gap-1.5 min-w-0">
                          {breakdown.paid > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded-md tracking-wider uppercase bg-positive/10 border border-positive/10 text-positive whitespace-nowrap"><AnimatedNumber value={breakdown.paid} /> paid</span>}
                          {breakdown.unpaid > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded-md tracking-wider uppercase bg-foreground/[0.03] border border-card-border text-muted whitespace-nowrap"><AnimatedNumber value={breakdown.unpaid} /> unpaid</span>}
                          {breakdown.overdue > 0 && <span className="px-2 py-0.5 text-[9px] font-bold rounded-md tracking-wider uppercase bg-accent/10 border border-accent/10 text-accent whitespace-nowrap"><AnimatedNumber value={breakdown.overdue} /> overdue</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-card-border">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted min-w-0">
                      {client.phone && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0">phone</span>
                          <span className="truncate">{client.phone}</span>
                        </span>
                      )}
                      {client.whatsapp && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0">chat</span>
                          <span className="truncate">{client.whatsapp}</span>
                        </span>
                      )}
                      {client.company && (
                        <span className="flex items-center gap-1 truncate">
                          <span className="material-symbols-outlined text-[13px] shrink-0">business</span>
                          <span className="truncate">{client.company}</span>
                        </span>
                      )}
                    </div>
                    <span className={`material-symbols-outlined text-[16px] text-foreground/20 transition-transform duration-200 shrink-0 ${isSelected ? "rotate-180" : ""}`}>
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
                      className="overflow-hidden min-w-0"
                    >
                      <div className="rounded-b-xl border border-t-0 border-accent/30 bg-foreground/[0.02] overflow-hidden min-w-0">
                        <div className="grid grid-cols-1 gap-3 border-b border-card-border p-5 lg:grid-cols-4 min-w-0">
                          <div className="rounded-xl border border-card-border p-3 min-w-0 overflow-hidden">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted truncate">Outstanding</p>
                            <p className="mt-1 font-display text-lg font-semibold text-foreground truncate block" title={formatCurrency(outstandingBalance, currency)}>
                              <AnimatedNumber value={formatCurrency(outstandingBalance, currency)} />
                            </p>
                          </div>
                          <div className="rounded-xl border border-card-border p-3 min-w-0 overflow-hidden">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted truncate">Avg Pay Time</p>
                            <p className="mt-1 font-display text-lg font-semibold text-foreground truncate block">
                              {averagePaymentDays === null ? "No data" : <><AnimatedNumber value={averagePaymentDays} /> days</>}
                            </p>
                          </div>
                          <div className="rounded-xl border border-card-border p-3 lg:col-span-2 min-w-0 overflow-hidden">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted truncate">Delivery Location</p>
                            {client.deliveryLink ? (
                              <a
                                href={client.deliveryLink}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block truncate text-[12px] font-semibold text-accent"
                                onClick={(event) => event.stopPropagation()}
                                title={client.deliveryLink}
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
        </Reveal>
      </main>

      {showClientModal && (
        <ModalOverlay onClose={closeModal}>
          <ClientFormModal
            isEditing={Boolean(editingClientId)}
            form={form}
            setForm={setForm}
            isSaving={isSaving}
            closeModal={closeModal}
            onSubmit={handleSaveClient}
            onImageChange={handleImageChange}
            profilePhone={activeProfile?.phone}
          />
        </ModalOverlay>
      )}

    </>
  );
}

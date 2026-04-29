"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { formatCurrency, getInvoiceTotal, type Client, type Invoice } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";

type ClientWithInvoices = Client & { invoices: Invoice[]; totalBilled: number };

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  avatar: string;
  notes: string;
};

const EMPTY_FORM: ClientForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  address: "",
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
  const { currency } = useCurrency();

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
      company: client.company || "",
      address: client.address || "",
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
    const paid = clientInvoices.filter((invoice) => invoice.status === "Paid").length;
    const unpaid = clientInvoices.filter((invoice) => invoice.status === "Unpaid").length;
    const overdue = clientInvoices.filter((invoice) => invoice.status === "Overdue").length;

    return { paid, unpaid, overdue };
  }

  return (
    <>
      <main className="app-main flex-1">
        <div className="page-heading">
          <div>
            <p className="section-eyebrow">Manage</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]">
              Clients
            </h1>
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
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)]/25 text-[18px]">search</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="field-control py-2 pl-9 pr-3 text-[13px]"
              placeholder="Search clients..."
              type="text"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {filteredClients.map((client) => {
            const breakdown = getStatusBreakdown(client.invoices);
            const isSelected = selectedClientId === client.id;

            return (
              <div key={client.id} className="flex flex-col">
                <div
                  onClick={() => setSelectedClientId(isSelected ? null : client.id)}
                  className={`surface-card p-5 cursor-pointer transition-smooth group ${
                    isSelected
                      ? "border-[var(--accent)]/30 rounded-b-none"
                      : "border-[var(--card-border)] hover:border-[var(--foreground)]/12"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-lg border border-[var(--card-border)] overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" alt={client.name} src={client.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-[14px] text-[var(--foreground)] truncate">{client.name}</h3>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">{client.email || client.company || "No contact details"}</p>
                        </div>
                        <button
                          onClick={(event) => { event.stopPropagation(); openEdit(client); }}
                          className="size-7 flex items-center justify-center rounded-lg text-[var(--foreground)]/20 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth opacity-0 group-hover:opacity-100"
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
                          {breakdown.paid > 0 && <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase bg-[var(--positive)]/15 text-[var(--positive)]"><AnimatedNumber value={breakdown.paid} /> paid</span>}
                          {breakdown.unpaid > 0 && <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/50"><AnimatedNumber value={breakdown.unpaid} /> unpaid</span>}
                          {breakdown.overdue > 0 && <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase bg-[var(--accent)]/15 text-[var(--accent)]"><AnimatedNumber value={breakdown.overdue} /> overdue</span>}
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

                {isSelected && selectedClientData && (
                  <div className="bg-[var(--foreground)]/[0.02] rounded-b-lg border border-t-0 border-[var(--accent)]/30 overflow-hidden">
                    <div className="px-5 py-2.5 border-b border-[var(--card-border)]">
                      <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Invoice History</p>
                    </div>
                    {selectedClientData.invoices.length > 0 ? selectedClientData.invoices.map((invoice) => (
                      <div key={invoice.id} className="px-5 py-3 flex items-center justify-between border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--foreground)]/[0.02] transition-smooth">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[16px] text-[var(--foreground)]/25">receipt_long</span>
                          <div>
                            <p className="text-[13px] font-semibold text-[var(--foreground)]">{invoice.id}</p>
                            <p className="text-[11px] text-[var(--muted)]">{invoice.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[13px] font-semibold text-[var(--foreground)] font-display"><AnimatedNumber value={formatCurrency(getInvoiceTotal(invoice), currency)} /></p>
                          <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase ${invoice.statusColor}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="px-5 py-5 text-[12px] text-[var(--muted)]">No invoices for this client yet.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">person_search</span>
            <p className="text-[13px] text-[var(--muted)] font-medium">No regular clients found</p>
          </div>
        )}
      </main>

      {showClientModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm" onClick={closeModal} />
          <div className="modal-surface relative max-w-lg p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)] font-display">
                {editingClientId ? "Edit Client" : "Add Client"}
              </h2>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-lg border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                  {form.avatar ? (
                    <img className="w-full h-full object-cover" alt="Client preview" src={form.avatar} />
                  ) : (
                    <span className="material-symbols-outlined text-[var(--foreground)]/25">image</span>
                  )}
                </div>
                <label className="btn-secondary text-[12px] min-h-8 px-3 py-1.5 cursor-pointer">
                  <span>{form.avatar ? "Change Image" : "Add Image"}</span>
                  <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="client-name">Client Name</label>
                <input
                  id="client-name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Client or company name"
                  className="field-control px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="client-email">Email</label>
                  <input
                    id="client-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="client@example.com"
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="client-phone">Phone</label>
                  <input
                    id="client-phone"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="field-control px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="client-company">Company</label>
                <input
                  id="client-company"
                  value={form.company}
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                  placeholder="Company name"
                  className="field-control px-3 py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="client-address">Address</label>
                <textarea
                  id="client-address"
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  placeholder="Billing address"
                  className="field-control min-h-20 px-3 py-2 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary active:scale-[0.97]" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingClientId ? "Save Changes" : "Add Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-auto p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2026 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

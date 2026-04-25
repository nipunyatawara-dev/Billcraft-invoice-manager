"use client";

import { ChangeEvent, useState, useMemo } from "react";
import { formatCurrency, getClientsFromInvoices, parseInvoiceAmount, type Client, type Invoice } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useInvoices } from "@/hooks/use-invoices";

type ClientWithInvoices = Client & { invoices: Invoice[]; totalBilled: number };

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<string | null>(null);

  // Form state for add/edit
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formAvatar, setFormAvatar] = useState("");

  const { invoices, clientRecords, saveClient } = useInvoices();
  const { currency } = useCurrency();

  const clients = useMemo<ClientWithInvoices[]>(() => {
    const invoiceClients = getClientsFromInvoices(invoices);
    const invoiceClientNames = new Set(invoiceClients.map((client) => client.name));
    const standaloneClients = clientRecords
      .filter((client) => !invoiceClientNames.has(client.name))
      .map((client) => ({ ...client, invoices: [], totalBilled: 0 }));

    return [...standaloneClients, ...invoiceClients];
  }, [clientRecords, invoices]);

  const filteredClients = clients.filter((c) =>
    searchQuery === "" ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = clients.reduce((sum, c) => sum + c.totalBilled, 0);
  const selectedClientData = selectedClient ? clients.find(c => c.name === selectedClient) : null;

  function openEdit(client: typeof clients[0]) {
    setEditingClient(client.name);
    setFormName(client.name);
    setFormEmail(client.email);
    setFormPhone(client.phone);
    setFormCompany(client.company || "");
    setFormAvatar(client.avatar);
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingClient(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormCompany("");
    setFormAvatar("");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSaveClient() {
    if (!formName.trim()) {
      return;
    }

    saveClient(editingClient, {
      client: formName,
      email: formEmail,
      phone: formPhone,
      company: formCompany,
      avatar: formAvatar,
    });
    setSelectedClient(formName.trim());
    closeModal();
  }

  function getStatusBreakdown(invoices: Invoice[]) {
    const paid = invoices.filter(i => i.status === "Paid").length;
    const unpaid = invoices.filter(i => i.status === "Unpaid").length;
    const overdue = invoices.filter(i => i.status === "Overdue").length;
    return { paid, unpaid, overdue };
  }

  return (
    <>
      <main className="flex-1 max-w-[1100px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[13px] font-medium text-[var(--muted)] tracking-wide mb-1.5">Manage</p>
            <h1 className="text-3xl lg:text-[40px] font-semibold tracking-tight text-[var(--foreground)] leading-[1.1]">
              Clients
            </h1>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[var(--accent)] text-white px-4 py-2 font-medium rounded-lg flex items-center gap-1.5 hover:bg-[var(--accent-hover)] transition-smooth active:scale-[0.97] text-[13px]"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Add Client
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-[var(--featured)] rounded-xl p-4 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-[var(--featured-text)]/[0.04] blur-2xl pointer-events-none" />
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Revenue</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--featured-text)] font-display">{formatCurrency(totalRevenue, currency)}</p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Clients</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{clients.length} <span className="text-[12px] font-normal text-[var(--sage)]">active</span></p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Invoices</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{invoices.length} <span className="text-[12px] font-normal text-[var(--muted)]">total</span></p>
          </div>
          <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--card-border)]">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Avg / Client</p>
            <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{formatCurrency(clients.length > 0 ? totalRevenue / clients.length : 0, currency)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground)]/25 text-[18px]">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 border border-[var(--card-border)] rounded-lg py-2 text-[13px] bg-transparent outline-none transition-smooth text-[var(--foreground)] placeholder:text-[var(--foreground)]/25 focus:border-[var(--foreground)]/20"
              placeholder="Search clients..."
              type="text"
            />
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {filteredClients.map((client) => {
            const breakdown = getStatusBreakdown(client.invoices);
            const isSelected = selectedClient === client.name;
            
            return (
              <div key={client.name} className="flex flex-col">
                <div 
                  onClick={() => setSelectedClient(isSelected ? null : client.name)}
                  className={`bg-[var(--card)] rounded-xl border p-5 cursor-pointer transition-smooth group ${
                    isSelected 
                      ? 'border-[var(--accent)]/30 rounded-b-none' 
                      : 'border-[var(--card-border)] hover:border-[var(--foreground)]/12'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="size-12 rounded-lg border border-[var(--card-border)] overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" alt={client.name} src={client.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-[14px] text-[var(--foreground)] truncate">{client.name}</h3>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">{client.email}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                          className="size-7 flex items-center justify-center rounded-lg text-[var(--foreground)]/20 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3">
                        <div>
                          <p className="text-base font-semibold tracking-tight text-[var(--foreground)] font-display">{formatCurrency(client.totalBilled, currency)}</p>
                          <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase">Total Billed</p>
                        </div>
                        <div className="w-px h-7 bg-[var(--card-border)]" />
                        <div>
                          <p className="text-base font-semibold tracking-tight text-[var(--foreground)] font-display">{client.invoices.length}</p>
                          <p className="text-[10px] text-[var(--foreground)]/25 tracking-wide uppercase">Invoices</p>
                        </div>
                        <div className="w-px h-7 bg-[var(--card-border)]" />
                        <div className="flex gap-1.5">
                          {breakdown.paid > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase bg-[var(--sage)]/15 text-[var(--sage)]">{breakdown.paid} paid</span>
                          )}
                          {breakdown.unpaid > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase bg-[var(--foreground)]/[0.06] text-[var(--foreground)]/50">{breakdown.unpaid} unpaid</span>
                          )}
                          {breakdown.overdue > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase bg-[var(--accent)]/15 text-[var(--accent)]">{breakdown.overdue} overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-border)]">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">phone</span>
                        {client.phone}
                      </span>
                    </div>
                    <span className={`material-symbols-outlined text-[16px] text-[var(--foreground)]/20 transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Expanded Invoice List */}
                {isSelected && selectedClientData && (
                  <div className="bg-[var(--foreground)]/[0.02] rounded-b-xl border border-t-0 border-[var(--accent)]/30 overflow-hidden">
                    <div className="px-5 py-2.5 border-b border-[var(--card-border)]">
                      <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Invoice History</p>
                    </div>
                    {selectedClientData.invoices.map((inv) => (
                      <div key={inv.id} className="px-5 py-3 flex items-center justify-between border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--foreground)]/[0.02] transition-smooth">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-[16px] text-[var(--foreground)]/25">receipt_long</span>
                          <div>
                            <p className="text-[13px] font-semibold text-[var(--foreground)]">{inv.id}</p>
                            <p className="text-[11px] text-[var(--muted)]">{inv.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[13px] font-semibold text-[var(--foreground)] font-display">{formatCurrency(parseInvoiceAmount(inv.amount), currency)}</p>
                          <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded tracking-wide uppercase ${inv.statusColor}`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">person_search</span>
            <p className="text-[13px] text-[var(--muted)] font-medium">No clients found</p>
          </div>
        )}
      </main>

      {/* Add / Edit Client Modal */}
      {(showAddModal || editingClient) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[var(--background)] rounded-2xl w-full max-w-lg p-7 shadow-2xl border border-[var(--card-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)] font-display">
                {editingClient ? "Edit Client" : "Add Client"}
              </h2>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-14 rounded-lg border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                  {formAvatar ? (
                    <img className="w-full h-full object-cover" alt="Client preview" src={formAvatar} />
                  ) : (
                    <span className="material-symbols-outlined text-[var(--foreground)]/25">image</span>
                  )}
                </div>
                <label className="px-3 py-1.5 border border-[var(--card-border)] rounded-lg text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--foreground)]/[0.03] transition-smooth cursor-pointer">
                  <span>{formAvatar ? "Change Image" : "Add Image"}</span>
                  <input className="sr-only" type="file" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter client name"
                  className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Email</label>
                <input 
                  type="email" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Phone</label>
                  <input 
                    type="tel" 
                    value={formPhone} 
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Company</label>
                  <input 
                    type="text" 
                    value={formCompany} 
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-[14px] font-medium text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth placeholder:text-[var(--foreground)]/20" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-smooth rounded-lg">
                Cancel
              </button>
              <button 
                onClick={handleSaveClient}
                className="bg-[var(--accent)] text-white px-5 py-2 font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-smooth active:scale-[0.97] text-[13px]"
              >
                {editingClient ? "Save Changes" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-[var(--card-border)] p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

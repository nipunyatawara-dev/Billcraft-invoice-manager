"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { useState, useMemo } from "react";
import { INVOICES, getClientsFromInvoices, type Invoice } from "@/data/invoices";

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

  const clients = useMemo(() => getClientsFromInvoices(INVOICES), []);

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
  }

  function closeModal() {
    setShowAddModal(false);
    setEditingClient(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormCompany("");
  }

  function getStatusBreakdown(invoices: Invoice[]) {
    const paid = invoices.filter(i => i.status === "Paid").length;
    const unpaid = invoices.filter(i => i.status === "Unpaid").length;
    const overdue = invoices.filter(i => i.status === "Overdue").length;
    return { paid, unpaid, overdue };
  }

  return (
    <DashboardLayout>
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-1">Manage</p>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] leading-[1.1]">
              Clients
            </h1>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-5 py-2.5 font-medium rounded-full flex items-center gap-2 hover:opacity-90 transition-all active:scale-[0.97] text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Client
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#212842] dark:bg-[#F0E7D5] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-[#F0E7D5]/5 dark:bg-[#212842]/5 blur-2xl pointer-events-none" />
            <p className="text-xs font-medium text-[#F0E7D5]/50 dark:text-[#212842]/50 tracking-wide uppercase mb-3">Total Revenue</p>
            <p className="text-2xl font-semibold tracking-tight text-[#F0E7D5] dark:text-[#212842] font-display">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Clients</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{clients.length} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">active</span></p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Invoices</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{INVOICES.length} <span className="text-sm font-normal text-[#212842]/40 dark:text-[#F0E7D5]/40">total</span></p>
          </div>
          <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-5 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
            <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Avg / Client</p>
            <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">${clients.length > 0 ? (totalRevenue / clients.length).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#212842]/30 dark:text-[#F0E7D5]/30 text-[20px]">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 border border-[#212842]/8 dark:border-[#F0E7D5]/8 rounded-full py-2.5 text-sm bg-transparent outline-none transition-all text-[#212842] dark:text-[#F0E7D5] placeholder:text-[#212842]/30 dark:placeholder:text-[#F0E7D5]/30 focus:border-[#212842]/25 dark:focus:border-[#F0E7D5]/25"
              placeholder="Search clients..."
              type="text"
            />
          </div>
        </div>

        {/* Client Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {filteredClients.map((client) => {
            const breakdown = getStatusBreakdown(client.invoices);
            const isSelected = selectedClient === client.name;
            
            return (
              <div key={client.name} className="flex flex-col">
                <div 
                  onClick={() => setSelectedClient(isSelected ? null : client.name)}
                  className={`bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl border p-6 cursor-pointer transition-all group ${
                    isSelected 
                      ? 'border-[#212842]/25 dark:border-[#F0E7D5]/25 rounded-b-none' 
                      : 'border-[#212842]/6 dark:border-[#F0E7D5]/6 hover:border-[#212842]/15 dark:hover:border-[#F0E7D5]/15'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="size-14 rounded-2xl border border-[#212842]/8 dark:border-[#F0E7D5]/8 overflow-hidden shrink-0">
                      <img className="w-full h-full object-cover" alt={client.name} src={client.avatar} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-[15px] text-[#212842] dark:text-[#F0E7D5] truncate">{client.name}</h3>
                          <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-0.5">{client.email}</p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEdit(client); }}
                          className="size-8 flex items-center justify-center rounded-xl text-[#212842]/30 dark:text-[#F0E7D5]/30 hover:text-[#212842] dark:hover:text-[#F0E7D5] hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4">
                        <div>
                          <p className="text-lg font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">${client.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-[#212842]/30 dark:text-[#F0E7D5]/30 tracking-wide uppercase">Total Billed</p>
                        </div>
                        <div className="w-px h-8 bg-[#212842]/8 dark:bg-[#F0E7D5]/8" />
                        <div>
                          <p className="text-lg font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{client.invoices.length}</p>
                          <p className="text-[10px] text-[#212842]/30 dark:text-[#F0E7D5]/30 tracking-wide uppercase">Invoices</p>
                        </div>
                        <div className="w-px h-8 bg-[#212842]/8 dark:bg-[#F0E7D5]/8" />
                        <div className="flex gap-2">
                          {breakdown.paid > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide uppercase bg-[#212842]/10 text-[#212842] dark:bg-[#F0E7D5]/10 dark:text-[#F0E7D5]">{breakdown.paid} paid</span>
                          )}
                          {breakdown.unpaid > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide uppercase bg-[#212842]/20 text-[#212842] dark:bg-[#F0E7D5]/20 dark:text-[#F0E7D5]">{breakdown.unpaid} unpaid</span>
                          )}
                          {breakdown.overdue > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full tracking-wide uppercase bg-[#212842] text-[#F0E7D5] dark:bg-[#F0E7D5] dark:text-[#212842]">{breakdown.overdue} overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#212842]/6 dark:border-[#F0E7D5]/6">
                    <div className="flex items-center gap-3 text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">phone</span>
                        {client.phone}
                      </span>
                    </div>
                    <span className={`material-symbols-outlined text-[18px] text-[#212842]/30 dark:text-[#F0E7D5]/30 transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Expanded Invoice List */}
                {isSelected && selectedClientData && (
                  <div className="bg-[#212842]/[0.03] dark:bg-[#F0E7D5]/[0.03] rounded-b-2xl border border-t-0 border-[#212842]/25 dark:border-[#F0E7D5]/25 overflow-hidden">
                    <div className="px-6 py-3 border-b border-[#212842]/6 dark:border-[#F0E7D5]/6">
                      <p className="text-[10px] font-semibold text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-widest uppercase">Invoice History</p>
                    </div>
                    {selectedClientData.invoices.map((inv) => (
                      <div key={inv.id} className="px-6 py-4 flex items-center justify-between border-b border-[#212842]/4 dark:border-[#F0E7D5]/4 last:border-0 hover:bg-[#212842]/3 dark:hover:bg-[#F0E7D5]/3 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[18px] text-[#212842]/30 dark:text-[#F0E7D5]/30">receipt_long</span>
                          <div>
                            <p className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">{inv.id}</p>
                            <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40">{inv.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5] font-display">{inv.amount}</p>
                          <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full tracking-wide uppercase ${inv.statusColor}`}>
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
            <span className="material-symbols-outlined text-[48px] text-[#212842]/15 dark:text-[#F0E7D5]/15 mb-4 block">person_search</span>
            <p className="text-sm text-[#212842]/40 dark:text-[#F0E7D5]/40 font-medium">No clients found</p>
          </div>
        )}
      </main>

      {/* Add / Edit Client Modal */}
      {(showAddModal || editingClient) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#212842]/40 dark:bg-[#212842]/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[#F0E7D5] dark:bg-[#2d3555] rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-semibold text-[#212842] dark:text-[#F0E7D5] font-display">
                {editingClient ? "Edit Client" : "Add Client"}
              </h2>
              <button onClick={closeModal} className="size-9 flex items-center justify-center rounded-xl hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
                <span className="material-symbols-outlined text-[20px] text-[#212842]/40 dark:text-[#F0E7D5]/40">close</span>
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter client name"
                  className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Email</label>
                <input 
                  type="email" 
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" 
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Phone</label>
                  <input 
                    type="tel" 
                    value={formPhone} 
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Company</label>
                  <input 
                    type="text" 
                    value={formCompany} 
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Company name"
                    className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2.5 text-base font-medium text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors placeholder:text-[#212842]/25 dark:placeholder:text-[#F0E7D5]/25" 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={closeModal} className="px-5 py-2.5 text-sm font-medium text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:text-[#212842] dark:hover:text-[#F0E7D5] transition-colors rounded-full">
                Cancel
              </button>
              <button 
                onClick={closeModal}
                className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-6 py-2.5 font-medium rounded-full hover:opacity-90 transition-all active:scale-[0.97] text-sm"
              >
                {editingClient ? "Save Changes" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-[#212842]/6 dark:border-[#F0E7D5]/6 p-6 text-center">
        <p className="text-xs font-medium text-[#212842]/30 dark:text-[#F0E7D5]/30">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </DashboardLayout>
  );
}

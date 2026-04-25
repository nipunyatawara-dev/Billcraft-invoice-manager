"use client";

import { formatCurrency } from "@/data/invoices";
import { CURRENCIES, type CurrencyCode, useCurrency } from "@/hooks/use-currency";
import { useState } from "react";

export default function Settings() {
  const { currency, setCurrency } = useCurrency();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [invoiceReminders, setInvoiceReminders] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "billing" | "security">("profile");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: "person" },
    { id: "notifications" as const, label: "Notifications", icon: "notifications" },
    { id: "billing" as const, label: "Billing", icon: "payments" },
    { id: "security" as const, label: "Security", icon: "shield" },
  ];

  return (
    <>
      <main className="flex-1 max-w-[1100px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="mb-10">
          <p className="text-[13px] font-medium text-[var(--muted)] tracking-wide mb-1.5">Account</p>
          <h1 className="text-3xl lg:text-[40px] font-semibold tracking-tight text-[var(--foreground)] leading-[1.1]">
            Settings
          </h1>
        </div>

        {/* Bento Layout: Tabs + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          
          {/* Tab Navigation */}
          <div className="lg:col-span-1">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-smooth whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-3">

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                {/* Avatar & Name */}
                <div className="bg-[var(--featured)] rounded-xl p-7 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                    <div className="size-16 rounded-xl bg-[var(--featured-text)]/10 border border-[var(--featured-text)]/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                      <span className="material-symbols-outlined text-2xl text-[var(--featured-text)]/35">person</span>
                      <div className="absolute inset-0 bg-[var(--featured)]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                        <span className="material-symbols-outlined text-lg text-[var(--featured-text)]">photo_camera</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[var(--featured-text)] font-display mb-0.5">John Doe</h2>
                      <p className="text-[12px] text-[var(--featured-text)]/45">hello@johndoe.com</p>
                    </div>
                    <button className="px-3 py-1.5 bg-[var(--featured-text)]/10 border border-[var(--featured-text)]/10 text-[var(--featured-text)] rounded-lg text-[12px] font-medium hover:bg-[var(--featured-text)]/15 transition-smooth">
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)] space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">First Name</label>
                    <input type="text" defaultValue="John" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-base font-semibold text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth font-display" />
                  </div>
                  <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)] space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Last Name</label>
                    <input type="text" defaultValue="Doe" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-base font-semibold text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth font-display" />
                  </div>
                </div>

                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)] space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Email Address</label>
                  <input type="email" defaultValue="hello@johndoe.com" className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-base font-semibold text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth font-display" />
                </div>

                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)] space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Company</label>
                  <input type="text" defaultValue="BillCraft Inc." className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-base font-semibold text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth font-display" />
                </div>

                <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)] space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                    className="w-full bg-transparent border border-[var(--card-border)] rounded-lg px-3 py-2 text-base font-semibold text-[var(--foreground)] outline-none focus:border-[var(--foreground)]/20 transition-smooth font-display"
                  >
                    {CURRENCIES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button className="bg-[var(--accent)] text-white px-5 py-2 font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-smooth active:scale-[0.97] text-[13px]">
                    Save Changes
                  </button>
                </div>
              </>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                {[
                  { label: "Email Notifications", desc: "Receive alerts when invoices are paid or overdue", state: emailNotifications, toggle: setEmailNotifications },
                  { label: "Invoice Reminders", desc: "Auto-send reminders for unpaid invoices", state: invoiceReminders, toggle: setInvoiceReminders },
                  { label: "Marketing Emails", desc: "Receive feature updates and promotional content", state: marketingEmails, toggle: setMarketingEmails },
                  { label: "Auto Backup", desc: "Automatically back up your invoice data weekly", state: autoBackup, toggle: setAutoBackup },
                ].map((item, i, arr) => (
                  <div key={item.label} className={`flex items-center justify-between p-5 ${i < arr.length - 1 ? 'border-b border-[var(--card-border)]' : ''}`}>
                    <div>
                      <h3 className="text-[13px] font-semibold text-[var(--foreground)]">{item.label}</h3>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{item.desc}</p>
                    </div>
                    <button 
                      type="button"
                      role="switch"
                      aria-checked={item.state}
                      onClick={() => item.toggle(!item.state)}
                      className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${item.state ? 'bg-[var(--accent)]' : 'bg-[var(--foreground)]/12'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out mt-1 ${item.state ? 'translate-x-5 bg-white ml-0' : 'translate-x-1 bg-white'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <>
                <div className="bg-[var(--featured)] rounded-xl p-7 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Current Plan</p>
                    <h2 className="text-2xl font-semibold text-[var(--featured-text)] font-display mb-0.5">Professional</h2>
                    <p className="text-[12px] text-[var(--featured-text)]/45 mb-5">Unlimited invoices, clients, and export options</p>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[12px] font-medium hover:bg-[var(--accent-hover)] transition-smooth">
                        Upgrade Plan
                      </button>
                      <button className="px-4 py-2 text-[var(--featured-text)]/50 text-[12px] font-medium hover:text-[var(--featured-text)] transition-smooth">
                        View Billing History
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
                    <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Payment Method</p>
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-lg bg-[var(--foreground)]/[0.04] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">credit_card</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--foreground)]">•••• •••• •••• 4242</p>
                        <p className="text-[11px] text-[var(--muted)]">Expires 12/2025</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[var(--card)] rounded-xl p-5 border border-[var(--card-border)]">
                    <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Next Billing</p>
                    <p className="text-xl font-semibold tracking-tight text-[var(--foreground)] font-display">{formatCurrency(29, currency)}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Due Nov 1, 2023</p>
                  </div>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <>
                <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                  <div className="p-5 border-b border-[var(--card-border)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Password</h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Last changed 3 months ago</p>
                      </div>
                      <button className="px-3 py-1.5 border border-[var(--card-border)] rounded-lg text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--foreground)]/[0.03] transition-smooth">
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="p-5 border-b border-[var(--card-border)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Two-Factor Authentication</h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Add an extra layer of security to your account</p>
                      </div>
                      <button className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-[11px] font-semibold hover:bg-[var(--accent-hover)] transition-smooth">
                        Enable
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Active Sessions</h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">2 devices currently signed in</p>
                      </div>
                      <button className="px-3 py-1.5 border border-[var(--card-border)] rounded-lg text-[11px] font-semibold text-[var(--muted)] hover:bg-[var(--foreground)]/[0.03] transition-smooth">
                        Manage
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-[var(--card)] rounded-xl border border-[var(--accent)]/15">
                  <h3 className="text-[13px] font-semibold text-[var(--accent)] mb-0.5">Danger Zone</h3>
                  <p className="text-[11px] text-[var(--muted)] mb-3">Permanently delete your account and all associated data</p>
                  <button className="px-3 py-1.5 border border-[var(--accent)]/20 rounded-lg text-[11px] font-semibold text-[var(--accent)]/70 hover:bg-[var(--accent)]/10 transition-smooth">
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--card-border)] p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

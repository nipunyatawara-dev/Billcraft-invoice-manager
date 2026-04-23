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
      <main className="flex-1 max-w-[1200px] mx-auto w-full p-6 lg:p-10">
        
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-1">Account</p>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] leading-[1.1]">
            Settings
          </h1>
        </div>

        {/* Bento Layout: Tabs + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Tab Navigation — Vertical on desktop, horizontal scroll on mobile */}
          <div className="lg:col-span-1">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842]'
                      : 'text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-4">

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                {/* Avatar & Name — Hero Card */}
                <div className="bg-[#212842] dark:bg-[#F0E7D5] rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-[#F0E7D5]/5 dark:bg-[#212842]/5 blur-3xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                    <div className="size-20 rounded-xl bg-[#F0E7D5]/10 dark:bg-[#212842]/10 border border-[#F0E7D5]/10 dark:border-[#212842]/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                      <span className="material-symbols-outlined text-3xl text-[#F0E7D5]/40 dark:text-[#212842]/40">person</span>
                      <div className="absolute inset-0 bg-[#212842]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                        <span className="material-symbols-outlined text-xl text-[#F0E7D5]">photo_camera</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold text-[#F0E7D5] dark:text-[#212842] font-display mb-1">John Doe</h2>
                      <p className="text-sm text-[#F0E7D5]/50 dark:text-[#212842]/50">hello@johndoe.com</p>
                    </div>
                    <button className="px-4 py-2 bg-[#F0E7D5]/10 dark:bg-[#212842]/10 border border-[#F0E7D5]/15 dark:border-[#212842]/15 text-[#F0E7D5] dark:text-[#212842] rounded-xl text-sm font-medium hover:bg-[#F0E7D5]/20 dark:hover:bg-[#212842]/20 transition-colors">
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6 space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">First Name</label>
                    <input type="text" defaultValue="John" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2 text-lg font-semibold text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors font-display" />
                  </div>
                  <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6 space-y-2">
                    <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Last Name</label>
                    <input type="text" defaultValue="Doe" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2 text-lg font-semibold text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors font-display" />
                  </div>
                </div>

                <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6 space-y-2">
                  <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Email Address</label>
                  <input type="email" defaultValue="hello@johndoe.com" className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2 text-lg font-semibold text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors font-display" />
                </div>

                <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6 space-y-2">
                  <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase">Company</label>
                  <input type="text" defaultValue="BillCraft Inc." className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2 text-lg font-semibold text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors font-display" />
                </div>

                <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6 space-y-2">
                  <label className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase" htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                    className="w-full bg-transparent border-b border-[#212842]/10 dark:border-[#F0E7D5]/10 py-2 text-lg font-semibold text-[#212842] dark:text-[#F0E7D5] outline-none focus:border-[#212842]/30 dark:focus:border-[#F0E7D5]/30 transition-colors font-display"
                  >
                    {CURRENCIES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button className="bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] px-6 py-2.5 font-medium rounded-xl hover:opacity-90 transition-all active:scale-[0.97] text-sm">
                    Save Changes
                  </button>
                </div>
              </>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl border border-[#212842]/6 dark:border-[#F0E7D5]/6 overflow-hidden">
                {[
                  { label: "Email Notifications", desc: "Receive alerts when invoices are paid or overdue", state: emailNotifications, toggle: setEmailNotifications },
                  { label: "Invoice Reminders", desc: "Auto-send reminders for unpaid invoices", state: invoiceReminders, toggle: setInvoiceReminders },
                  { label: "Marketing Emails", desc: "Receive feature updates and promotional content", state: marketingEmails, toggle: setMarketingEmails },
                  { label: "Auto Backup", desc: "Automatically back up your invoice data weekly", state: autoBackup, toggle: setAutoBackup },
                ].map((item, i, arr) => (
                  <div key={item.label} className={`flex items-center justify-between p-6 ${i < arr.length - 1 ? 'border-b border-[#212842]/6 dark:border-[#F0E7D5]/6' : ''}`}>
                    <div>
                      <h3 className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">{item.label}</h3>
                      <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-1">{item.desc}</p>
                    </div>
                    <button 
                      type="button"
                      role="switch"
                      aria-checked={item.state}
                      onClick={() => item.toggle(!item.state)}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${item.state ? 'bg-[#212842] dark:bg-[#F0E7D5]' : 'bg-[#212842]/15 dark:bg-[#F0E7D5]/15'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out mt-1 ${item.state ? 'translate-x-6 bg-[#F0E7D5] dark:bg-[#212842] ml-0' : 'translate-x-1 bg-[#F0E7D5] dark:bg-[#F0E7D5]/60'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <>
                <div className="bg-[#212842] dark:bg-[#F0E7D5] rounded-2xl p-8 relative overflow-hidden">
                  <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-[#F0E7D5]/5 dark:bg-[#212842]/5 blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-xs font-medium text-[#F0E7D5]/50 dark:text-[#212842]/50 tracking-wide uppercase mb-3">Current Plan</p>
                    <h2 className="text-3xl font-semibold text-[#F0E7D5] dark:text-[#212842] font-display mb-1">Professional</h2>
                    <p className="text-sm text-[#F0E7D5]/50 dark:text-[#212842]/50 mb-6">Unlimited invoices, clients, and export options</p>
                    <div className="flex gap-3">
                      <button className="px-5 py-2.5 bg-[#F0E7D5] dark:bg-[#212842] text-[#212842] dark:text-[#F0E7D5] rounded-xl text-sm font-medium hover:opacity-90 transition-all">
                        Upgrade Plan
                      </button>
                      <button className="px-5 py-2.5 text-[#F0E7D5]/60 dark:text-[#212842]/60 text-sm font-medium hover:text-[#F0E7D5] dark:hover:text-[#212842] transition-colors">
                        View Billing History
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
                    <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Payment Method</p>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-[#212842]/8 dark:bg-[#F0E7D5]/8 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] text-[#212842]/60 dark:text-[#F0E7D5]/60">credit_card</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">•••• •••• •••• 4242</p>
                        <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40">Expires 12/2025</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl p-6 border border-[#212842]/6 dark:border-[#F0E7D5]/6">
                    <p className="text-xs font-medium text-[#212842]/40 dark:text-[#F0E7D5]/40 tracking-wide uppercase mb-3">Next Billing</p>
                    <p className="text-2xl font-semibold tracking-tight text-[#212842] dark:text-[#F0E7D5] font-display">{formatCurrency(29, currency)}</p>
                    <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-1">Due Nov 1, 2023</p>
                  </div>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <>
                <div className="bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl border border-[#212842]/6 dark:border-[#F0E7D5]/6 overflow-hidden">
                  <div className="p-6 border-b border-[#212842]/6 dark:border-[#F0E7D5]/6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">Password</h3>
                        <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-1">Last changed 3 months ago</p>
                      </div>
                      <button className="px-4 py-2 border border-[#212842]/10 dark:border-[#F0E7D5]/10 rounded-lg text-xs font-semibold text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
                        Change
                      </button>
                    </div>
                  </div>
                  <div className="p-6 border-b border-[#212842]/6 dark:border-[#F0E7D5]/6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">Two-Factor Authentication</h3>
                        <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-1">Add an extra layer of security to your account</p>
                      </div>
                      <button className="px-4 py-2 bg-[#212842] dark:bg-[#F0E7D5] text-[#F0E7D5] dark:text-[#212842] rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
                        Enable
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5]">Active Sessions</h3>
                        <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mt-1">2 devices currently signed in</p>
                      </div>
                      <button className="px-4 py-2 border border-[#212842]/10 dark:border-[#F0E7D5]/10 rounded-lg text-xs font-semibold text-[#212842]/60 dark:text-[#F0E7D5]/60 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
                        Manage
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#F0E7D5]/60 dark:bg-[#F0E7D5]/5 rounded-2xl border border-[#212842]/6 dark:border-[#F0E7D5]/6">
                  <h3 className="text-sm font-semibold text-[#212842] dark:text-[#F0E7D5] mb-1">Danger Zone</h3>
                  <p className="text-xs text-[#212842]/40 dark:text-[#F0E7D5]/40 mb-4">Permanently delete your account and all associated data</p>
                  <button className="px-4 py-2 border border-[#212842]/15 dark:border-[#F0E7D5]/15 rounded-lg text-xs font-semibold text-[#212842]/50 dark:text-[#F0E7D5]/50 hover:bg-[#212842]/5 dark:hover:bg-[#F0E7D5]/5 transition-colors">
                    Delete Account
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#212842]/6 dark:border-[#F0E7D5]/6 p-6 text-center">
        <p className="text-xs font-medium text-[#212842]/30 dark:text-[#F0E7D5]/30">© 2023 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

"use client";

import { formatCurrency } from "@/data/invoices";
import { CURRENCIES, type CurrencyCode, useCurrency } from "@/hooks/use-currency";
import { COLOR_PALETTES, type ColorPaletteId, useModePalettes } from "@/hooks/use-mode-palettes";
import { useTheme } from "next-themes";
import { useState } from "react";

type ThemeMode = "light" | "dark";

export default function Settings() {
  const { currency, setCurrency } = useCurrency();
  const { resolvedTheme, setTheme } = useTheme();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } = useModePalettes();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [invoiceReminders, setInvoiceReminders] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "notifications" | "billing" | "security">("profile");
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: "person" },
    { id: "appearance" as const, label: "Appearance", icon: "palette" },
    { id: "notifications" as const, label: "Notifications", icon: "notifications" },
    { id: "billing" as const, label: "Billing", icon: "payments" },
    { id: "security" as const, label: "Security", icon: "shield" },
  ];

  const modePaletteSettings: {
    mode: "light" | "dark";
    title: string;
    description: string;
    selectedPalette: ColorPaletteId;
    setPalette: (palette: ColorPaletteId) => void;
  }[] = [
    {
      mode: "light",
      title: "Light Mode Palette",
      description: "Used whenever the site is in light mode.",
      selectedPalette: lightPalette,
      setPalette: setLightPalette,
    },
    {
      mode: "dark",
      title: "Dark Mode Palette",
      description: "Used whenever the site is in dark mode.",
      selectedPalette: darkPalette,
      setPalette: setDarkPalette,
    },
  ];

  function selectThemeMode(themeMode: ThemeMode) {
    setTheme(themeMode);
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    document.documentElement.classList.toggle("light", themeMode === "light");
  }

  return (
    <>
      <main className="app-main flex-1">
        
        {/* Header */}
        <div className="mb-8 lg:mb-9">
          <p className="section-eyebrow">Account</p>
          <h1 className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]">
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
                      ? 'bg-[var(--action)]/12 text-[var(--action)]'
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
                <div className="surface-featured p-6 sm:p-7 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                    <div className="size-16 rounded-lg bg-[var(--featured-text)]/10 border border-[var(--featured-text)]/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                      <span className="material-symbols-outlined text-2xl text-[var(--featured-text)]/35">person</span>
                      <div className="absolute inset-0 bg-[var(--featured)]/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                        <span className="material-symbols-outlined text-lg text-[var(--featured-text)]">photo_camera</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[var(--featured-text)] font-display mb-0.5">John Doe</h2>
                      <p className="text-[12px] text-[var(--featured-text)]/45">hello@johndoe.com</p>
                    </div>
                    <button className="btn-secondary bg-[var(--featured-text)]/10 border-[var(--featured-text)]/10 text-[var(--featured-text)] hover:bg-[var(--featured-text)]/15 hover:text-[var(--featured-text)]">
                      Change Photo
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="surface-card p-5 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">First Name</label>
                    <input type="text" defaultValue="John" className="field-control px-3 py-2 text-base font-semibold font-display" />
                  </div>
                  <div className="surface-card p-5 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Last Name</label>
                    <input type="text" defaultValue="Doe" className="field-control px-3 py-2 text-base font-semibold font-display" />
                  </div>
                </div>

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Email Address</label>
                  <input type="email" defaultValue="hello@johndoe.com" className="field-control px-3 py-2 text-base font-semibold font-display" />
                </div>

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Company</label>
                  <input type="text" defaultValue="BillCraft Inc." className="field-control px-3 py-2 text-base font-semibold font-display" />
                </div>

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                    className="field-control px-3 py-2 text-base font-semibold font-display"
                  >
                    {CURRENCIES.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button className="btn-primary active:scale-[0.97]">
                    Save Changes
                  </button>
                </div>
              </>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <>
                <div className="surface-featured p-6 sm:p-7 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />
                  <div className="relative z-10 max-w-xl">
                    <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Theme Palettes</p>
                    <h2 className="text-2xl font-semibold text-[var(--featured-text)] font-display mb-1">Choose palettes for each mode</h2>
                    <p className="text-[12px] text-[var(--featured-text)]/50">Light and dark mode each use the palette you assign here.</p>
                  </div>
                </div>

                <div className="surface-card p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Current Mode</h3>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Switch modes to preview the saved light or dark palette.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--foreground)]/[0.04] p-1" role="radiogroup" aria-label="Theme mode">
                      {[
                        { id: "light" as const, label: "Light", icon: "light_mode" },
                        { id: "dark" as const, label: "Dark", icon: "dark_mode" },
                      ].map((themeMode) => {
                        const isSelected = activeTheme === themeMode.id;

                        return (
                          <button
                            key={themeMode.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => selectThemeMode(themeMode.id)}
                            className={`flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-[12px] font-semibold transition-smooth ${
                              isSelected
                                ? "bg-[var(--action)] text-[var(--action-text)]"
                                : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{themeMode.icon}</span>
                            {themeMode.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {modePaletteSettings.map((setting) => (
                    <div key={setting.mode} className="surface-card p-5">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{setting.title}</h3>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">{setting.description}</p>
                        </div>
                        <span className="rounded-md border border-[var(--card-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {setting.mode}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label={setting.title}>
                        {COLOR_PALETTES.map((palette) => {
                          const isSelected = setting.selectedPalette === palette.id;

                          return (
                            <button
                              key={`${setting.mode}-${palette.id}`}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setting.setPalette(palette.id)}
                              className={`rounded-lg border bg-[var(--background)]/35 p-3 text-left transition-smooth hover:border-[var(--accent)]/50 ${
                                isSelected
                                  ? "border-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                                  : "border-[var(--card-border)]"
                              }`}
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="text-[12px] font-semibold text-[var(--foreground)]">{palette.label}</span>
                                <span className={`size-6 rounded-full border flex shrink-0 items-center justify-center ${
                                  isSelected
                                    ? "border-[var(--action)] bg-[var(--action)] text-[var(--action-text)]"
                                    : "border-[var(--card-border)] text-transparent"
                                }`}>
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                                {palette.colors.map((color) => (
                                  <span
                                    key={color}
                                    className="h-10 rounded-md border border-[var(--foreground)]/10"
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
                                {palette.colors.map((color) => (
                                  <span key={color} className="text-[9px] font-semibold text-[var(--muted)]">
                                    {color.replace("#", "")}
                                  </span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="surface-card overflow-hidden">
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
                      className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${item.state ? 'bg-[var(--action)]' : 'bg-[var(--foreground)]/12'}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--action-text)] shadow ring-0 transition duration-200 ease-in-out mt-1 ${item.state ? 'translate-x-5 ml-0' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <>
                <div className="surface-featured p-6 sm:p-7 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Current Plan</p>
                    <h2 className="text-2xl font-semibold text-[var(--featured-text)] font-display mb-0.5">Professional</h2>
                    <p className="text-[12px] text-[var(--featured-text)]/45 mb-5">Unlimited invoices, clients, and export options</p>
                    <div className="flex gap-2">
                      <button className="btn-primary">
                        Upgrade Plan
                      </button>
                      <button className="px-4 py-2 text-[var(--featured-text)]/50 text-[12px] font-medium hover:text-[var(--featured-text)] transition-smooth">
                        View Billing History
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="surface-card p-5">
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
                  <div className="surface-card p-5">
                    <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Next Billing</p>
                    <p className="text-xl font-semibold text-[var(--foreground)] font-display">{formatCurrency(29, currency)}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Due Nov 1, 2023</p>
                  </div>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <>
                <div className="surface-card overflow-hidden">
                  <div className="p-5 border-b border-[var(--card-border)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Password</h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Last changed 3 months ago</p>
                      </div>
                      <button className="btn-secondary text-[11px] min-h-8 px-3 py-1.5">
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
                      <button className="btn-primary text-[11px] min-h-8 px-3 py-1.5">
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
                      <button className="btn-secondary text-[11px] min-h-8 px-3 py-1.5">
                        Manage
                      </button>
                    </div>
                  </div>
                </div>

                <div className="surface-card p-5 border-[var(--accent)]/15">
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
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2026 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

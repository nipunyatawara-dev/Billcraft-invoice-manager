"use client";

import { CURRENCIES, type CurrencyCode, useCurrency } from "@/hooks/use-currency";
import { COLOR_PALETTES, type ColorPaletteId, useModePalettes } from "@/hooks/use-mode-palettes";
import { TOAST_POSITIONS, type ToastPosition, useToastPosition } from "@/hooks/use-toast-position";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { useTheme } from "next-themes";
import { ChangeEvent, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

export default function Settings() {
  const { currency, setCurrency } = useCurrency();
  const { resolvedTheme, setTheme } = useTheme();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } = useModePalettes();
  const { toastPosition, setToastPosition } = useToastPosition();
  const { activeProfile, updateProfile, deleteProfile, deleteAllProfiles } = useUserData();
  const [invoiceReminders, setInvoiceReminders] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "appearance" | "notifications" | "security">("profile");
  const [profileForm, setProfileForm] = useState<ProfileDraft>({
    name: "",
    profession: "",
    email: "",
    phone: "",
    businessName: "",
    profilePic: "",
    signature: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (!activeProfile) {
      return;
    }

    setProfileForm({
      name: activeProfile.name,
      profession: activeProfile.profession,
      email: activeProfile.email || "",
      phone: activeProfile.phone || "",
      businessName: activeProfile.businessName || "",
      profilePic: activeProfile.profilePic || "",
      signature: activeProfile.signature || "",
    });
  }, [activeProfile]);

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: "person" },
    { id: "appearance" as const, label: "Appearance", icon: "palette" },
    { id: "notifications" as const, label: "Notifications", icon: "notifications" },
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
    notify.info({
      title: `${themeMode === "dark" ? "Dark" : "Light"} mode on`,
      description: "Your appearance preview has been updated.",
    });
  }

  function selectPalette(mode: ThemeMode, paletteId: ColorPaletteId, paletteLabel: string) {
    if (mode === "light") {
      setLightPalette(paletteId);
    } else {
      setDarkPalette(paletteId);
    }

    notify.success({
      title: `${mode === "light" ? "Light" : "Dark"} palette updated`,
      description: `${paletteLabel} will be used in ${mode} mode.`,
    });
  }

  function selectToastPosition(position: ToastPosition, label: string) {
    setToastPosition(position);
    notify.info({
      title: "Toast position updated",
      description: `Notifications will appear at ${label.toLowerCase()}.`,
      position,
    });
  }

  function togglePreference(label: string, currentValue: boolean, toggle: (nextValue: boolean) => void) {
    const nextValue = !currentValue;

    toggle(nextValue);
    notify.info({
      title: `${label} ${nextValue ? "enabled" : "disabled"}`,
      description: nextValue ? "This notification preference is now active." : "This notification preference is now off.",
    });
  }

  function handleProfileImageChange(field: "profilePic" | "signature", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileForm((currentForm) => ({ ...currentForm, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile() {
    if (isSavingProfile) {
      return;
    }

    if (!profileForm.name.trim() || !profileForm.profession.trim()) {
      notify.warning({
        title: "Profile details required",
        description: "Add your name and profession before saving.",
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      await notifyPromise(updateProfile(profileForm), {
        loading: {
          title: "Saving profile...",
          description: "Updating the identity used on invoices.",
        },
        success: {
          title: "Profile saved",
          description: "New invoice previews will use your latest details.",
        },
        error: (error) => ({
          title: "Profile save failed",
          description: getToastErrorMessage(error, "Unable to update this profile."),
        }),
      });
    } finally {
      setIsSavingProfile(false);
    }
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
                <div className="surface-featured p-6 sm:p-7 relative overflow-hidden">
                  <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                    <div className="size-16 rounded-lg bg-[var(--featured-text)]/10 border border-[var(--featured-text)]/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
                      {profileForm.profilePic ? (
                        <img className="h-full w-full object-cover" alt={profileForm.name || "Profile"} src={profileForm.profilePic} />
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-[var(--featured-text)]/35">person</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-[var(--featured-text)] font-display mb-0.5">{profileForm.name || "Your profile"}</h2>
                      <p className="text-[12px] text-[var(--featured-text)]/45">{profileForm.profession || "Profession"}</p>
                    </div>
                    <label className="btn-secondary bg-[var(--featured-text)]/10 border-[var(--featured-text)]/10 text-[var(--featured-text)] hover:bg-[var(--featured-text)]/15 hover:text-[var(--featured-text)] cursor-pointer">
                      Change Photo
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("profilePic", event)} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="surface-card p-5 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="settings-name">Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      value={profileForm.name}
                      onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                      className="field-control px-3 py-2 text-base font-semibold font-display"
                    />
                  </div>
                  <div className="surface-card p-5 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="settings-profession">Profession</label>
                    <input
                      id="settings-profession"
                      type="text"
                      value={profileForm.profession}
                      onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })}
                      className="field-control px-3 py-2 text-base font-semibold font-display"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="surface-card p-5 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="settings-email">Email Address</label>
                    <input
                      id="settings-email"
                      type="email"
                      value={profileForm.email}
                      onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })}
                      className="field-control px-3 py-2 text-base font-semibold font-display"
                    />
                  </div>
                  <div className="surface-card p-5 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="settings-phone">Phone</label>
                    <input
                      id="settings-phone"
                      type="text"
                      value={profileForm.phone}
                      onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })}
                      className="field-control px-3 py-2 text-base font-semibold font-display"
                    />
                  </div>
                </div>

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="settings-business">Business Name</label>
                  <input
                    id="settings-business"
                    type="text"
                    value={profileForm.businessName}
                    onChange={(event) => setProfileForm({ ...profileForm, businessName: event.target.value })}
                    className="field-control px-3 py-2 text-base font-semibold font-display"
                  />
                </div>

                <div className="surface-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="h-16 w-32 rounded-lg border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                      {profileForm.signature ? (
                        <img className="h-full w-full object-contain" alt="Signature" src={profileForm.signature} />
                      ) : (
                        <span className="material-symbols-outlined text-[var(--foreground)]/25">draw</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">Signature</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Used on invoice previews for this profile.</p>
                    </div>
                    <label className="btn-secondary cursor-pointer">
                      {profileForm.signature ? "Change Signature" : "Upload Signature"}
                      <input className="sr-only" type="file" accept="image/*" onChange={(event) => handleProfileImageChange("signature", event)} />
                    </label>
                  </div>
                </div>

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(event) => {
                      const nextCurrency = event.target.value as CurrencyCode;

                      setCurrency(nextCurrency);
                      notify.info({
                        title: "Currency updated",
                        description: `New invoice totals will use ${nextCurrency}.`,
                      });
                    }}
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
                  <button onClick={handleSaveProfile} className="btn-primary active:scale-[0.97]" disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving..." : "Save Changes"}
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
                              onClick={() => selectPalette(setting.mode, palette.id, palette.name)}
                              className={`rounded-lg border bg-[var(--background)]/35 p-3 text-left transition-smooth hover:border-[var(--accent)]/50 ${
                                isSelected
                                  ? "border-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                                  : "border-[var(--card-border)]"
                              }`}
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span>
                                  <span className="block text-[12px] font-semibold text-[var(--foreground)]">{palette.name}</span>
                                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{palette.label}</span>
                                </span>
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
              <div className="space-y-3">
                <div className="surface-card p-5">
                  <div className="mb-4">
                    <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Toast Position</h3>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">Choose where app notifications appear.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Toast position">
                    {TOAST_POSITIONS.map((position) => {
                      const isSelected = toastPosition === position.id;

                      return (
                        <button
                          key={position.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => selectToastPosition(position.id, position.label)}
                          className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-smooth ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--action)] text-[var(--action-text)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
                              : "border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{position.icon}</span>
                          {position.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="surface-card overflow-hidden">
                  {[
                    { label: "Invoice Reminders", desc: "Auto-send reminders for unpaid invoices", state: invoiceReminders, toggle: setInvoiceReminders },
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
                        onClick={() => togglePreference(item.label, item.state, item.toggle)}
                        className={`relative inline-flex h-6 w-10 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${item.state ? 'bg-[var(--action)]' : 'bg-[var(--foreground)]/12'}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--action-text)] shadow ring-0 transition duration-200 ease-in-out mt-1 ${item.state ? 'translate-x-5 ml-0' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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

                <div className="surface-card p-5 border-red-500/30 bg-red-500/[0.02]">
                  <h3 className="text-[13px] font-semibold text-red-500 mb-0.5">Danger Zone</h3>
                  <p className="text-[11px] text-red-500/70 mb-4">Permanently delete profile data. This action cannot be undone.</p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete the current profile?")) {
                          await notifyPromise(deleteProfile(), {
                            loading: { title: "Deleting profile...", description: "Please wait." },
                            success: { title: "Profile deleted", description: "The current profile has been removed." },
                            error: (e) => ({ title: "Delete failed", description: getToastErrorMessage(e, "Unable to delete profile.") })
                          });
                        }
                      }}
                      className="px-3 py-1.5 border border-red-500/30 rounded-lg text-[11px] font-semibold text-red-500 hover:bg-red-500/10 transition-smooth"
                    >
                      Delete current profile
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete ALL profiles?")) {
                          await notifyPromise(deleteAllProfiles(), {
                            loading: { title: "Deleting all profiles...", description: "Please wait." },
                            success: { title: "Profiles deleted", description: "All profiles have been removed." },
                            error: (e) => ({ title: "Delete failed", description: getToastErrorMessage(e, "Unable to delete profiles.") })
                          });
                        }
                      }}
                      className="px-3 py-1.5 border border-transparent rounded-lg text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-smooth"
                    >
                      Delete all profiles
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">© 2026 BillCraft. All rights reserved.</p>
      </footer>
    </>
  );
}

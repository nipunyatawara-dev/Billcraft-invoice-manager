"use client";

import { AnimatedText } from "@/components/animated-text";
import { CURRENCIES, type CurrencyCode, useCurrency } from "@/hooks/use-currency";
import { COLOR_PALETTES, type ColorPaletteId, useModePalettes } from "@/hooks/use-mode-palettes";
import { TOAST_POSITIONS, type ToastPosition, useToastPosition } from "@/hooks/use-toast-position";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { useTheme } from "next-themes";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
type SettingsTab = "profile" | "appearance" | "notifications" | "data" | "security" | "trash";
type ExportFormat = "json" | "csv";

type ExportRow = Record<string, string | number | null | undefined>;

function csvValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: ExportRow[]) {
  const columns = [
    "category",
    "id",
    "name",
    "email",
    "phone",
    "company",
    "date",
    "dueDate",
    "status",
    "total",
    "amountPaid",
    "balanceDue",
    "paidAt",
    "paymentMethod",
    "priority",
    "stage",
    "createdAt",
    "updatedAt",
    "details",
  ];

  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")),
  ].join("\n");
}

function downloadFile(fileName: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function fileSafeName(value?: string | null) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "billcraft-data";
}

export default function Settings() {
  const { currency, setCurrency, currencyMode, setCurrencyMode } = useCurrency();
  const { resolvedTheme, setTheme } = useTheme();
  const { lightPalette, darkPalette, setLightPalette, setDarkPalette } = useModePalettes();
  const { toastPosition, setToastPosition } = useToastPosition();
  const {
    activeProfile,
    activeProfileId,
    changeProfilePassword,
    clients,
    deleteAllProfiles,
    deleteProfile,
    invoices,
    loading,
    markProfileBackedUp,
    outsourcingInvoices,
    profiles,
    todoTasks,
    updateProfile,
    updateProfilePasswordHint,
    verifyProfilePassword,
    vendors,
    trash,
    restoreInvoices,
    emptyTrash,
  } = useUserData();
  const [invoiceReminders, setInvoiceReminders] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profileForm, setProfileForm] = useState<ProfileDraft>({
    name: "",
    profession: "",
    email: "",
    phone: "",
    businessName: "",
    defaultDeliveryLink: "",
    profilePic: "",
    signature: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [hintForm, setHintForm] = useState({
    currentPassword: "",
    passwordHint: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingHint, setIsSavingHint] = useState(false);
  const [exportRequest, setExportRequest] = useState<ExportFormat | null>(null);
  const [exportPassword, setExportPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const activeTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [activeFont, setActiveFont] = useState<string>("inter");
  const [isLightPaletteCollapsed, setIsLightPaletteCollapsed] = useState(false);
  const [isDarkPaletteCollapsed, setIsDarkPaletteCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedFont = window.localStorage.getItem("billcraft.font.v1");
      if (storedFont) {
        setActiveFont(storedFont);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTheme === "light") {
      setIsLightPaletteCollapsed(false);
      setIsDarkPaletteCollapsed(true);
    } else {
      setIsLightPaletteCollapsed(true);
      setIsDarkPaletteCollapsed(false);
    }
  }, [activeTheme]);

  const handleFontChange = (fontId: string) => {
    setActiveFont(fontId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("billcraft.font.v1", fontId);
      document.documentElement.dataset.font = fontId;
      notify.success({
        title: "Font style updated",
        description: `Font style set to ${fontId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}.`,
      });
    }
  };

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
      defaultDeliveryLink: activeProfile.defaultDeliveryLink || "",
      profilePic: activeProfile.profilePic || "",
      signature: activeProfile.signature || "",
    });
    setPasswordForm({
      currentPassword: "",
      password: "",
      confirmPassword: "",
    });
    setHintForm({
      currentPassword: "",
      passwordHint: activeProfile.passwordHint || "",
    });
  }, [activeProfile]);

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: "person" },
    { id: "appearance" as const, label: "Appearance", icon: "palette" },
    { id: "notifications" as const, label: "Notifications", icon: "notifications" },
    { id: "data" as const, label: "Your Data", icon: "database" },
    { id: "trash" as const, label: "Trash Bin", icon: "delete" },
    { id: "security" as const, label: "Security", icon: "shield" },
  ];

  const modePaletteSettings: {
    mode: "light" | "dark";
    title: string;
    description: string;
    selectedPalette: ColorPaletteId;
    setPalette: (palette: ColorPaletteId) => void;
    isCollapsed: boolean;
    toggleCollapse: () => void;
  }[] = [
    {
      mode: "light",
      title: "Light Mode Palette",
      description: "Used whenever the site is in light mode.",
      selectedPalette: lightPalette,
      setPalette: setLightPalette,
      isCollapsed: isLightPaletteCollapsed,
      toggleCollapse: () => setIsLightPaletteCollapsed(!isLightPaletteCollapsed),
    },
    {
      mode: "dark",
      title: "Dark Mode Palette",
      description: "Used whenever the site is in dark mode.",
      selectedPalette: darkPalette,
      setPalette: setDarkPalette,
      isCollapsed: isDarkPaletteCollapsed,
      toggleCollapse: () => setIsDarkPaletteCollapsed(!isDarkPaletteCollapsed),
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

  async function handleSavePassword() {
    if (isSavingPassword || !activeProfileId) {
      return;
    }

    if (passwordForm.password.length < 6) {
      notify.warning({
        title: "Password too short",
        description: "Use at least 6 characters. Numbers-only passwords are allowed.",
      });
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      notify.warning({
        title: "Passwords do not match",
        description: "Confirm the same new password before saving.",
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      await notifyPromise(changeProfilePassword({
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.password,
      }), {
        loading: {
          title: "Saving password...",
          description: "Updating this profile password.",
        },
        success: {
          title: "Password saved",
          description: "This profile will ask for the new password next login.",
        },
        error: (error) => ({
          title: "Password save failed",
          description: getToastErrorMessage(error, "Unable to change this password."),
        }),
      });
      setPasswordForm((currentForm) => ({
        ...currentForm,
        currentPassword: "",
        password: "",
        confirmPassword: "",
      }));
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleSavePasswordHint() {
    if (isSavingHint || !activeProfileId) {
      return;
    }

    setIsSavingHint(true);

    try {
      await notifyPromise(updateProfilePasswordHint({
        currentPassword: hintForm.currentPassword,
        passwordHint: hintForm.passwordHint,
      }), {
        loading: {
          title: "Saving hint...",
          description: "Updating this profile password hint.",
        },
        success: {
          title: "Hint saved",
          description: "This hint will show on password prompts.",
        },
        error: (error) => ({
          title: "Hint save failed",
          description: getToastErrorMessage(error, "Unable to update this hint."),
        }),
      });
      setHintForm((currentForm) => ({
        ...currentForm,
        currentPassword: "",
      }));
    } finally {
      setIsSavingHint(false);
    }
  }

  function formatPasswordChangedAt(value?: string) {
    if (!value) {
      return activeProfile?.hasPassword ? "Last changed date unavailable" : "No password set";
    }

    return `Last changed ${new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  function getExportSnapshot() {
    return {
      exportedAt: new Date().toISOString(),
      currency,
      activeProfileId,
      activeProfile,
      profiles,
      clients,
      invoices,
      vendors,
      outsourcingInvoices,
      todoTasks,
    };
  }

  async function markCurrentExportBackedUp() {
    try {
      await markProfileBackedUp();
    } catch {
      notify.warning({
        title: "Backup marker not saved",
        description: "The export downloaded, but BillCraft could not update the backup reminder.",
      });
    }
  }

  async function downloadJson() {
    const snapshot = getExportSnapshot();

    downloadFile(
      `${fileSafeName(activeProfile?.businessName || activeProfile?.name)}-${new Date().toISOString().slice(0, 10)}.json`,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "application/json;charset=utf-8",
    );

    await markCurrentExportBackedUp();

    notify.success({
      title: "Data exported",
      description: "JSON file is ready in your downloads.",
    });
  }

  async function downloadCsv() {
    const rows: ExportRow[] = [
      ...profiles.map((profile) => ({
        category: "profile",
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        company: profile.businessName,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        details: [profile.profession, profile.defaultDeliveryLink].filter(Boolean).join(" | "),
      })),
      ...clients.map((client) => ({
        category: "client",
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        company: client.company,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        details: [client.notes, client.address, client.whatsapp, client.deliveryLink].filter(Boolean).join(" | "),
      })),
      ...invoices.map((invoice) => ({
        category: "invoice",
        id: invoice.id,
        name: invoice.client,
        email: invoice.email,
        phone: invoice.phone,
        company: invoice.company,
        date: invoice.date,
        dueDate: invoice.dueDate,
        status: invoice.status,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balanceDue: Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0),
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        details: [
          invoice.paymentNotes,
          (invoice.payments || []).map((payment) => `${payment.paidAt}: ${payment.amount} via ${payment.method}`).join("; "),
          (invoice.items || []).map((item) => `${item.description}: ${item.quantity} x ${item.price}`).join("; "),
        ].filter(Boolean).join(" | "),
      })),
      ...vendors.map((vendor) => ({
        category: "vendor",
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        company: vendor.company,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        details: vendor.notes || vendor.address,
      })),
      ...outsourcingInvoices.map((invoice) => ({
        category: "outsourcing invoice",
        id: invoice.id,
        name: invoice.vendor,
        email: invoice.email,
        phone: invoice.phone,
        company: invoice.company,
        date: invoice.date,
        dueDate: invoice.dueDate,
        status: invoice.status,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balanceDue: Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0),
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        details: [
          invoice.paymentNotes,
          (invoice.payments || []).map((payment) => `${payment.paidAt}: ${payment.amount} via ${payment.method}`).join("; "),
          (invoice.items || []).map((item) => `${item.description}: ${item.quantity} x ${item.price}`).join("; "),
        ].filter(Boolean).join(" | "),
      })),
      ...todoTasks.map((task) => ({
        category: "todo",
        id: task.id,
        name: task.title,
        date: task.dueDate,
        priority: task.priority,
        stage: task.stage,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        details: [task.description, task.client, task.estimate, ...(task.tags || [])].filter(Boolean).join("; "),
      })),
    ];

    downloadFile(
      `${fileSafeName(activeProfile?.businessName || activeProfile?.name)}-${new Date().toISOString().slice(0, 10)}.csv`,
      `${toCsv(rows)}\n`,
      "text/csv;charset=utf-8",
    );

    await markCurrentExportBackedUp();

    notify.success({
      title: "Data exported",
      description: "CSV file is ready in your downloads.",
    });
  }

  function requestExport(format: ExportFormat) {
    if (!activeProfile?.hasPassword || !activeProfileId) {
      if (format === "json") {
        void downloadJson();
      } else {
        void downloadCsv();
      }
      return;
    }

    setExportRequest(format);
    setExportPassword("");
  }

  async function handleConfirmExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!exportRequest || !activeProfileId || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      await notifyPromise(verifyProfilePassword(activeProfileId, exportPassword), {
        loading: {
          title: "Checking password...",
          description: "Verifying before export.",
        },
        success: {
          title: "Password accepted",
          description: "Preparing your download.",
        },
        error: (error) => ({
          title: "Export blocked",
          description: getToastErrorMessage(error, "Incorrect password."),
        }),
      });

      if (exportRequest === "json") {
        await downloadJson();
      } else {
        await downloadCsv();
      }

      setExportRequest(null);
      setExportPassword("");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <main className="app-main flex-1">
        
        {/* Header */}
        <div className="mb-8 lg:mb-9">
          <AnimatedText as="p" text="Account" effect="micro-scale-fade" className="section-eyebrow" />
          <AnimatedText
            as="h1"
            text="Settings"
            effect="micro-scale-fade"
            className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
            delayMs={70}
          />
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
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-smooth whitespace-nowrap ${
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                    <div className="size-16 rounded-xl bg-[var(--featured-text)]/10 border border-[var(--featured-text)]/10 flex items-center justify-center shrink-0 overflow-hidden relative group">
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

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="settings-delivery-link">My Drive Location</label>
                  <input
                    id="settings-delivery-link"
                    type="url"
                    value={profileForm.defaultDeliveryLink}
                    onChange={(event) => setProfileForm({ ...profileForm, defaultDeliveryLink: event.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="field-control px-3 py-2 text-base font-semibold font-display"
                  />
                  <p className="text-[11px] text-[var(--muted)]">Shows as the My Drive location option when choosing where finished work should go.</p>
                </div>

                <div className="surface-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="h-16 w-32 rounded-xl border border-[var(--card-border)] overflow-hidden bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
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

                <div className="surface-card p-5 space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="currency-mode">Currency Conversion Mode</label>
                  <select
                    id="currency-mode"
                    value={currencyMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as "visual" | "convert";

                      setCurrencyMode(nextMode);
                      notify.info({
                        title: "Currency mode updated",
                        description: `Exchange rates will now be ${nextMode === "convert" ? "dynamically calculated" : "ignored (visual only)"}.`,
                      });
                    }}
                    className="field-control px-3 py-2 text-base font-semibold font-display"
                  >
                    <option value="visual">Visual Change Only (Keep values identical)</option>
                    <option value="convert">Convert Values (Dynamic Exchange Rate Conversion)</option>
                  </select>
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    Visual Change keeps numbers the same and changes the prefix sign. Convert Mode scales totals and line item costs by exchange rates.
                  </p>
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
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  {/* Left & Center Settings Panel (takes 3 cols on xl) */}
                  <div className="xl:col-span-3 space-y-6">
                    {/* Header Banner */}
                    <div className="surface-featured p-4 sm:p-4.5 relative overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                        <div className="max-w-xl">
                          <p className="text-[10px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-1.5">Theme & Customization</p>
                          <AnimatedText
                            as="h2"
                            text="Personalize your workspace"
                            effect="mask-reveal-up"
                            className="text-xl font-semibold text-[var(--featured-text)] font-display mb-0.5"
                            replayKey="appearance-palettes"
                          />
                          <p className="text-[11px] text-[var(--featured-text)]/50">Assign custom color palettes, switch between light and dark visual modes, and pick your typography.</p>
                        </div>
                      </div>
                    </div>

                    {/* Mode Cards Card */}
                    <div className="surface-card p-4 space-y-3">
                      <div>
                        <h3 className="text-[13px] font-bold text-[var(--foreground)] tracking-wide uppercase flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-[var(--accent)]">visibility</span>
                          Theme Mode
                        </h3>
                        <p className="text-[10.5px] text-[var(--muted)] mt-0.5">Switch between dynamic Light or Dark mode.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: "light" as const, label: "Light Mode", desc: "Clean and airy", icon: "light_mode" },
                          { id: "dark" as const, label: "Dark Mode", desc: "Sleek and dim", icon: "dark_mode" },
                        ].map((mode) => {
                          const isSelected = activeTheme === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => selectThemeMode(mode.id)}
                              className={`relative overflow-hidden p-3.5 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between h-[90px] active:scale-[0.98] ${
                                isSelected
                                  ? "border-[var(--accent)] shadow-[0_4px_24px_rgba(var(--accent-rgb),0.15)] ring-2 ring-[var(--accent)]/10"
                                  : "border-[var(--card-border)] hover:border-[var(--accent)]/50"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`size-7 rounded-xl flex items-center justify-center ${isSelected ? "bg-[var(--action)] text-[var(--action-text)]" : "bg-[var(--foreground)]/[0.04]"}`}>
                                  <span className="material-symbols-outlined text-[14px]">{mode.icon}</span>
                                </span>
                                {isSelected && (
                                  <span className="bg-[var(--action)] text-[var(--action-text)] text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                )}
                              </div>
                              
                              <div>
                                <span className="block text-[12.5px] font-bold text-[var(--foreground)] leading-tight">{mode.label}</span>
                                <span className="block text-[9.5px] text-[var(--muted)] mt-0">{mode.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Palette Switchers */}
                    <div className="space-y-4">
                      {modePaletteSettings.map((setting) => (
                        <div key={setting.mode} className="surface-card p-5 space-y-4 transition-all duration-300">
                          <button
                            type="button"
                            onClick={setting.toggleCollapse}
                            className="flex items-start justify-between gap-3 w-full text-left focus:outline-none hover:opacity-95 transition-opacity"
                          >
                            <div className="pr-4">
                              <h3 className="text-[14px] font-bold text-[var(--foreground)] tracking-wide uppercase flex items-center gap-1.5 select-none">
                                <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">palette</span>
                                {setting.title}
                              </h3>
                              <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-normal">{setting.description}</p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="rounded-full border border-[var(--card-border)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--foreground)]/[0.02]">
                                {setting.mode}
                              </span>
                              <span className="material-symbols-outlined text-[18px] text-[var(--muted)] transition-transform duration-300" style={{ transform: setting.isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                                keyboard_arrow_down
                              </span>
                            </div>
                          </button>

                          <div 
                            className={`grid transition-all duration-300 ease-in-out ${
                              setting.isCollapsed 
                                ? "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none" 
                                : "grid-rows-[1fr] opacity-100 mt-4"
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 pb-1">
                                {COLOR_PALETTES.filter((palette) => {
                                  if (setting.mode === "light") {
                                    return palette.id !== "palette-7";
                                  } else {
                                    return palette.id !== "palette-6";
                                  }
                                }).map((palette) => {
                                  const isSelected = setting.selectedPalette === palette.id;

                                  return (
                                    <button
                                      key={`${setting.mode}-${palette.id}`}
                                      type="button"
                                      onClick={() => selectPalette(setting.mode, palette.id, palette.name)}
                                      className={`group relative overflow-hidden rounded-2xl border bg-[var(--background)]/35 p-4 text-left transition-all duration-300 flex flex-col justify-between h-[155px] active:scale-[0.98] ${
                                        isSelected
                                          ? "border-[var(--accent)] shadow-[0_8px_30px_rgba(var(--accent-rgb),0.06)] ring-2 ring-[var(--accent)]/10"
                                          : "border-[var(--card-border)] hover:border-[var(--accent)]/40"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full mb-3">
                                        <div>
                                          <span className="block text-[12.5px] font-bold text-[var(--foreground)] leading-tight">{palette.name}</span>
                                          <span className="block text-[9.5px] font-bold uppercase tracking-wider text-[var(--muted)] mt-0.5">{palette.label}</span>
                                        </div>
                                        <span className={`size-5 rounded-full border flex shrink-0 items-center justify-center transition-all ${
                                          isSelected
                                            ? "border-[var(--action)] bg-[var(--action)] text-[var(--action-text)] scale-110"
                                            : "border-[var(--card-border)] text-transparent"
                                        }`}>
                                          <span className="material-symbols-outlined text-[12px]">check</span>
                                        </span>
                                      </div>

                                      <div className="flex gap-1.5 w-full overflow-hidden mb-2.5">
                                        {palette.colors.map((color, colorIdx) => (
                                          <span
                                            key={colorIdx}
                                            className="h-7 flex-1 rounded-lg border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-[1.03]"
                                            style={{ 
                                              backgroundColor: color,
                                              boxShadow: isSelected ? `0 2px 8px ${color}22` : "none"
                                            }}
                                          />
                                        ))}
                                      </div>

                                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[8.5px] font-mono text-[var(--muted)] leading-none">
                                        {palette.colors.map((color, idx) => (
                                          <span key={idx} className="transition-colors group-hover:text-[var(--foreground)]">
                                            {color.replace("#", "")}
                                          </span>
                                        ))}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Typography Box */}
                    <div className="surface-card p-5 space-y-4">
                      <div>
                        <h3 className="text-[14px] font-bold text-[var(--foreground)] tracking-wide uppercase flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">font_download</span>
                          Typography settings
                        </h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Customize the default platform font-family.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: "inter", name: "Inter", desc: "Universal, modern sans-serif, standard for SaaS", family: "'Inter', sans-serif", previewText: "Abc 123 • Pure & Universal" },
                          { id: "open-sans", name: "Open Sans", desc: "Friendly and highly readable screen interface", family: "'Open Sans', sans-serif", previewText: "Abc 123 • Warm & Legible" },
                          { id: "google-sans-flex", name: "Google Sans Flex", desc: "Premium variable geometric with flawless hierarchy", family: "'Google Sans Flex', sans-serif", previewText: "Abc 123 • Sleek & Variable" },
                          { id: "outfit", name: "Outfit", desc: "Elegant geometric inspired by premium branding", family: "'Outfit', sans-serif", previewText: "Abc 123 • Elegant & Brand" },
                          { id: "plus-jakarta-sans", name: "Plus Jakarta Sans", desc: "Sleek and vibrant modern geometric visual feel", family: "'Plus Jakarta Sans', sans-serif", previewText: "Abc 123 • Vibrant & Modern" }
                        ].map((font) => {
                          const isSelected = activeFont === font.id;
                          
                          return (
                            <button
                              key={font.id}
                              type="button"
                              onClick={() => handleFontChange(font.id)}
                              className={`rounded-2xl border bg-[var(--background)]/35 p-4 text-left transition-all duration-300 flex flex-col justify-between h-auto pb-4 gap-4 hover:border-[var(--accent)]/50 active:scale-[0.98] ${
                                isSelected
                                  ? "border-[var(--accent)] shadow-[0_8px_30px_rgba(var(--accent-rgb),0.06)] ring-2 ring-[var(--accent)]/10"
                                  : "border-[var(--card-border)]"
                              }`}
                            >
                              <div className="w-full flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0">
                                  <span className="block text-[13px] font-bold text-[var(--foreground)]">{font.name}</span>
                                  <span className="block text-[10px] text-[var(--muted)] mt-0.5 leading-snug">{font.desc}</span>
                                </div>
                                <span className={`size-5 rounded-full border flex shrink-0 items-center justify-center transition-all ${
                                  isSelected
                                    ? "border-[var(--action)] bg-[var(--action)] text-[var(--action-text)] scale-110"
                                    : "border-[var(--card-border)] text-transparent"
                                }`}>
                                  <span className="material-symbols-outlined text-[12px]">check</span>
                                </span>
                              </div>
                              
                              <div 
                                className="mt-2 w-full py-3 px-4 rounded-xl bg-[var(--foreground)]/[0.02] border border-[var(--card-border)] text-center text-[13px] font-bold tracking-wide"
                                style={{ fontFamily: font.family }}
                              >
                                {font.previewText}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Interactive UI Preview Playground */}
                  <div className="xl:col-span-2">
                    <div className="surface-card p-5 border border-[var(--card-border)] rounded-2xl relative overflow-hidden backdrop-blur-md space-y-4 xl:sticky xl:top-24">


                      <div className="border-b border-[var(--card-border)] pb-3 flex justify-center text-center">
                        <h4 className="text-[12.5px] font-bold text-[var(--foreground)] tracking-wide uppercase flex items-center justify-center gap-1.5 w-full">
                          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">desktop_windows</span>
                          UI Playground
                        </h4>
                      </div>

                      {/* Simulated Web Application Screen */}
                      <div 
                        className="surface-card bg-[var(--background)] border border-[var(--card-border)] rounded-2xl shadow-xl transition-all duration-300 relative overflow-hidden"
                        style={{ 
                          fontFamily: activeFont === 'inter' 
                            ? 'Inter, sans-serif' 
                            : activeFont === 'outfit' 
                              ? 'Outfit, sans-serif' 
                              : activeFont === 'plus-jakarta-sans' 
                                ? 'Plus Jakarta Sans, sans-serif' 
                                : activeFont === 'open-sans' 
                                  ? 'Open Sans, sans-serif' 
                                  : 'Google Sans Flex, sans-serif',
                          minHeight: "300px"
                        }}
                      >

                        {/* Desktop App Mockup Layout */}
                        <div className="flex flex-col h-[260px] text-[11px] overflow-hidden bg-[var(--background)]">
                          {/* Desktop Top Header Bar */}
                          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--card-border)] bg-[var(--foreground)]/[0.01] shrink-0">
                            <div className="flex items-center gap-3">
                              <span className="size-6 rounded-lg bg-[var(--action)]/10 text-[var(--action)] flex items-center justify-center font-bold text-[11px]">B</span>
                              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--muted)]">
                                <span className="text-[var(--action)]">Invoices</span>
                                <span className="opacity-40">•</span>
                                <span className="hover:text-[var(--foreground)] transition-colors">Clients</span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-[14px] text-[var(--muted)] opacity-60">account_circle</span>
                          </div>

                          {/* Desktop Main Content */}
                          <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto">
                            {/* Header row */}
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <h5 className="text-[12px] font-bold text-[var(--foreground)] tracking-tight leading-tight">Invoices</h5>
                                <span className="text-[8.5px] text-[var(--muted)] tracking-wide font-semibold block uppercase">Active Profile</span>
                              </div>
                              <button type="button" className="btn-primary min-h-[22px] px-2 rounded-md py-0.5 text-[8.5px] font-bold shadow-md cursor-default pointer-events-none flex items-center gap-1 shrink-0">
                                <span className="material-symbols-outlined text-[11px]">add</span>
                                Create
                              </button>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.01] space-y-0.5">
                                <span className="text-[7.5px] font-bold text-[var(--muted)] uppercase tracking-wider block leading-none">Billed</span>
                                <div className="text-[12px] font-black text-[var(--foreground)] leading-none">$14.2k</div>
                              </div>
                              <div className="p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--foreground)]/[0.01] space-y-0.5">
                                <span className="text-[7.5px] font-bold text-[var(--muted)] uppercase tracking-wider block leading-none">Pending</span>
                                <div className="text-[12px] font-black text-[var(--foreground)] leading-none">$3.2k</div>
                              </div>
                            </div>

                            {/* Mini Invoices List */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[7.5px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--card-border)] pb-1">
                                <span>Client</span>
                                <span className="text-right">Amount</span>
                                <span className="text-right">Status</span>
                              </div>

                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-[var(--foreground)] truncate max-w-[80px]">Acme Corp</span>
                                <span className="font-semibold text-[var(--foreground)]">$1.5k</span>
                                <span className="px-1.5 py-0.5 rounded bg-[var(--positive-soft)] text-[7px] font-bold text-[var(--positive)] tracking-wider uppercase border border-[var(--positive)]/10 leading-none">
                                  Paid
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-[var(--foreground)] truncate max-w-[80px]">Stark Labs</span>
                                <span className="font-semibold text-[var(--foreground)]">$2.8k</span>
                                <span className="px-1.5 py-0.5 rounded bg-[var(--action)]/12 text-[7px] font-bold text-[var(--action)] tracking-wider uppercase border border-[var(--action)]/10 leading-none">
                                  Sent
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Info */}
                      <div className="bg-[var(--foreground)]/[0.02] border border-[var(--card-border)] rounded-xl p-3 flex gap-2.5 items-start text-[10px] text-[var(--muted)]">
                        <span className="material-symbols-outlined text-[16px] text-[var(--accent)] shrink-0">info</span>
                        <p className="leading-normal">
                          This canvas updates dynamically in real-time. Customize theme color styles or typography fonts to preview.
                        </p>
                      </div>
                    </div>
                  </div>
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
                          className={`flex min-h-10 items-center justify-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-smooth ${
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

            {/* Your Data Tab */}
            {activeTab === "data" && (
              <>
                <div className="surface-featured p-6 sm:p-7 relative overflow-hidden">
                  <div className="relative z-10 max-w-xl">
                    <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Your Data</p>
                    <AnimatedText
                      as="h2"
                      text="Download your BillCraft data"
                      effect="mask-reveal-up"
                      className="text-2xl font-semibold text-[var(--featured-text)] font-display mb-1"
                      replayKey="data-export"
                    />
                    <p className="text-[12px] text-[var(--featured-text)]/50">Export profiles, clients, invoices, vendors, outsourcing invoices, and to-do tasks.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  {[
                    { label: "Profiles", value: profiles.length },
                    { label: "Clients", value: clients.length },
                    { label: "Invoices", value: invoices.length },
                    { label: "Vendors", value: vendors.length },
                    { label: "Tasks", value: todoTasks.length },
                  ].map((item) => (
                    <div key={item.label} className="surface-card p-4">
                      <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)] font-display">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="surface-card p-5">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="material-symbols-outlined mt-0.5 text-[22px] text-[var(--action)]">data_object</span>
                      <div>
                        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">JSON Export</h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Complete snapshot with nested invoice items and profile metadata.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => requestExport("json")}
                      disabled={loading}
                      className="btn-primary w-full justify-center active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download JSON
                    </button>
                  </div>

                  <div className="surface-card p-5">
                    <div className="mb-5 flex items-start gap-3">
                      <span className="material-symbols-outlined mt-0.5 text-[22px] text-[var(--action)]">table</span>
                      <div>
                        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">CSV Export</h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">Spreadsheet-friendly rows grouped by data category.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => requestExport("csv")}
                      disabled={loading}
                      className="btn-secondary w-full justify-center active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      Download CSV
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <>
                <div className="surface-card p-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Profile Password</h3>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{formatPasswordChangedAt(activeProfile?.passwordChangedAt)}</p>
                    </div>
                    <span className="material-symbols-outlined text-[22px] text-[var(--action)]">lock</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeProfile?.hasPassword && (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="current-password">Current Password</label>
                        <input
                          id="current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                          className="field-control px-3 py-2 text-base font-semibold font-display"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="new-password">New Password</label>
                      <input
                        id="new-password"
                        type="password"
                        minLength={6}
                        value={passwordForm.password}
                        onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
                        className="field-control px-3 py-2 text-base font-semibold font-display"
                      />
                      <p className="text-[10px] text-[var(--muted)]">Minimum 6 characters. Numbers-only is fine.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="confirm-new-password">Confirm New Password</label>
                      <input
                        id="confirm-new-password"
                        type="password"
                        minLength={6}
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                        className="field-control px-3 py-2 text-base font-semibold font-display"
                      />
                    </div>

                  </div>

                  <div className="mt-5 flex justify-end">
                    <button onClick={handleSavePassword} className="btn-primary active:scale-[0.97]" disabled={isSavingPassword || !activeProfileId}>
                      {isSavingPassword ? "Saving..." : activeProfile?.hasPassword ? "Change Password" : "Set Password"}
                    </button>
                  </div>
                </div>

                <div className="surface-card p-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Password Hint</h3>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">Saved separately from your password.</p>
                    </div>
                    <span className="material-symbols-outlined text-[22px] text-[var(--action)]">psychology</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {activeProfile?.hasPassword && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="hint-current-password">Current Password</label>
                        <input
                          id="hint-current-password"
                          type="password"
                          value={hintForm.currentPassword}
                          onChange={(event) => setHintForm({ ...hintForm, currentPassword: event.target.value })}
                          className="field-control px-3 py-2 text-base font-semibold font-display"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="password-hint">Hint</label>
                      <input
                        id="password-hint"
                        type="text"
                        value={hintForm.passwordHint}
                        onChange={(event) => setHintForm({ ...hintForm, passwordHint: event.target.value })}
                        className="field-control px-3 py-2 text-base font-semibold font-display"
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button onClick={handleSavePasswordHint} className="btn-secondary active:scale-[0.97]" disabled={isSavingHint || !activeProfileId}>
                      {isSavingHint ? "Saving..." : "Save Hint"}
                    </button>
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
                      className="px-3 py-1.5 border border-red-500/30 rounded-full text-[11px] font-semibold text-red-500 hover:bg-red-500/10 transition-smooth"
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
                      className="px-3 py-1.5 border border-transparent rounded-full text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-smooth"
                    >
                      Delete all profiles
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Trash Bin Tab */}
            {activeTab === "trash" && (
              <>
                <div className="surface-featured p-6 sm:p-7 relative overflow-hidden">
                  <div className="relative z-10 max-w-xl">
                    <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">System Storage</p>
                    <AnimatedText
                      as="h2"
                      text="Trash Bin"
                      effect="mask-reveal-up"
                      className="text-2xl font-semibold text-[var(--featured-text)] font-display mb-1"
                      replayKey="trash-bin"
                    />
                    <p className="text-[12px] text-[var(--featured-text)]/50">
                      Recover soft-deleted invoices or permanently wipe them to free up profile slot space.
                    </p>
                  </div>
                </div>

                <div className="surface-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--foreground)]">Wipe Deleted Items</h3>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">
                        Wiping the trash permanently destroys all deleted items.
                      </p>
                    </div>
                    {trash.length > 0 && (
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to permanently delete all items in the Trash Bin? This action cannot be undone.")) {
                            await notifyPromise(emptyTrash(), {
                              loading: { title: "Emptying trash...", description: "Wiping deleted items." },
                              success: { title: "Trash emptied", description: "All deleted invoices were permanently removed." },
                              error: (e) => ({ title: "Wipe failed", description: getToastErrorMessage(e, "Unable to empty trash.") })
                            });
                          }
                        }}
                        className="px-4 py-2 border border-red-500/30 rounded-xl text-[12px] font-semibold text-red-500 hover:bg-red-500/10 active:scale-[0.97] transition-smooth flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                        Empty Trash Bin
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  {trash.length > 0 ? (
                    trash.map((item) => (
                      <div
                        key={item.id}
                        className="surface-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--card-border)] bg-[var(--background)]/35 hover:border-[var(--foreground)]/15 transition-smooth rounded-xl"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-semibold tracking-wide uppercase">
                              {item.id}
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">
                              Deleted: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently"}
                            </span>
                          </div>
                          <h4 className="text-[13.5px] font-semibold text-[var(--foreground)] truncate">
                            Client: {item.client || "Unknown Client"}
                          </h4>
                          <p className="text-[11.5px] text-[var(--muted)] mt-0.5">
                            Original Date: {item.date || "N/A"} • Amount: <strong className="text-[var(--foreground)]">{item.amount || "N/A"}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              await notifyPromise(restoreInvoices([item.id]), {
                                loading: { title: "Restoring invoice...", description: "Moving item back to your active list." },
                                success: { title: "Invoice restored", description: `${item.id} is now back in your invoices.` },
                                error: (e) => ({ title: "Restore failed", description: getToastErrorMessage(e, "Unable to restore invoice.") })
                              });
                            }}
                            className="btn-secondary min-h-8 px-3 text-[11.5px] flex items-center gap-1 active:scale-[0.97]"
                          >
                            <span className="material-symbols-outlined text-[15px]">restore_from_trash</span>
                            Restore
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--foreground)]/[0.01] p-8 text-center flex flex-col items-center justify-center min-h-[180px]">
                      <span className="material-symbols-outlined text-[36px] text-[var(--foreground)]/12 mb-3">delete_outline</span>
                      <p className="text-[13px] font-semibold text-[var(--muted)]">Your Trash Bin is empty</p>
                      <p className="text-[11px] text-[var(--muted)]/60 mt-1">Deleted invoices will show up here for recovery.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {exportRequest && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel export"
            className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm"
            onClick={() => {
              if (!isExporting) {
                setExportRequest(null);
                setExportPassword("");
              }
            }}
          />
          <form onSubmit={handleConfirmExport} className="modal-surface relative max-w-md p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="size-10 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </span>
              <div>
                <AnimatedText as="p" text="Export" effect="micro-scale-fade" className="section-eyebrow" />
                <AnimatedText
                  as="h2"
                  text={`Confirm ${exportRequest.toUpperCase()} export`}
                  effect="mask-reveal-up"
                  className="text-xl font-semibold text-[var(--foreground)] font-display"
                  replayKey={`export-${exportRequest}`}
                />
                {activeProfile?.passwordHint && (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">Hint: {activeProfile.passwordHint}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="export-password">Profile Password</label>
              <input
                id="export-password"
                type="password"
                value={exportPassword}
                onChange={(event) => setExportPassword(event.target.value)}
                className="field-control px-3 py-2"
                autoFocus
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={isExporting}
                onClick={() => {
                  setExportRequest(null);
                  setExportPassword("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary active:scale-[0.97]" disabled={isExporting}>
                {isExporting ? "Checking..." : "Export"}
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="mt-auto p-5 text-center">
        <p className="text-[11px] font-medium text-[var(--foreground)]/25">
          Made with ❤️ by{" "}
          <a
            href="https://shockagg.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--foreground)]/50 hover:text-[var(--action)] transition-smooth"
          >
            ShockaGG
          </a>
        </p>
      </footer>
    </>
  );
}

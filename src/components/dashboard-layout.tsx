"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { PageLoadingSkeleton, getLoadingSkeletonVariant } from "@/components/page-loading-skeleton";
import { ProfileCreateOnboarding } from "@/components/profile-create-onboarding";
import { ProfileOnboarding } from "@/components/profile-onboarding";
import { getBalanceDue, isRecordOverdue } from "@/data/invoices";
import { useModePalettes } from "@/hooks/use-mode-palettes";
import { useUserData, type ProfileDraft } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "ph ph-house", activeIcon: "ph-fill ph-house" },
  { href: "/invoices", label: "Invoices", icon: "ph ph-file-text", activeIcon: "ph-fill ph-file-text" },
  { href: "/expenses", label: "Expenses", icon: "ph ph-wallet", activeIcon: "ph-fill ph-wallet" },
  { href: "/clients", label: "Clients", icon: "ph ph-users", activeIcon: "ph-fill ph-users" },
  { href: "/analytics", label: "Analytics", icon: "ph ph-chart-bar", activeIcon: "ph-fill ph-chart-bar" },
];

const WORK_NAV_ITEMS = [
  { href: "/outsourcing", label: "Outsourcing", icon: "ph ph-briefcase", activeIcon: "ph-fill ph-briefcase" },
  { href: "/todo", label: "To-Do", icon: "ph ph-check-square-offset", activeIcon: "ph-fill ph-check-square-offset" },
  { href: "/catalog", label: "Catalog", icon: "ph ph-box-arrow-down", activeIcon: "ph-fill ph-box-arrow-down" },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings", icon: "ph ph-gear", activeIcon: "ph-fill ph-gear" },
];

const EMPTY_PROFILE_FORM: ProfileDraft = {
  name: "",
  profession: "",
  email: "",
  phone: "",
  businessName: "",
  profilePic: "",
  signature: "",
  password: "",
  passwordHint: "",
};

const ACTIVE_ONBOARDING_PROFILE_KEY = "billcraft.profile-onboarding.active.v1";
const NOTIFICATION_TOAST_DURATION = 4200;
const NOTIFICATION_TOAST_OPTIONS = {
  duration: NOTIFICATION_TOAST_DURATION,
  autopilot: false,
} as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getTimeValue(value?: string) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useModePalettes();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationBadgeOpen, setIsNotificationBadgeOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showCreateProfileForm, setShowCreateProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileDraft>(EMPTY_PROFILE_FORM);
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState("");
  const [profileAccessPassword, setProfileAccessPassword] = useState("");
  const [pendingSwitchProfileId, setPendingSwitchProfileId] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [onboardingProfileId, setOnboardingProfileId] = useState<string | null>(null);
  const [osKey, setOsKey] = useState("⌘");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const {
    activeProfile,
    activeProfileId,
    clients,
    createProfile,
    error,
    invoices,
    isProfileLocked,
    loading,
    logoutProfile,
    outsourcingInvoices,
    profiles,
    switchProfile,
    todoTasks,
    unlockProfile,
    vendors,
    expenses,
    catalogItems,
  } = useUserData();
  const isFirstRun = !loading && profiles.length === 0;
  const activeAlerts = useMemo(() => {
    const overdueInvoices = invoices.filter(isRecordOverdue);
    const tasksDueToday = todoTasks.filter((task) => task.stage !== "done" && task.dueDate === todayKey());
    const unpaidVendorInvoices = outsourcingInvoices.filter((invoice) => getBalanceDue(invoice) > 0);
    const latestProfileDataTime = Math.max(
      getTimeValue(activeProfile?.updatedAt),
      ...clients.map((client) => getTimeValue(client.updatedAt || client.createdAt)),
      ...invoices.map((invoice) => getTimeValue(invoice.updatedAt || invoice.createdAt)),
      ...vendors.map((vendor) => getTimeValue(vendor.updatedAt || vendor.createdAt)),
      ...outsourcingInvoices.map((invoice) => getTimeValue(invoice.updatedAt || invoice.createdAt)),
      ...todoTasks.map((task) => getTimeValue(task.updatedAt || task.createdAt)),
    );
    const hasProfileData = clients.length + invoices.length + vendors.length + outsourcingInvoices.length + todoTasks.length > 0;
    const profileNeedsBackup = Boolean(
      activeProfile &&
      hasProfileData &&
      (!activeProfile.lastBackupAt || getTimeValue(activeProfile.lastBackupAt) < latestProfileDataTime),
    );

    return [
      overdueInvoices.length > 0
        ? { icon: "warning", label: "Overdue invoices", count: overdueInvoices.length, detail: "Client invoices need follow-up." }
        : null,
      tasksDueToday.length > 0
        ? { icon: "event", label: "Tasks due today", count: tasksDueToday.length, detail: "To-do items are due today." }
        : null,
      profileNeedsBackup
        ? { icon: "backup", label: "Profile backup due", count: 1, detail: "Export the latest local data from Settings." }
        : null,
      unpaidVendorInvoices.length > 0
        ? { icon: "engineering", label: "Unpaid vendor invoices", count: unpaidVendorInvoices.length, detail: "Outsourcing payables still have a balance." }
        : null,
    ].filter(Boolean) as Array<{ icon: string; label: string; count: number; detail: string }>;
  }, [activeProfile, clients, invoices, outsourcingInvoices, todoTasks, vendors]);
  const alertCount = activeAlerts.reduce((sum, alert) => sum + alert.count, 0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    const results = [];
    
    // Pages
    const pages = [...NAV_ITEMS, ...WORK_NAV_ITEMS, ...BOTTOM_NAV].filter(p => p.label.toLowerCase().includes(q));
    if (pages.length) {
      results.push({ group: "Pages", items: pages.map(p => ({ id: p.href, label: p.label, icon: p.icon, href: p.href })) });
    }

    // Settings Tabs
    const settingsTabs = [
      { id: "profile", label: "Profile Settings", icon: "ph ph-user" },
      { id: "appearance", label: "Appearance", icon: "ph ph-palette" },
      { id: "notifications", label: "Notifications", icon: "ph ph-bell" },
      { id: "data", label: "Your Data", icon: "ph ph-database" },
      { id: "security", label: "Security", icon: "ph ph-shield" },
      { id: "trash", label: "Trash Bin", icon: "ph ph-trash" },
    ].filter(t => t.label.toLowerCase().includes(q));
    if (settingsTabs.length) {
      results.push({ group: "Settings", items: settingsTabs.map(t => ({ id: t.id, label: t.label, icon: t.icon, href: `/settings?tab=${t.id}` })) });
    }

    // Clients
    const matchedClients = clients.filter(c => c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q));
    if (matchedClients.length) {
      results.push({ group: "Clients", items: matchedClients.map(c => ({ id: c.id, label: c.name + (c.company ? ` (${c.company})` : ''), icon: "ph ph-user-circle", href: `/clients?id=${c.id}` })) });
    }

    // Invoices
    const matchedInvoices = invoices.filter(i => i.id.toLowerCase().includes(q) || i.client.toLowerCase().includes(q));
    if (matchedInvoices.length) {
      results.push({ group: "Invoices", items: matchedInvoices.map(i => ({ id: i.id, label: `${i.id} - ${i.client}`, icon: "ph ph-receipt", href: `/invoices?id=${i.id}` })) });
    }

    // Expenses
    const matchedExpenses = expenses.filter(e => e.merchant.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    if (matchedExpenses.length) {
      results.push({ group: "Expenses", items: matchedExpenses.map(e => ({ id: e.id, label: `${e.merchant} - ${e.description}`, icon: "ph ph-wallet", href: `/expenses?id=${e.id}` })) });
    }

    // Catalog
    const matchedCatalog = catalogItems.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    if (matchedCatalog.length) {
      results.push({ group: "Catalog", items: matchedCatalog.map(c => ({ id: c.id, label: c.name, icon: "ph ph-box-arrow-down", href: `/catalog?id=${c.id}` })) });
    }

    // Todo
    const matchedTodos = todoTasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    if (matchedTodos.length) {
      results.push({ group: "To-Do", items: matchedTodos.map(t => ({ id: t.id, label: t.title, icon: "ph ph-check-square-offset", href: `/todo?id=${t.id}` })) });
    }

    // Vendors
    const matchedVendors = vendors.filter(v => v.name.toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q) || (v.phone || "").toLowerCase().includes(q));
    if (matchedVendors.length) {
      results.push({ group: "Vendors", items: matchedVendors.map(v => ({ id: v.id, label: v.name, icon: "ph ph-storefront", href: `/outsourcing?vendor=${v.id}` })) });
    }

    // Payables (Outsourcing Invoices)
    const matchedPayables = outsourcingInvoices.filter(i => i.id.toLowerCase().includes(q) || i.vendor.toLowerCase().includes(q));
    if (matchedPayables.length) {
      results.push({ group: "Payables", items: matchedPayables.map(i => ({ id: i.id, label: `${i.id} - ${i.vendor}`, icon: "ph ph-receipt-x", href: `/outsourcing?id=${i.id}` })) });
    }

    return results;
  }, [searchQuery, clients, invoices, expenses, catalogItems, todoTasks]);

  useEffect(() => {
    if (isFirstRun) {
      setIsProfileModalOpen(true);
      setShowCreateProfileForm(true);
    }
  }, [isFirstRun]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      setOsKey(isMac ? "⌘" : "Ctrl");
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const isSearchKey = e.key.toLowerCase() === "k" || e.key.toLowerCase() === "f";
      
      if (modifier && isSearchKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery) {
      e.preventDefault();
      const firstGroup = searchResults[0];
      if (firstGroup && firstGroup.items[0]) {
        router.push(firstGroup.items[0].href);
        setIsSearchFocused(false);
        setSearchQuery("");
      }
    }
  };

  useEffect(() => {
    if (isProfileLocked && activeProfileId) {
      setIsProfileModalOpen(true);
      setShowCreateProfileForm(false);
      setPendingSwitchProfileId(null);
      setProfileAccessPassword("");
      setProfileMessage("");
    }
  }, [activeProfileId, isProfileLocked]);

  useEffect(() => {
    const badgeTimer = window.setTimeout(() => setIsNotificationBadgeOpen(true), 120);

    return () => window.clearTimeout(badgeTimer);
  }, []);

  useEffect(() => {
    if (loading || onboardingProfileId) {
      return;
    }

    const storedProfileId = window.localStorage.getItem(ACTIVE_ONBOARDING_PROFILE_KEY);

    if (storedProfileId) {
      if (profiles.some((profile) => profile.id === storedProfileId)) {
        setOnboardingProfileId(storedProfileId);
        setIsSidebarOpen(true);
      } else {
        window.localStorage.removeItem(ACTIVE_ONBOARDING_PROFILE_KEY);
      }
    }
  }, [loading, onboardingProfileId, profiles]);

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setIsSidebarOpen(false);
    }
  }

  function closeProfileModal() {
    if (isFirstRun || profileSaving || isProfileLocked) {
      return;
    }

    setIsProfileModalOpen(false);
    setShowCreateProfileForm(false);
    setProfileForm(EMPTY_PROFILE_FORM);
    setProfilePasswordConfirm("");
    setProfileAccessPassword("");
    setPendingSwitchProfileId(null);
    setProfileMessage("");
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

  async function handleCreateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (profileSaving) {
      return;
    }

    if (!profileForm.name.trim() || !profileForm.profession.trim()) {
      notify.warning({
        title: "Profile details required",
        description: "Add your name and profession to create a profile.",
      });
      return;
    }

    if ((profileForm.password || "").length < 6) {
      notify.warning({
        title: "Password required",
        description: "Use at least 6 characters. Numbers-only passwords are allowed.",
      });
      return;
    }

    if (profileForm.password !== profilePasswordConfirm) {
      notify.warning({
        title: "Passwords do not match",
        description: "Confirm the same password before creating this profile.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const createdProfile = await notifyPromise(createProfile(profileForm), {
        loading: {
          title: "Creating profile...",
          description: "Preparing your local invoice workspace.",
        },
        success: {
          title: "Profile created",
          description: `${profileForm.name.trim()} is ready for invoices.`,
        },
        error: (error) => ({
          title: "Profile creation failed",
          description: getToastErrorMessage(error, "Unable to create this profile."),
        }),
      });
      setProfileForm(EMPTY_PROFILE_FORM);
      setProfilePasswordConfirm("");
      setShowCreateProfileForm(false);
      setIsProfileModalOpen(false);
      if (createdProfile?.id) {
        window.localStorage.setItem(ACTIVE_ONBOARDING_PROFILE_KEY, createdProfile.id);
        setOnboardingProfileId(createdProfile.id);
        setIsSidebarOpen(true);
      }
    } catch (createError) {
      setProfileMessage(createError instanceof Error ? createError.message : "Unable to create profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleProfileSwitch(profileId: string) {
    if (profileId === activeProfileId) {
      if (isProfileLocked) {
        setPendingSwitchProfileId(null);
        setProfileAccessPassword("");
      } else {
        setIsProfileModalOpen(false);
      }
      return;
    }

    const nextProfile = profiles.find((profile) => profile.id === profileId);

    if (nextProfile?.hasPassword) {
      setPendingSwitchProfileId(profileId);
      setProfileAccessPassword("");
      setProfileMessage("");
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      await notifyPromise(switchProfile(profileId), {
        loading: {
          title: "Switching profile...",
          description: "Loading this profile's local billing data.",
        },
        success: {
          title: "Profile switched",
          description: nextProfile ? `Now working as ${nextProfile.name}.` : "Your selected profile is active.",
        },
        error: (error) => ({
          title: "Profile switch failed",
          description: getToastErrorMessage(error, "Unable to switch profiles."),
        }),
      });
      setIsProfileModalOpen(false);
    } catch (switchError) {
      setProfileMessage(switchError instanceof Error ? switchError.message : "Unable to switch profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleProfileAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetProfileId = pendingSwitchProfileId || activeProfileId;
    const targetProfile = profiles.find((profile) => profile.id === targetProfileId);

    if (!targetProfile || profileSaving) {
      return;
    }

    if (!profileAccessPassword) {
      notify.warning({
        title: "Password required",
        description: targetProfile.passwordHint ? `Hint: ${targetProfile.passwordHint}` : "Enter the profile password.",
      });
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    try {
      const isUnlocking = targetProfile.id === activeProfileId && isProfileLocked;
      const action = isUnlocking
        ? unlockProfile(targetProfile.id, profileAccessPassword)
        : switchProfile(targetProfile.id, profileAccessPassword);

      await notifyPromise(action, {
        loading: {
          title: isUnlocking ? "Unlocking profile..." : "Switching profile...",
          description: isUnlocking ? "Checking this profile password." : "Checking target profile password.",
        },
        success: {
          title: isUnlocking ? "Profile unlocked" : "Profile switched",
          description: isUnlocking ? `Welcome back, ${targetProfile.name}.` : `Now working as ${targetProfile.name}.`,
        },
        error: (error) => ({
          title: isUnlocking ? "Login failed" : "Profile switch failed",
          description: getToastErrorMessage(error, "Incorrect password."),
        }),
      });
      setProfileAccessPassword("");
      setPendingSwitchProfileId(null);
      setIsProfileModalOpen(false);
    } catch (accessError) {
      setProfileMessage(accessError instanceof Error ? accessError.message : "Unable to unlock profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleLogout() {
    logoutProfile();
    setIsProfileModalOpen(true);
    setShowCreateProfileForm(false);
    setPendingSwitchProfileId(null);
    setProfileAccessPassword("");
    setProfileMessage("");
    notify.info({
      title: "Logged out",
      description: "Select a profile to continue.",
    });
  }

  function handleNotificationsClick() {
    setIsNotificationBadgeOpen(false);

    if (error) {
      notify.error({
        title: "Data sync issue",
        description: error,
        ...NOTIFICATION_TOAST_OPTIONS,
      });
      return;
    }

    if (!activeProfile) {
      notify.info({
        title: "Profile setup needed",
        description: "Create a profile to start saving invoices and clients.",
        ...NOTIFICATION_TOAST_OPTIONS,
      });
      return;
    }

    if (activeAlerts.length > 0) {
      notify.warning({
        title: `${alertCount} billing alert${alertCount === 1 ? "" : "s"}`,
        ...NOTIFICATION_TOAST_OPTIONS,
        description: (
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div key={alert.label} className="flex items-start gap-2">
                <span className="material-symbols-outlined mt-0.5 text-[15px]">{alert.icon}</span>
                <span>
                  <span className="block text-[12px] font-semibold">{alert.count} {alert.label}</span>
                  <span className="block text-[11px] opacity-75">{alert.detail}</span>
                </span>
              </div>
            ))}
          </div>
        ),
      });
      return;
    }

    notify.info({
      title: "All caught up",
      description: "No overdue invoices, due tasks, backup reminders, or unpaid vendor bills right now.",
      ...NOTIFICATION_TOAST_OPTIONS,
    });
  }

  const passwordPromptProfile = profiles.find((profile) => profile.id === (pendingSwitchProfileId || (isProfileLocked ? activeProfileId : null)));
  const isPasswordPromptForLogin = Boolean(passwordPromptProfile && passwordPromptProfile.id === activeProfileId && isProfileLocked);
  const canLogoutActiveProfile = Boolean(activeProfile && !isProfileLocked);
  const isCreatingProfile = isFirstRun || showCreateProfileForm;
  const isLoggingIn = isProfileLocked || pendingSwitchProfileId !== null;
  const showPremiumBg = isCreatingProfile || isLoggingIn;
  const profileModalEyebrow = isFirstRun ? "Welcome" : isProfileLocked ? "Login" : "Profiles";
  const profileModalTitle = isFirstRun ? "Create your first profile" : isProfileLocked ? "Enter profile password" : "Manage profiles";

  return (
    <div className="app-shell flex h-screen overflow-hidden text-[var(--foreground)] selection:bg-[var(--accent)]/20 selection:text-[var(--accent)] bg-[var(--background)]">
      {/* Sidebar Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-[var(--foreground)]/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`w-64 bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex flex-col justify-between shrink-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Logo */}
            <div className="h-20 flex items-center px-8 text-[var(--foreground)]">
                <Link href="/" onClick={closeSidebarOnMobile} className="flex items-center gap-3 text-2xl font-bold tracking-tight group transition-smooth">
                    <span className="brand-mark group-hover:scale-105 transition-transform">
                      <Image
                        src="/billcraft-dark-circle.png"
                        alt=""
                        fill
                        sizes="34px"
                        className="object-cover dark:hidden"
                      />
                      <Image
                        src="/billcraft-light-circle.png"
                        alt=""
                        fill
                        sizes="34px"
                        className="hidden object-cover dark:block"
                      />
                    </span>
                    BillCraft
                </Link>
            </div>

            {/* Navigation */}
            <nav className="mt-4 px-4 flex-1 space-y-1 pb-4">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors group relative overflow-hidden ${
                      isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <i className={`text-xl ${isActive ? item.activeIcon : item.icon}`}></i>
                    {item.label}
                  </Link>
                );
              })}
              <div className="h-px bg-[var(--card-border)] mx-4 my-2"></div>
              {WORK_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors group relative overflow-hidden ${
                      isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <i className={`text-xl ${isActive ? item.activeIcon : item.icon}`}></i>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
        </div>

        {/* Settings Bottom */}
        <div className="p-4 mb-4 bg-[var(--sidebar-bg)] shrink-0">
            <Link href="/settings" onClick={closeSidebarOnMobile} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--foreground)]/[0.04] rounded-xl transition-colors group border border-transparent hover:border-[var(--card-border)]">
                <div className="flex items-center gap-3 font-medium text-[var(--foreground)] min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                      {activeProfile?.profilePic ? (
                        <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                      ) : (
                        (activeProfile?.name || "S")[0].toUpperCase()
                      )}
                    </div>
                    <span className="truncate">Settings</span>
                </div>
                <i className="ph ph-caret-right text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0"></i>
            </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent h-screen overflow-y-auto relative">
        {/* Header Top Bar */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-6 sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-md">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 mr-2 text-[var(--muted)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-colors"
              >
                <i className="ph ph-list text-2xl"></i>
              </button>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
                {/* Search */}
                <div 
                  className="relative group hidden sm:block" 
                  onFocus={() => setIsSearchFocused(true)} 
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setIsSearchFocused(false);
                    }
                  }}
                >
                    <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--accent)] transition-colors"></i>
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      placeholder="Search..." 
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      className="pl-10 pr-12 py-2.5 bg-[var(--card)] border border-[var(--card-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] w-64 shadow-sm transition-all text-[var(--foreground)] placeholder:text-[var(--muted)]" 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-medium text-[var(--muted)] border border-[var(--card-border)] rounded bg-[var(--foreground)]/[0.02] pointer-events-none select-none">{osKey} F</kbd>
                    </div>

                    {/* Dropdown Results */}
                    {isSearchFocused && searchQuery && (
                        <div className="absolute top-full left-0 mt-2 w-full max-h-[60vh] overflow-y-auto bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-2xl z-50 p-2 flex flex-col gap-1">
                            {searchResults.length === 0 ? (
                                <div className="p-4 text-center text-sm text-[var(--muted)] font-medium">No results found.</div>
                            ) : (
                                searchResults.map(group => (
                                    <div key={group.group} className="mb-2 last:mb-0">
                                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{group.group}</div>
                                        {group.items.map(item => (
                                            <Link 
                                                key={item.id} 
                                                href={item.href}
                                                onClick={() => { setIsSearchFocused(false); setSearchQuery(""); }}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--foreground)]/[0.04] transition-colors"
                                            >
                                                <i className={`${item.icon} text-lg text-[var(--muted)] shrink-0`}></i>
                                                <span className="text-sm font-medium text-[var(--foreground)] truncate">{item.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                <button onClick={handleNotificationsClick} className="relative p-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded-full hover:bg-[var(--foreground)]/[0.04]">
                    <i className="ph ph-bell text-2xl"></i>
                    {alertCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--accent)] text-[var(--action-text)] text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[var(--background)]">
                        {alertCount > 9 ? "9+" : alertCount}
                      </span>
                    )}
                </button>

                {/* Profile */}
                <button 
                  onClick={() => {
                    setIsProfileModalOpen(true);
                    setShowCreateProfileForm(false);
                    setProfileForm(EMPTY_PROFILE_FORM);
                    setProfilePasswordConfirm("");
                    setProfileAccessPassword("");
                    setPendingSwitchProfileId(null);
                    setProfileMessage("");
                  }}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity pl-2 sm:pl-3 border-l border-[var(--card-border)]"
                >
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-semibold overflow-hidden">
                      {activeProfile?.profilePic ? (
                        <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                      ) : (
                        (activeProfile?.name || "N")[0].toUpperCase()
                      )}
                    </div>
                    <div className="text-left hidden md:block">
                        <div className="text-sm font-semibold text-[var(--foreground)] leading-tight max-w-[120px] truncate">{activeProfile?.name || "Guest"}</div>
                        <div className="text-xs text-[var(--muted)] font-medium truncate max-w-[120px]">{activeProfile?.profession || "Setup required"}</div>
                    </div>
                    <i className="ph ph-caret-down text-[var(--muted)] text-sm hidden sm:block"></i>
                </button>
            </div>
        </header>

        {loading ? <PageLoadingSkeleton variant={getLoadingSkeletonVariant(pathname)} /> : children}
      </main>

      <ProfileOnboarding
        key={onboardingProfileId || "profile-onboarding"}
        profileId={onboardingProfileId}
        onClose={() => {
          window.localStorage.removeItem(ACTIVE_ONBOARDING_PROFILE_KEY);
          setOnboardingProfileId(null);
        }}
      />

      {(isProfileModalOpen || isFirstRun) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {showPremiumBg && (
            <div className="absolute inset-0 onboarding-bg overflow-hidden pointer-events-none animate-fade-in duration-500">
              <div className="onboarding-bg-glows absolute inset-0" />
              <div className="onboarding-bg-grid absolute inset-0" />
              <div className="onboarding-bg-lines absolute inset-0 opacity-20">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                      <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <circle cx="15%" cy="25%" r="200" fill="none" stroke="var(--card-border)" strokeWidth="1" strokeDasharray="6 6" />
                  <circle cx="85%" cy="75%" r="350" fill="none" stroke="var(--card-border)" strokeWidth="1.5" />
                  <circle cx="85%" cy="75%" r="150" fill="none" stroke="var(--card-border)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="0" y1="25%" x2="100%" y2="25%" stroke="url(#line-grad)" strokeWidth="1" />
                  <line x1="85%" y1="0" x2="85%" y2="100%" stroke="url(#line-grad)" strokeWidth="1" />
                </svg>
              </div>
            </div>
          )}

          <button
            aria-label="Close profile manager"
            className={cn(
              "absolute inset-0 transition-all duration-300",
              showPremiumBg 
                ? "bg-black/40 backdrop-blur-md" 
                : "bg-black/70 backdrop-blur-md"
            )}
            onClick={closeProfileModal}
          />
          <div className="relative flex justify-center items-center">
            {/* Main Modal Glow */}
            {!isCreatingProfile && (
              <div className="absolute -inset-4 bg-[var(--accent)]/15 blur-[100px] rounded-[40px] z-0 animate-pulse-slow pointer-events-none"></div>
            )}
            <div
              role="dialog"
              aria-modal="true"
              className={`modal-surface relative z-10 max-h-[92vh] w-full overflow-y-auto shadow-2xl shadow-[var(--accent)]/10 border border-white/5 backdrop-blur-xl ${isCreatingProfile ? "max-w-4xl p-0" : "max-w-3xl p-5 sm:p-7"}`}
            >
              {!isCreatingProfile && (
                <>
                  <div className="relative flex flex-col items-center text-center mb-12 z-10">
                    <AnimatedText as="h2" text={profileModalEyebrow} effect="micro-scale-fade" className="text-[14px] font-bold text-[var(--accent)] uppercase tracking-widest mb-2" replayKey={profileModalEyebrow} />
                    <AnimatedText as="h1" text={profileModalTitle} effect="micro-scale-fade" className="text-3xl font-bold text-[var(--foreground)] mb-3" replayKey={profileModalTitle} />
                    <p className="text-[17px] text-[var(--muted)]">
                      <AnimatedNumber value={profiles.length} />/<AnimatedNumber value={5} /> profiles saved locally in the User data folder.
                    </p>
                    {!isFirstRun && !isProfileLocked && (
                      <button onClick={closeProfileModal} className="absolute top-0 right-0 text-[var(--muted)] hover:text-[var(--accent)] transition-colors duration-200">
                        <span className="material-symbols-outlined text-[24px]">close</span>
                      </button>
                    )}
                  </div>

                  {profiles.length > 0 && (
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Select Profile Column */}
                      <div className="flex flex-col gap-6">
                        <h3 className="text-2xl font-bold text-[var(--foreground)] pb-4 border-b border-[var(--card-border)]">Select Profile</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {profiles.map((profile) => {
                            const isSelectedForLogin = passwordPromptProfile?.id === profile.id;
                            
                            return (
                              <button
                                key={profile.id}
                                type="button"
                                onClick={() => void handleProfileSwitch(profile.id)}
                                className={`rounded-[18px] p-6 flex flex-col items-center text-center cursor-pointer relative transition-all ${
                                  isSelectedForLogin
                                    ? "bg-[var(--foreground)]/[0.05] border-2 border-[var(--accent)] shadow-[0_8px_24px_color-mix(in_srgb,var(--accent)_10%,transparent)] hover:scale-105"
                                    : "bg-[var(--background)] border border-transparent opacity-70 hover:opacity-100 hover:bg-[var(--foreground)]/[0.03]"
                                }`}
                              >
                                <span 
                                  className={`material-symbols-outlined absolute top-4 right-4 text-lg ${isSelectedForLogin ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                                  style={isSelectedForLogin ? { fontVariationSettings: "'FILL' 1" } : undefined}
                                >
                                  {isSelectedForLogin ? "check_circle" : "lock"}
                                </span>
                                
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm ${isSelectedForLogin ? 'bg-[var(--foreground)] text-[var(--accent)]' : 'bg-[var(--foreground)]/[0.1] text-[var(--muted)]'}`}>
                                  {profile.profilePic ? (
                                    <img className="h-full w-full object-cover rounded-full" alt={profile.name} src={profile.profilePic} />
                                  ) : (
                                    <span className="material-symbols-outlined text-3xl">person</span>
                                  )}
                                </div>
                                <h4 className="text-[14px] font-bold text-[var(--foreground)] truncate w-full">{profile.name}</h4>
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="mt-2 space-y-2">
                          <button
                            type="button"
                            onClick={() => setShowCreateProfileForm(true)}
                            disabled={profiles.length >= 5}
                            className="rounded-xl w-full py-4 border border-dashed border-[var(--card-border)] text-[var(--muted)] text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[var(--foreground)]/[0.03] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined">add</span>
                            CREATE NEW PROFILE
                          </button>

                          {canLogoutActiveProfile && (
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="rounded-xl w-full py-4 border border-dashed border-red-500/30 text-red-400 text-[14px] font-bold flex items-center justify-center gap-2 hover:border-red-500 hover:bg-red-500/5 transition-colors"
                            >
                              <span className="material-symbols-outlined">logout</span>
                              LOG OUT
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Authentication Column */}
                      <div className="flex flex-col gap-6">
                        <h3 className="text-2xl font-bold text-[var(--foreground)] pb-4 border-b border-[var(--card-border)]">Authentication</h3>
                        
                        <div className="relative h-full flex-grow">
                          <div className={`rounded-[18px] p-8 flex flex-col items-center text-center h-full justify-center relative z-10 transition-colors ${passwordPromptProfile ? 'bg-[var(--foreground)]/[0.05] border border-[var(--accent)]/30' : 'bg-[var(--foreground)]/[0.03] border border-white/5'}`}>
                          {passwordPromptProfile ? (
                          <form onSubmit={handleProfileAccess} className="w-full flex flex-col items-center z-10">
                            <div className="relative w-20 h-20 mb-6 group">
                              <div className="w-full h-full rounded-full bg-[var(--foreground)] flex items-center justify-center shadow-[0_0_30px_color-mix(in_srgb,var(--accent)_25%,transparent)] border-[3px] border-[var(--accent)] overflow-hidden transition-transform duration-300 group-hover:scale-105">
                                {passwordPromptProfile.profilePic ? (
                                  <img className="h-full w-full object-cover" alt={passwordPromptProfile.name} src={passwordPromptProfile.profilePic} />
                                ) : (
                                  <span className="material-symbols-outlined text-4xl text-[var(--background)]">person</span>
                                )}
                              </div>
                            </div>
                            <h4 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                              {isPasswordPromptForLogin ? `Login as ${passwordPromptProfile.name}` : `Switch to ${passwordPromptProfile.name}`}
                            </h4>
                            <p className="text-[17px] text-[var(--muted)] mb-8">Enter PIN to access profile</p>
                            
                            <div className="w-full max-w-[240px] mb-8 relative">
                              <input
                                ref={passwordInputRef}
                                type="password"
                                value={profileAccessPassword}
                                onChange={(event) => setProfileAccessPassword(event.target.value)}
                                placeholder="••••••"
                                className="w-full bg-transparent border-b border-[var(--card-border)] py-2 text-center text-2xl tracking-[0.5em] text-[var(--foreground)] font-mono focus:outline-none focus:border-b-[var(--accent)] transition-all placeholder:tracking-[0.3em] placeholder:text-lg placeholder:text-[var(--muted)]/40"
                                autoFocus
                              />
                              {(passwordPromptProfile.passwordHint || profileMessage || error) && (
                                <p className={`text-[12px] text-center mt-3 font-medium ${profileMessage || error ? 'text-red-400' : 'text-[var(--muted)]'}`}>
                                  {profileMessage || error || `Hint: ${passwordPromptProfile.passwordHint}`}
                                </p>
                              )}
                            </div>
                            
                            <button type="submit" disabled={profileSaving} className="rounded-xl w-full bg-[var(--foreground)] text-[var(--background)] font-bold text-[14px] py-4 hover:opacity-90 transition-opacity disabled:opacity-50 mt-auto active:scale-[0.98]">
                              {profileSaving ? "Unlocking..." : "Unlock Profile"}
                            </button>
                          </form>
                        ) : (
                          <div className="flex flex-col items-center justify-center z-10 text-center opacity-60">
                            <span className="material-symbols-outlined text-4xl mb-3 text-[var(--muted)]">shield_person</span>
                            <p className="text-sm text-[var(--muted)]">Select a profile to authenticate</p>
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {isCreatingProfile && (
              <ProfileCreateOnboarding
                error={error}
                isFirstRun={isFirstRun}
                maxProfiles={5}
                onCancel={() => {
                  setShowCreateProfileForm(false);
                  setProfileForm(EMPTY_PROFILE_FORM);
                  setProfilePasswordConfirm("");
                  setProfileMessage("");
                }}
                onImageChange={handleProfileImageChange}
                onSubmit={handleCreateProfile}
                profileForm={profileForm}
                profileMessage={profileMessage}
                profilePasswordConfirm={profilePasswordConfirm}
                profileSaving={profileSaving}
                profilesLength={profiles.length}
                setProfileForm={setProfileForm}
                setProfilePasswordConfirm={setProfilePasswordConfirm}
              />
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

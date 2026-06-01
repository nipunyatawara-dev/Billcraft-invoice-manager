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
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/invoices", label: "Invoices", icon: "receipt_long" },
  { href: "/expenses", label: "Expenses", icon: "payments" },
  { href: "/clients", label: "Clients", icon: "group" },
  { href: "/analytics", label: "Analytics", icon: "bar_chart" },
];

const WORK_NAV_ITEMS = [
  { href: "/outsourcing", label: "Outsourcing", icon: "engineering" },
  { href: "/todo", label: "To-Do", icon: "view_kanban" },
  { href: "/catalog", label: "Catalog", icon: "inventory_2" },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings", icon: "settings" },
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
  const pathname = usePathname();
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

  useEffect(() => {
    if (isFirstRun) {
      setIsProfileModalOpen(true);
      setShowCreateProfileForm(true);
    }
  }, [isFirstRun]);

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
      description: "Enter your profile password to continue.",
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
  const canLogoutActiveProfile = Boolean(activeProfile?.hasPassword && !isProfileLocked);
  const isCreatingProfile = isFirstRun || showCreateProfileForm;
  const isLoggingIn = isProfileLocked || pendingSwitchProfileId !== null;
  const showPremiumBg = isCreatingProfile || isLoggingIn;
  const profileModalEyebrow = isFirstRun ? "Welcome" : isProfileLocked ? "Login" : "Profiles";
  const profileModalTitle = isFirstRun ? "Create your first profile" : isProfileLocked ? "Enter profile password" : "Manage profiles";

  return (
    <div className="app-shell flex flex-col min-h-screen">
      {/* Header */}
      <header className="app-header flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-5 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="icon-button active:scale-95"
            aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
          >
            <span className="material-symbols-outlined text-[20px]">{isSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <Link href="/" className="brand-lockup transition-smooth" aria-label="BillCraft dashboard">
            <span className="brand-mark">
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
            <span className="brand-wordmark">BillCraft</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleNotificationsClick} className="icon-button active:scale-95 hidden sm:inline-flex relative" aria-label="Notifications">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {alertCount > 0 && (
              <span className="t-badge" data-open={isNotificationBadgeOpen ? "true" : "false"} aria-label={`${alertCount} billing alerts`}>
                <span className="flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold leading-none text-[var(--action-text)]">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              </span>
            )}
          </button>
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
            className="size-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center cursor-pointer hover:bg-[var(--accent)]/15 transition-smooth overflow-hidden"
            aria-label="Profiles"
          >
            {activeProfile?.profilePic ? (
              <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
            ) : (
              <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">person</span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <div 
          className={`lg:hidden fixed inset-0 top-16 bg-[var(--foreground)]/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside 
          className={`app-sidebar flex flex-col fixed lg:sticky top-16 h-[calc(100vh-64px)] z-40 shrink-0 left-0 transition-all duration-300 ease-in-out overflow-hidden border-[var(--card-border)] ${
            isSidebarOpen ? "w-[240px] translate-x-0 border-r" : "w-[240px] lg:w-0 -translate-x-full lg:translate-x-0 border-r-0"
          }`}
        >
          <div className="w-[240px] flex flex-col h-full shrink-0">
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-smooth ${
                      isActive
                        ? 'bg-[var(--action)]/12 text-[var(--action)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-3 border-t border-[var(--card-border)]/70 pt-3 space-y-0.5">
                {WORK_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeSidebarOnMobile}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-smooth ${
                        isActive
                          ? 'bg-[var(--action)]/12 text-[var(--action)]'
                          : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="px-3 pb-4 pt-2 space-y-0.5 bg-transparent shrink-0">
              {BOTTOM_NAV.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-xl transition-smooth ${
                      isActive
                        ? 'bg-[var(--action)]/12 text-[var(--action)]'
                        : 'text-[var(--foreground)]/55 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[var(--action)]' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {loading ? <PageLoadingSkeleton variant={getLoadingSkeletonVariant(pathname)} /> : children}
        </div>
      </div>

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
                ? "bg-[var(--background)]/20 backdrop-blur-md" 
                : "bg-[var(--foreground)]/25 backdrop-blur-sm"
            )}
            onClick={closeProfileModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            className={`modal-surface relative max-h-[92vh] overflow-y-auto ${isCreatingProfile ? "max-w-4xl p-0" : "max-w-3xl p-5 sm:p-7"}`}
          >
            {!isCreatingProfile && (
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <AnimatedText as="p" text={profileModalEyebrow} effect="micro-scale-fade" className="section-eyebrow" replayKey={profileModalEyebrow} />
                  <AnimatedText
                    as="h2"
                    text={profileModalTitle}
                    effect="mask-reveal-up"
                    className="text-2xl font-semibold text-[var(--foreground)] font-display"
                    replayKey={profileModalTitle}
                  />
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    <AnimatedNumber value={profiles.length} />/<AnimatedNumber value={5} /> profiles saved locally in the User data folder.
                  </p>
                </div>
                {!isFirstRun && !isProfileLocked && (
                  <button onClick={closeProfileModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                    <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
                  </button>
                )}
              </div>
            )}

            {!isCreatingProfile && profiles.length > 0 && (
              <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {profiles.map((profile) => {
                  const isActive = profile.id === activeProfileId;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => void handleProfileSwitch(profile.id)}
                      className={`surface-card p-3 text-left flex items-center gap-3 transition-smooth ${
                        isActive ? "border-[var(--accent)]/50" : "hover:border-[var(--foreground)]/15"
                      }`}
                    >
                      <span className="size-11 rounded-xl overflow-hidden border border-[var(--card-border)] bg-[var(--foreground)]/[0.03] flex items-center justify-center shrink-0">
                        {profile.profilePic ? (
                          <img className="h-full w-full object-cover" alt={profile.name} src={profile.profilePic} />
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">person</span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--foreground)] truncate">{profile.name}</span>
                        <span className="block text-[11px] text-[var(--muted)] truncate">{profile.profession}</span>
                      </span>
                      {profile.hasPassword && !isActive && (
                        <span className="ml-auto material-symbols-outlined text-[16px] text-[var(--muted)]">lock</span>
                      )}
                      {isActive && (
                        <span className="ml-auto material-symbols-outlined text-[18px] text-[var(--accent)]">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!isCreatingProfile && passwordPromptProfile && (
              <form onSubmit={handleProfileAccess} className="mb-5 surface-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="size-9 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                      {isPasswordPromptForLogin ? `Login as ${passwordPromptProfile.name}` : `Switch to ${passwordPromptProfile.name}`}
                    </h3>
                    {passwordPromptProfile.passwordHint && (
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">Hint: {passwordPromptProfile.passwordHint}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={profileAccessPassword}
                    onChange={(event) => setProfileAccessPassword(event.target.value)}
                    placeholder="Profile password"
                    className="field-control px-3 py-2"
                    autoFocus
                  />
                  <button type="submit" className="btn-primary justify-center active:scale-[0.97]" disabled={profileSaving}>
                    {profileSaving ? "Checking..." : isPasswordPromptForLogin ? "Login" : "Switch"}
                  </button>
                </div>
              </form>
            )}

            {!showCreateProfileForm && (profileMessage || error) && (
              <p className="mb-5 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-2 text-[12px] font-medium text-[var(--accent)]">
                {profileMessage || error}
              </p>
            )}

            {!isFirstRun && !showCreateProfileForm && (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end mt-4">
                {canLogoutActiveProfile && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn-secondary active:scale-[0.97]"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Log Out
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCreateProfileForm(true)}
                  disabled={profiles.length >= 5}
                  className="btn-primary active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  {profiles.length >= 5 ? "Create Limit Reached (Max 5)" : "Create New Profile"}
                </button>
              </div>
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
      )}
    </div>
  );
}

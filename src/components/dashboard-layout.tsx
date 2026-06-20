"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { AnimatePresence } from "motion/react";
import { PageLoadingSkeleton, getLoadingSkeletonVariant } from "@/components/page-loading-skeleton";
import { ProfileOnboarding } from "@/components/profile-onboarding";
import { ProfileManagerModal } from "@/components/profile-manager-modal";
import { useModePalettes } from "@/hooks/use-mode-palettes";
import { useUserData } from "@/hooks/use-user-data";
import { useBillingAlerts } from "@/hooks/use-billing-alerts";
import { notify } from "@/lib/toast";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, WORK_NAV_ITEMS } from "@/lib/constants";

const ACTIVE_ONBOARDING_PROFILE_KEY = "billcraft.profile-onboarding.active.v1";
const NOTIFICATION_TOAST_DURATION = 4200;
const NOTIFICATION_TOAST_OPTIONS = {
  duration: NOTIFICATION_TOAST_DURATION,
  autopilot: false,
} as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useModePalettes();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [onboardingProfileId, setOnboardingProfileId] = useState<string | null>(null);
  const [osKey, setOsKey] = useState("⌘");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pathname = usePathname();
  
  const {
    activeProfile,
    clients,
    error,
    invoices,
    loading,
    outsourcingInvoices,
    profiles,
    todoTasks,
    vendors,
  } = useUserData();

  const { activeAlerts, alertCount } = useBillingAlerts({
    activeProfile,
    clients,
    invoices,
    outsourcingInvoices,
    todoTasks,
    vendors,
  });

  useEffect(() => {
    if (loading || onboardingProfileId) {
      return;
    }

    const storedProfileId = window.localStorage.getItem(ACTIVE_ONBOARDING_PROFILE_KEY);

    if (storedProfileId) {
      if (profiles.some((profile) => profile.id === storedProfileId)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOsKey(isMac ? "⌘" : "Ctrl");
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const isMac = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("mac");
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      const isSearchKey = e.key.toLowerCase() === "k" || e.key.toLowerCase() === "f";
      
      if (modifier && isSearchKey) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  function handleNotificationsClick() {
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

  return (
    <div className="app-shell flex h-screen overflow-hidden text-foreground selection:bg-accent/20 selection:text-accent bg-background">
      {/* Sidebar Overlay */}
      <div 
        className={`lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`w-64 bg-sidebar-bg border-r border-card-border flex flex-col justify-between shrink-0 fixed lg:static inset-y-0 left-0 z-50 transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Logo */}
            <div className="h-20 flex items-center px-8 text-foreground">
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
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground'
                    }`}
                  >
                    <i className={`text-xl ${isActive ? item.activeIcon : item.icon}`}></i>
                    {item.label}
                  </Link>
                );
              })}
              <div className="h-px bg-card-border mx-4 my-2"></div>
              {WORK_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebarOnMobile}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors group relative overflow-hidden ${
                      isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-foreground/[0.04] hover:text-foreground'
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
        <div className="p-4 mb-4 bg-sidebar-bg shrink-0">
            <Link href="/settings" onClick={closeSidebarOnMobile} className="flex items-center justify-between px-4 py-3 hover:bg-foreground/[0.04] rounded-xl transition-colors group border border-transparent hover:border-card-border">
                <div className="flex items-center gap-3 font-medium text-foreground min-w-0">
                    <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                      {activeProfile?.profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                      ) : (
                        (activeProfile?.name || "S")[0].toUpperCase()
                      )}
                    </div>
                    <span className="truncate">Settings</span>
                </div>
                <i className="ph ph-caret-right text-muted group-hover:text-foreground transition-colors shrink-0"></i>
            </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent h-screen overflow-y-auto relative">
        {/* Header Top Bar */}
        <header className="flex items-center justify-between px-8 sm:px-16 py-6 sticky top-0 z-30 bg-background/80 backdrop-blur-md">
            <div className="flex items-center">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 mr-2 text-muted hover:text-foreground rounded-lg hover:bg-foreground/[0.04] transition-colors"
              >
                <i className="ph ph-list text-2xl"></i>
              </button>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-6">
                {/* Global Command Palette search trigger */}
                <button 
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="relative group hidden sm:flex items-center text-left pl-10 pr-12 py-2.5 bg-card border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-64 shadow-sm transition-all text-muted hover:border-foreground/20 hover:bg-foreground/[0.01]" 
                >
                    <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted group-hover:text-accent transition-colors"></i>
                    <span className="text-sm select-none text-muted/80">Search...</span>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-medium text-muted border border-card-border rounded bg-foreground/[0.02] pointer-events-none select-none">{osKey} F/K</kbd>
                    </div>
                </button>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                <button onClick={handleNotificationsClick} className="relative p-2 text-muted hover:text-foreground transition-colors rounded-full hover:bg-foreground/[0.04]">
                    <i className="ph ph-bell text-2xl"></i>
                    {alertCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-action-text text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-background">
                        {alertCount > 9 ? "9+" : alertCount}
                      </span>
                    )}
                </button>

                {/* Profile */}
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity pl-2 sm:pl-3 border-l border-card-border"
                >
                    <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold overflow-hidden">
                      {activeProfile?.profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                      ) : (
                        (activeProfile?.name || "N")[0].toUpperCase()
                      )}
                    </div>
                    <div className="text-left hidden md:block">
                        <div className="text-sm font-semibold text-foreground leading-tight max-w-[120px] truncate">{activeProfile?.name || "Guest"}</div>
                        <div className="text-xs text-muted font-medium truncate max-w-[120px]">{activeProfile?.profession || "Setup required"}</div>
                    </div>
                    <i className="ph ph-caret-down text-muted text-sm hidden sm:block"></i>
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

      <AnimatePresence>
        {isCommandPaletteOpen && (
          <CommandPalette
            onClose={() => setIsCommandPaletteOpen(false)}
          />
        )}
      </AnimatePresence>

      <ProfileManagerModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileCreated={(id) => {
          window.localStorage.setItem(ACTIVE_ONBOARDING_PROFILE_KEY, id);
          setOnboardingProfileId(id);
          setIsSidebarOpen(true);
        }}
      />
    </div>
  );
}

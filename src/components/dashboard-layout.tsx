"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Bell,
  Briefcase,
  CheckSquare,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { HStack } from "@astryxdesign/core/HStack";
import { IconButton } from "@astryxdesign/core/IconButton";
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import { TopNav } from "@astryxdesign/core/TopNav";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";
import { PageLoadingSkeleton, getLoadingSkeletonVariant } from "@/components/page-loading-skeleton";
import { ProfileOnboarding } from "@/components/profile-onboarding";
import { ProfileManagerModal } from "@/components/profile-manager-modal";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useFontLoader } from "@/hooks/use-font-loader";
import { useUserDataSnapshot, useUserDataStatus } from "@/hooks/use-user-data";
import { useBillingAlerts } from "@/hooks/use-billing-alerts";
import { notify } from "@/lib/toast";
import { NAV_ITEMS, WORK_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  invoices: FileText,
  expenses: Wallet,
  clients: Users,
  analytics: BarChart3,
  outsourcing: Briefcase,
  todo: CheckSquare,
  catalog: Package,
  settings: Settings,
};

const ACTIVE_ONBOARDING_PROFILE_KEY = "billcraft.profile-onboarding.active.v1";
const NOTIFICATION_TOAST_DURATION = 4200;
const NOTIFICATION_TOAST_OPTIONS = {
  duration: NOTIFICATION_TOAST_DURATION,
  autopilot: false,
} as const;

function BrandMark() {
  return (
    <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
      <Image
        src="/billcraft-dark-circle.png"
        alt="BillCraft Logo"
        fill
        sizes="32px"
        className="object-cover dark:hidden"
      />
      <Image
        src="/billcraft-light-circle.png"
        alt="BillCraft Logo"
        fill
        sizes="32px"
        className="hidden object-cover dark:block"
      />
    </span>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useFontLoader();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [onboardingProfileId, setOnboardingProfileId] = useState<string | null>(null);
  const [osKey, setOsKey] = useState("⌘");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  const { loading, error } = useUserDataStatus();
  const {
    activeProfile,
    clients,
    invoices,
    outsourcingInvoices,
    profiles,
    todoTasks,
    vendors,
  } = useUserDataSnapshot();

  const { notificationItems, alertCount } = useBillingAlerts({
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
      } else {
        window.localStorage.removeItem(ACTIVE_ONBOARDING_PROFILE_KEY);
      }
    }
  }, [loading, onboardingProfileId, profiles]);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOsKey(isMac ? "⌘" : "Ctrl");
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const isMac =
        typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("mac");
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

  const handleNotificationsOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsNotificationsOpen(false);
        return;
      }

      if (error || !activeProfile || notificationItems.length > 0) {
        setIsNotificationsOpen(true);
        return;
      }

      notify.info({
        title: "All caught up",
        description:
          "No overdue invoices, due tasks, backup reminders, or unpaid vendor bills right now.",
        ...NOTIFICATION_TOAST_OPTIONS,
      });
    },
    [activeProfile, error, notificationItems.length],
  );

  const handleBellClick = useCallback(() => {
    if (isNotificationsOpen) {
      setIsNotificationsOpen(false);
      return;
    }

    handleNotificationsOpenChange(true);
  }, [handleNotificationsOpenChange, isNotificationsOpen]);

  const sideNav = (
    <SideNav
      header={
        <SideNavHeading
          heading="BillCraft"
          headingHref="/"
          icon={<BrandMark />}
          subheading="Invoice manager"
        />
      }
      footer={
        <SideNavSection title="Account" isHeaderHidden>
          <SideNavItem
            label="Settings"
            href="/settings"
            icon={Settings}
            isSelected={pathname === "/settings"}
          />
        </SideNavSection>
      }
      resizable={{ defaultWidth: 256, minWidth: 220, maxWidth: 320, autoSaveId: "billcraft-sidenav" }}
    >
      <SideNavSection title="Main">
        {NAV_ITEMS.map((item) => (
          <SideNavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={NAV_ICONS[item.iconKey]}
            isSelected={pathname === item.href}
          />
        ))}
      </SideNavSection>
      <SideNavSection title="Work">
        {WORK_NAV_ITEMS.map((item) => (
          <SideNavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={NAV_ICONS[item.iconKey]}
            isSelected={pathname === item.href}
          />
        ))}
      </SideNavSection>
    </SideNav>
  );

  const topNav = (
    <TopNav
      label="BillCraft toolbar"
      endContent={
        <HStack gap={2} vAlign="center">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="relative group hidden sm:flex items-center text-left pl-10 pr-12 h-10 rounded-xl text-sm border border-[color:var(--color-border)] bg-[color:var(--color-background-surface)] text-[color:var(--color-text-secondary)] w-64"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4" />
            <span className="text-sm select-none">Search...</span>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-sans font-medium border border-[color:var(--color-border)] rounded-md pointer-events-none select-none">
                {osKey} F/K
              </kbd>
            </div>
          </button>

          <span className="sm:hidden">
            <IconButton
              label="Open search"
              icon={<Search />}
              variant="ghost"
              onClick={() => setIsCommandPaletteOpen(true)}
              tooltip="Search"
            />
          </span>

          <ThemeToggle />

          <NotificationsPanel
            open={isNotificationsOpen}
            onOpenChange={handleNotificationsOpenChange}
            items={notificationItems}
            error={error}
            hasProfile={Boolean(activeProfile)}
            trigger={
              <IconButton
                label="Notifications"
                icon={<Bell />}
                variant="ghost"
                onClick={handleBellClick}
                tooltip="Notifications"
              />
            }
          />

          {alertCount > 0 && (
            <span className="sr-only">{alertCount} alerts</span>
          )}

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            aria-label="Switch profile"
            aria-expanded={isProfileModalOpen}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity pl-3 sm:pl-4 border-l border-[color:var(--color-border)] h-10"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-semibold overflow-hidden select-none shrink-0 bg-[color:var(--color-background-secondary)] text-[color:var(--color-accent)]">
              {activeProfile?.profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="h-full w-full object-cover"
                  alt={activeProfile.name}
                  src={activeProfile.profilePic}
                />
              ) : (
                (activeProfile?.name || "N")[0].toUpperCase()
              )}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-sm font-semibold leading-tight max-w-[120px] truncate text-[color:var(--color-text-primary)]">
                {activeProfile?.name || "Guest"}
              </div>
              <div className="text-[10px] font-medium truncate max-w-[120px] text-[color:var(--color-text-secondary)]">
                {activeProfile?.profession || "Setup required"}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-4 hidden sm:block transition-transform duration-300 text-[color:var(--color-text-secondary)]",
                isProfileModalOpen && "rotate-180",
              )}
            />
          </button>
        </HStack>
      }
    />
  );

  const mainContent = (
    <div className="px-6 pb-6 pt-3 sm:px-8 sm:pb-8 sm:pt-4 lg:px-12 lg:pb-10 lg:pt-5 max-w-[1600px] mx-auto w-full">
      {reducedMotion ? (
        loading ? (
          <PageLoadingSkeleton variant={getLoadingSkeletonVariant(pathname)} />
        ) : (
          children
        )
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(6px)", y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <PageLoadingSkeleton variant={getLoadingSkeletonVariant(pathname)} />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, filter: "blur(8px)", y: 8 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  return (
    <>
      <AppShell height="fill" contentPadding={0} sideNav={sideNav} topNav={topNav} variant="elevated">
        {mainContent}
      </AppShell>

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
          <CommandPalette onClose={() => setIsCommandPaletteOpen(false)} />
        )}
      </AnimatePresence>

      <ProfileManagerModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileCreated={(id) => {
          window.localStorage.setItem(ACTIVE_ONBOARDING_PROFILE_KEY, id);
          setOnboardingProfileId(id);
        }}
      />
    </>
  );
}

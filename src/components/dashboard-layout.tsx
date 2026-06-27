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
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, WORK_NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Plus, Search, Bell, User } from "lucide-react";

import HomeIcon from "@/components/icons/home-icon";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import UsersIcon from "@/components/icons/users-icon";
import ChartBarIcon from "@/components/icons/chart-bar-icon";
import TravelBag from "@/components/icons/travel-bag";
import CheckedIcon from "@/components/icons/checked-icon";
import CartIcon from "@/components/icons/cart-icon";
import GearIcon from "@/components/icons/gear-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";

const ICON_MAP: Record<string, React.ForwardRefExoticComponent<any>> = {
  dashboard: HomeIcon,
  invoices: FileDescriptionIcon,
  expenses: WalletIcon,
  clients: UsersIcon,
  analytics: ChartBarIcon,
  outsourcing: TravelBag,
  todo: CheckedIcon,
  catalog: CartIcon,
  settings: GearIcon,
};

interface SidebarLinkProps {
  item: {
    href: string;
    label: string;
    iconKey: string;
  };
  isActive: boolean;
  tooltip?: string;
}

function SidebarLink({ item, isActive, tooltip }: SidebarLinkProps) {
  const iconRef = useRef<AnimatedIconHandle>(null);
  const IconComponent = ICON_MAP[item.iconKey];

  if (!IconComponent) return null;

  // Custom visual weight adjustments to ensure uniform size on the sidebar
  const iconSizes: Record<string, number> = {
    todo: 24,
    catalog: 24,
    settings: 24,
    dashboard: 24,
    invoices: 24,
    expenses: 24,
    clients: 24,
    analytics: 24,
    outsourcing: 24,
  };
  const size = iconSizes[item.iconKey] || 24;

  const iconStrokes: Record<string, number> = {
    todo: 1.8,
    catalog: 1.8,
    settings: 2,
    dashboard: 2,
    invoices: 2,
    expenses: 2,
    clients: 2,
    analytics: 2,
    outsourcing: 2,
  };
  const strokeWidth = iconStrokes[item.iconKey] || 2;

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      tooltip={tooltip}
      className={cn(
        "w-full px-3.5 py-3 h-[46px] rounded-xl font-medium transition-all text-[16px] group/btn",
        isActive
          ? "bg-accent/10 text-accent font-semibold"
          : "text-muted hover:bg-foreground/[0.04] hover:text-foreground"
      )}
    >
      <Link
        href={item.href}
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
        className="flex items-center w-full"
      >
        <div className={cn(
          "flex items-center justify-center size-8 shrink-0",
          item.iconKey === "outsourcing" && "translate-x-[2px]"
        )}>
          <IconComponent
            ref={iconRef}
            size={size}
            strokeWidth={strokeWidth}
            className={cn(
              "transition-colors",
              isActive ? "text-accent" : "text-muted group-hover/btn:text-foreground"
            )}
          />
        </div>
        <span className="ml-3 group-data-[collapsible=icon]:hidden">{item.label}</span>
      </Link>
    </SidebarMenuButton>
  );
}
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACTIVE_ONBOARDING_PROFILE_KEY = "billcraft.profile-onboarding.active.v1";
const NOTIFICATION_TOAST_DURATION = 4200;
const NOTIFICATION_TOAST_OPTIONS = {
  duration: NOTIFICATION_TOAST_DURATION,
  autopilot: false,
} as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/invoices": "Invoices",
  "/expenses": "Expenses",
  "/clients": "Clients",
  "/analytics": "Analytics",
  "/outsourcing": "Outsourcing",
  "/todo": "To-Do",
  "/catalog": "Catalog",
  "/settings": "Settings",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  useModePalettes();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [onboardingProfileId, setOnboardingProfileId] = useState<string | null>(null);
  const [osKey, setOsKey] = useState("⌘");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pathname = usePathname();
  
  const {
    activeProfile,
    activeProfileId,
    clients,
    error,
    invoices,
    loading,
    outsourcingInvoices,
    profiles,
    todoTasks,
    vendors,
    switchProfile,
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

  const handleNotificationsClick = useCallback(() => {
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
  }, [activeAlerts, activeProfile, alertCount, error]);

  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden text-foreground selection:bg-accent/20 selection:text-accent bg-background">
        
        {/* Permanent Sidebar */}
        <Sidebar collapsible="none" className="border-r border-card-border bg-sidebar-bg">
          <SidebarHeader className="border-b border-card-border/50 p-5">
            <div className="flex items-center gap-3 px-2 h-11 select-none">
              <Link href="/" className="flex items-center gap-3 text-xl font-bold tracking-tight text-foreground">
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
                <span className="group-data-[collapsible=icon]:hidden">BillCraft</span>
              </Link>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-5 space-y-6">
            <div>
              <SidebarMenu className="gap-1.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarLink item={item} isActive={isActive} tooltip={item.label} />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>

            <div className="h-px bg-card-border mx-2"></div>

            <div>
              <SidebarMenu className="gap-1.5">
                {WORK_NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarLink item={item} isActive={isActive} tooltip={item.label} />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          </SidebarContent>

          <SidebarFooter className="p-5 border-t border-card-border/50">
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <SidebarLink
                  item={{ href: "/settings", label: "Settings", iconKey: "settings" }}
                  isActive={pathname === "/settings"}
                  tooltip="Settings"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Panel Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent h-screen overflow-hidden relative">
          
          {/* Header Bar */}
          <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-card-border shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground tracking-tight select-none">
                {PAGE_TITLES[pathname] || "Dashboard"}
              </h1>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Global Command Palette search trigger */}
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="relative group hidden sm:flex items-center text-left pl-10 pr-12 h-10 bg-card border border-card-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-64 shadow-xs transition-all text-muted hover:border-foreground/20 hover:bg-foreground/[0.01]" 
              >
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted group-hover:text-accent size-4 transition-colors" />
                <span className="text-sm select-none text-muted/80">Search...</span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[9px] font-sans font-medium text-muted border border-card-border rounded-md bg-foreground/[0.02] pointer-events-none select-none">{osKey} F/K</kbd>
                </div>
              </button>

              {/* Search Shortcut Trigger (Icon only for small Header) */}
              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="h-10 w-10 shrink-0 flex items-center justify-center border border-card-border bg-card rounded-xl text-muted hover:text-foreground hover:border-foreground/20 transition-all shadow-xs sm:hidden"
              >
                <Search className="size-5" />
              </button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Notifications */}
              <button 
                onClick={handleNotificationsClick} 
                className="h-10 w-10 shrink-0 flex items-center justify-center border border-card-border bg-card rounded-xl text-muted hover:text-foreground hover:border-foreground/20 transition-all shadow-xs relative"
              >
                <Bell className="size-5" />
                {alertCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full ring-2 ring-card animate-pulse" />
                )}
              </button>

              {/* Profile */}
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity pl-3 sm:pl-4 border-l border-card-border h-10"
              >
                <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-semibold overflow-hidden select-none border border-card-border/50 shadow-sm shrink-0">
                  {activeProfile?.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="h-full w-full object-cover" alt={activeProfile.name} src={activeProfile.profilePic} />
                  ) : (
                    (activeProfile?.name || "N")[0].toUpperCase()
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-semibold text-foreground leading-tight max-w-[120px] truncate">{activeProfile?.name || "Guest"}</div>
                  <div className="text-[10px] text-muted font-medium truncate max-w-[120px]">{activeProfile?.profession || "Setup required"}</div>
                </div>
                <ChevronDown className="size-4 text-muted hidden sm:block transition-transform duration-300" />
              </button>
            </div>
          </header>

          {/* Main Scroll Area */}
          <div className="flex-1 overflow-y-auto bg-background/50">
            <div className="p-6 sm:p-8 lg:p-12 max-w-[1600px] mx-auto w-full">
              {loading ? <PageLoadingSkeleton variant={getLoadingSkeletonVariant(pathname)} /> : children}
            </div>
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
          }}
        />
      </div>
    </SidebarProvider>
  );
}

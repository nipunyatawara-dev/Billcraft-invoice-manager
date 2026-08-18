"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { AnimatedText } from "@/components/animated-text";
import { User, Palette, Bell, Database, Shield, Trash2 } from "lucide-react";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
import { ProfileTab } from "./components/ProfileTab";
import { AppearanceTab } from "./components/AppearanceTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { DataTab } from "./components/DataTab";
import { SecurityTab } from "./components/SecurityTab";
import { TrashTab } from "./components/TrashTab";
import { Reveal } from "@/components/reveal";

type SettingsTab = "profile" | "appearance" | "notifications" | "data" | "security" | "trash";

const tabs = [
  { id: "profile" as const, label: "Profile", icon: User, desc: "Your personal and business info" },
  { id: "appearance" as const, label: "Appearance", icon: Palette, desc: "Themes, colors, and typography" },
  { id: "notifications" as const, label: "Notifications", icon: Bell, desc: "Alerts and reminders" },
  { id: "data" as const, label: "Your Data", icon: Database, desc: "Export and manage your data" },
  { id: "security" as const, label: "Security", icon: Shield, desc: "Passwords and danger zone" },
  { id: "trash" as const, label: "Trash Bin", icon: Trash2, desc: "Deleted invoices" },
];

export default function Settings() {
  return (
    <Suspense fallback={
      <main className="app-main flex-1">
        <div className="mb-8">
          <div>
            <p className="section-eyebrow">{PAGE_EYEBROWS["/settings"]}</p>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Settings</h1>
          </div>
        </div>
        <div className="py-12 text-center text-muted">Loading Settings...</div>
      </main>
    }>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const queryTab = searchParams.get("tab") as SettingsTab;
  const activeTab = queryTab && tabs.some(t => t.id === queryTab) ? queryTab : "profile";

  const handleTabChange = (tabId: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [headerHeight, setHeaderHeight] = useState(136);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;

    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(headerRef.current);

    return () => observer.disconnect();
  }, []);

  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeTab]);

  return (
    <main 
      style={{ "--settings-header-height": `${headerHeight}px` } as React.CSSProperties}
      className="app-main flex-1"
    >
      
      {/* Header */}
      <Reveal phase="header" className="mb-10">
        <div 
          ref={headerRef}
          className="sticky top-0 bg-background/95 backdrop-blur-sm z-30 pt-3 sm:pt-4 lg:pt-5 pb-4 -mt-3 sm:-mt-4 lg:-mt-5 -mx-6 sm:-mx-8 lg:-mx-12 px-6 sm:px-8 lg:px-12 border-b border-card-border/40"
        >
          <div>
            <AnimatedText as="p" text={PAGE_EYEBROWS["/settings"]} effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Settings"
              effect="micro-scale-fade"
              className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
              delayMs={70}
            />
            <AnimatedText as="p" text="Manage your profile, adjust aesthetic preferences, and control your data." effect="micro-scale-fade" className="text-muted mt-1.5 text-sm font-medium" delayMs={140} />
          </div>
        </div>
      </Reveal>

      {/* Modern Bento Layout */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        
        {/* Navigation Sidebar */}
        <div className="lg:w-72 shrink-0">
          <div 
            style={{ top: "calc(var(--settings-header-height, 136px) + 8 * var(--spacing))" }}
            className="sticky flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 custom-scrollbar snap-x"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  ref={isActive ? activeTabRef : undefined}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-300 snap-center min-w-[200px] lg:min-w-0 cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? "nav-item-active shadow-sm"
                      : "text-muted hover:bg-foreground/[0.03] hover:text-foreground"
                  }`}
                >
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    isActive 
                      ? "bg-accent/15 text-accent shadow-sm" 
                      : "bg-foreground/[0.04] group-hover:bg-foreground/[0.08]"
                  }`}>
                    <tab.icon className="size-5" />
                  </div>
                  
                  <div>
                    <div className="text-[14px] font-bold tracking-wide">{tab.label}</div>
                    <div className={`text-[11px] mt-0.5 hidden lg:block ${isActive ? "text-accent/70" : "text-muted/60"}`}>{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Content Area */}
        <Reveal phase="section" className="flex-1 min-w-0">
          <div className="relative">
            {/* Render Active Component */}
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "data" && <DataTab />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "trash" && <TrashTab />}
          </div>
        </Reveal>
      </div>
    </main>
  );
}

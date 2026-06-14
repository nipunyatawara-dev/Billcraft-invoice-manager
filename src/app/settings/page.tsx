"use client";

import { useState, useEffect } from "react";
import { AnimatedText } from "@/components/animated-text";
import { ProfileTab } from "./components/ProfileTab";
import { AppearanceTab } from "./components/AppearanceTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { DataTab } from "./components/DataTab";
import { SecurityTab } from "./components/SecurityTab";
import { TrashTab } from "./components/TrashTab";

type SettingsTab = "profile" | "appearance" | "notifications" | "data" | "security" | "trash";

const tabs = [
  { id: "profile" as const, label: "Profile", icon: "person", desc: "Your personal and business info" },
  { id: "appearance" as const, label: "Appearance", icon: "palette", desc: "Themes, colors, and typography" },
  { id: "notifications" as const, label: "Notifications", icon: "notifications", desc: "Alerts and reminders" },
  { id: "data" as const, label: "Your Data", icon: "database", desc: "Export and manage your data" },
  { id: "security" as const, label: "Security", icon: "shield", desc: "Passwords and danger zone" },
  { id: "trash" as const, label: "Trash Bin", icon: "delete", desc: "Deleted invoices" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as SettingsTab;
      if (tab && tabs.some(t => t.id === tab)) {
        setActiveTab(tab);
      }
    }
  }, []);

  return (
    <main className="app-main flex-1">
      
      {/* Header */}
      <div className="page-heading">
        <div>
          <AnimatedText as="p" text="Account" effect="micro-scale-fade" className="section-eyebrow" />
          <AnimatedText
            as="h1"
            text="Settings"
            effect="micro-scale-fade"
            className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
            delayMs={70}
          />
          <p className="mt-3 text-[15px] text-[var(--muted)] max-w-2xl font-medium">Manage your profile, adjust aesthetic preferences, and control your data.</p>
        </div>
      </div>

      {/* Modern Bento Layout */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        
        {/* Navigation Sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="sticky top-6 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 custom-scrollbar snap-x">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 snap-center min-w-[200px] lg:min-w-0 ${
                    isActive
                      ? "bg-[var(--action)]/10 text-[var(--action)] shadow-sm"
                      : "text-[var(--muted)] hover:bg-[var(--foreground)]/[0.03] hover:text-[var(--foreground)]"
                  }`}
                >
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                    isActive 
                      ? "bg-[var(--action)] text-[var(--action-text)] shadow-md" 
                      : "bg-[var(--foreground)]/[0.04] group-hover:bg-[var(--foreground)]/[0.08]"
                  }`}>
                    <span className="material-symbols-outlined text-[20px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>{tab.icon}</span>
                  </div>
                  
                  <div>
                    <div className="text-[14px] font-bold tracking-wide">{tab.label}</div>
                    <div className={`text-[11px] mt-0.5 hidden lg:block ${isActive ? "text-[var(--action)]/70" : "text-[var(--muted)]/60"}`}>{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            {/* Render Active Component */}
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "data" && <DataTab />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "trash" && <TrashTab />}
          </div>
        </div>
      </div>
    </main>
  );
}

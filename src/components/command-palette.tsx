"use client";

import * as React from "react";
import { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/hooks/use-user-data";

interface CommandPaletteProps {
  onClose: () => void;
}

interface SearchItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  group?: string;
}

interface SearchGroup {
  group: string;
  items: SearchItem[];
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    clients,
    invoices,
    expenses,
    catalogItems,
    todoTasks,
    vendors,
    outsourcingInvoices,
  } = useUserData();

  // Handle global escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Navigation Options
  const staticNavigation = useMemo<SearchGroup[]>(() => [
    {
      group: "Navigation Pages",
      items: [
        { id: "nav-dashboard", label: "Go to Dashboard", icon: "ph ph-house", href: "/" },
        { id: "nav-invoices", label: "Go to Invoices", icon: "ph ph-file-text", href: "/invoices" },
        { id: "nav-expenses", label: "Go to Expenses", icon: "ph ph-wallet", href: "/expenses" },
        { id: "nav-clients", label: "Go to Clients", icon: "ph ph-users", href: "/clients" },
        { id: "nav-analytics", label: "Go to Analytics", icon: "ph ph-chart-bar", href: "/analytics" },
        { id: "nav-outsourcing", label: "Go to Outsourcing", icon: "ph ph-briefcase", href: "/outsourcing" },
        { id: "nav-todo", label: "Go to To-Do Board", icon: "ph ph-check-square-offset", href: "/todo" },
        { id: "nav-catalog", label: "Go to Catalog", icon: "ph ph-box-arrow-down", href: "/catalog" },
        { id: "nav-settings", label: "Go to Settings", icon: "ph ph-gear", href: "/settings" },
      ],
    },
    {
      group: "Quick Actions",
      items: [
        { id: "act-new-invoice", label: "Create New Invoice", icon: "ph ph-file-plus", href: "/invoices?action=new" },
        { id: "act-new-expense", label: "Add Business Expense", icon: "ph ph-receipt", href: "/expenses?action=new" },
        { id: "act-new-client", label: "Add Client Profile", icon: "ph ph-user-plus", href: "/clients?action=new" },
      ],
    },
  ], []);

  // Compute Search Results
  const searchResults = useMemo<SearchGroup[]>(() => {
    if (!searchQuery.trim()) {
      return staticNavigation;
    }

    const q = searchQuery.toLowerCase();
    const results: SearchGroup[] = [];

    // 1. Filter Navigation Pages & Actions
    const matchedStatic = staticNavigation
      .map(group => ({
        group: group.group,
        items: group.items.filter(item => item.label.toLowerCase().includes(q))
      }))
      .filter(group => group.items.length > 0);
    
    results.push(...matchedStatic);

    // 2. Settings Tabs
    const settingsTabs = [
      { id: "set-profile", label: "Settings: Profile & Business", icon: "ph ph-user", href: "/settings?tab=profile" },
      { id: "set-appearance", label: "Settings: Appearance, Fonts, Palettes", icon: "ph ph-palette", href: "/settings?tab=appearance" },
      { id: "set-notifications", label: "Settings: Alerts & Reminders", icon: "ph ph-bell", href: "/settings?tab=notifications" },
      { id: "set-data", label: "Settings: Data Export / Backup", icon: "ph ph-database", href: "/settings?tab=data" },
      { id: "set-security", label: "Settings: Passwords & Locks", icon: "ph ph-shield", href: "/settings?tab=security" },
      { id: "set-trash", label: "Settings: Trash Bin & Deletions", icon: "ph ph-trash", href: "/settings?tab=trash" },
    ].filter(tab => tab.label.toLowerCase().includes(q));
    
    if (settingsTabs.length > 0) {
      results.push({ group: "Settings Sections", items: settingsTabs });
    }

    // 3. Clients
    const matchedClients = clients
      .filter(c => c.name.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q))
      .map(c => ({
        id: `client-${c.id}`,
        label: `${c.name}${c.company ? ` (${c.company})` : ""}`,
        icon: "ph ph-user-circle",
        href: `/clients?id=${c.id}`,
      }));
    if (matchedClients.length > 0) {
      results.push({ group: "Clients", items: matchedClients.slice(0, 5) });
    }

    // 4. Invoices
    const matchedInvoices = invoices
      .filter(i => i.id.toLowerCase().includes(q) || i.client.toLowerCase().includes(q))
      .map(i => ({
        id: `invoice-${i.id}`,
        label: `${i.id} - ${i.client}`,
        icon: "ph ph-receipt",
        href: `/invoices?id=${i.id}`,
      }));
    if (matchedInvoices.length > 0) {
      results.push({ group: "Invoices", items: matchedInvoices.slice(0, 5) });
    }

    // 5. Expenses
    const matchedExpenses = expenses
      .filter(e => e.merchant.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
      .map(e => ({
        id: `expense-${e.id}`,
        label: `${e.merchant} - ${e.description}`,
        icon: "ph ph-wallet",
        href: `/expenses?id=${e.id}`,
      }));
    if (matchedExpenses.length > 0) {
      results.push({ group: "Expenses", items: matchedExpenses.slice(0, 5) });
    }

    // 6. Catalog Items
    const matchedCatalog = catalogItems
      .filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
      .map(c => ({
        id: `catalog-${c.id}`,
        label: c.name,
        icon: "ph ph-box-arrow-down",
        href: `/catalog?id=${c.id}`,
      }));
    if (matchedCatalog.length > 0) {
      results.push({ group: "Catalog Services", items: matchedCatalog.slice(0, 5) });
    }

    // 7. Todo Tasks
    const matchedTodos = todoTasks
      .filter(t => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q))
      .map(t => ({
        id: `todo-${t.id}`,
        label: t.title,
        icon: "ph ph-check-square-offset",
        href: `/todo?id=${t.id}`,
      }));
    if (matchedTodos.length > 0) {
      results.push({ group: "To-Do Items", items: matchedTodos.slice(0, 5) });
    }

    // 8. Vendors
    const matchedVendors = vendors
      .filter(v => v.name.toLowerCase().includes(q) || (v.email || "").toLowerCase().includes(q))
      .map(v => ({
        id: `vendor-${v.id}`,
        label: v.name,
        icon: "ph ph-storefront",
        href: `/outsourcing?vendor=${v.id}`,
      }));
    if (matchedVendors.length > 0) {
      results.push({ group: "Outsourcing Vendors", items: matchedVendors.slice(0, 5) });
    }

    // 9. Outsourced Payables
    const matchedPayables = outsourcingInvoices
      .filter(p => p.id.toLowerCase().includes(q) || p.vendor.toLowerCase().includes(q))
      .map(p => ({
        id: `payable-${p.id}`,
        label: `${p.id} - ${p.vendor}`,
        icon: "ph ph-receipt-x",
        href: `/outsourcing?id=${p.id}`,
      }));
    if (matchedPayables.length > 0) {
      results.push({ group: "Outsourced Payables", items: matchedPayables.slice(0, 5) });
    }

    return results;
  }, [searchQuery, staticNavigation, clients, invoices, expenses, catalogItems, todoTasks, vendors, outsourcingInvoices]);

  // Flattened results for keyboard indices
  const flatItems = useMemo<SearchItem[]>(() => {
    return searchResults.flatMap(group =>
      group.items.map(item => ({ ...item, group: group.group }))
    );
  }, [searchResults]);

  // Bound check selectedIndex
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems, selectedIndex]);

  // Handle keys for navigating list
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (selected) {
        router.push(selected.href);
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const activeElement = scrollContainerRef.current?.querySelector("[data-active='true']");
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop overlay with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Window Wrapper */}
      <div className="flex min-h-full items-start justify-center p-4 pt-[12vh] text-center sm:p-6 sm:pt-[15vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-card/90 backdrop-blur-lg border border-card-border text-left shadow-2xl transition-all flex flex-col max-h-[55vh]"
        >
            {/* Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-card-border shrink-0 bg-card/40">
              <i className="ph ph-magnifying-glass text-lg text-muted"></i>
              <input
                type="text"
                placeholder="Search everything or type a command..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-sm text-foreground outline-none border-none placeholder-muted/50"
                autoFocus
              />
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-bold text-muted hover:text-foreground border border-card-border rounded-md px-2 py-0.5 uppercase tracking-wide bg-background transition-colors"
              >
                Esc
              </button>
            </div>

            {/* Results Area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar select-none"
            >
              {flatItems.length === 0 ? (
                <div className="py-12 text-center">
                  <i className="ph ph-magnifying-glass text-3xl text-muted/30 block mb-2"></i>
                  <p className="text-[13px] text-muted font-medium">No results found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.map((group) => {
                    return (
                      <div key={group.group} className="space-y-1">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wider">
                          {group.group}
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            // Find corresponding global flat index
                            const flatIdx = flatItems.findIndex((fi) => fi.id === item.id);
                            const isActive = flatIdx === selectedIndex;

                            return (
                              <div
                                key={item.id}
                                data-active={isActive}
                                onClick={() => {
                                  router.push(item.href);
                                  onClose();
                                }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                                  isActive
                                    ? "bg-action text-action-text shadow-md translate-x-0.5"
                                    : "text-foreground hover:bg-foreground/[0.03]"
                                }`}
                              >
                                <span className="flex items-center justify-center shrink-0">
                                  <i className={`${item.icon} text-lg ${isActive ? "text-action-text" : "text-muted"}`}></i>
                                </span>
                                <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                                {isActive && (
                                  <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest flex items-center gap-1">
                                    Open <i className="ph ph-corner-down-left"></i>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sticky Navigation Footer Help */}
            <div className="px-4 py-2 border-t border-card-border bg-foreground/[0.02] flex justify-between items-center text-[10px] text-muted shrink-0 font-medium select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 border border-card-border rounded bg-card font-sans">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 border border-card-border rounded bg-card font-sans">Enter</kbd> Open
                </span>
              </div>
              <div>Press Escape to exit</div>
            </div>
        </motion.div>
      </div>
    </div>
  );
}

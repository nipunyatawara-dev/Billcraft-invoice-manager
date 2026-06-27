"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, type CatalogItem } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import PlusIcon from "@/components/icons/plus-icon";
import StackIcon from "@/components/icons/stack-icon";
import WalletIcon from "@/components/icons/wallet-icon";
import StarIcon from "@/components/icons/star-icon";
import ClockIcon from "@/components/icons/clock-icon";
import PenIcon from "@/components/icons/pen-icon";
import TrashIcon from "@/components/icons/trash-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import { 
  Package, 
  DollarSign, 
  Crown, 
  Clock, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  ChevronDown,
  Info
} from "lucide-react";

type CatalogForm = {
  name: string;
  description: string;
  defaultPrice: number;
  unit: CatalogItem["unit"];
};

const EMPTY_FORM: CatalogForm = {
  name: "",
  description: "",
  defaultPrice: 0,
  unit: "hour",
};

const UNITS: { value: CatalogItem["unit"]; label: string }[] = [
  { value: "hour", label: "Per Hour (hr)" },
  { value: "flat", label: "Flat Rate" },
  { value: "day", label: "Per Day (day)" },
  { value: "unit", label: "Per Unit" },
];

export default function Catalog() {
  const plusIconRef = useRef<AnimatedIconHandle>(null);
  const totalItemsRef = useRef<AnimatedIconHandle>(null);
  const avgRateRef = useRef<AnimatedIconHandle>(null);
  const topServiceRef = useRef<AnimatedIconHandle>(null);
  const hourlyRateRef = useRef<AnimatedIconHandle>(null);

  const { catalogItems = [], saveCatalogItem, deleteCatalogItem } = useUserData();
  const { currency } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "SELECT"
      ) {
        e.preventDefault();
        const searchInput = document.querySelector(".search-field input") as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (id && catalogItems.length > 0 && !editingItemId && !showModal) {
        const item = catalogItems.find(i => i.id === id);
        if (item) {
          setEditingItemId(item.id);
          setForm({
            name: item.name,
            description: item.description,
            defaultPrice: item.defaultPrice,
            unit: item.unit,
          });
          setShowModal(true);
        }
      }
    }
  }, [catalogItems, editingItemId, showModal]);

  const filteredItems = useMemo(() => {
    return catalogItems.filter((item) => {
      const normalizedSearch = searchQuery.toLowerCase();
      return (
        searchQuery === "" ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [catalogItems, searchQuery]);

  const stats = useMemo(() => {
    const totalCount = catalogItems.length;
    const avgPrice = catalogItems.length > 0 ? catalogItems.reduce((sum, item) => sum + item.defaultPrice, 0) / catalogItems.length : 0;
    const maxPrice = catalogItems.reduce((max, item) => Math.max(max, item.defaultPrice), 0);
    const hourlyCount = catalogItems.filter((item) => item.unit === "hour").length;

    return { totalCount, avgPrice, maxPrice, hourlyCount };
  }, [catalogItems]);

  function openAddItem() {
    setEditingItemId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item: CatalogItem) {
    setEditingItemId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      defaultPrice: item.defaultPrice,
      unit: item.unit,
    });
    setShowModal(true);
  }

  function closeModal() {
    if (isSaving) return;
    setShowModal(false);
    setEditingItemId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSaveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.description.trim() || form.defaultPrice < 0) {
      notify.warning({
        title: "Incomplete details",
        description: "Please enter a name, description, and price.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingItemId);
      const itemData: CatalogItem = {
        id: editingItemId || `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name: form.name.trim(),
        description: form.description.trim(),
        defaultPrice: Number(form.defaultPrice),
        unit: form.unit,
      };

      await notifyPromise(saveCatalogItem(itemData), {
        loading: {
          title: isEditing ? "Updating item..." : "Saving item...",
          description: "Adding to your product/service catalog.",
        },
        success: {
          title: isEditing ? "Catalog updated" : "Item cataloged",
          description: `"${itemData.name}" saved at ${formatCurrency(itemData.defaultPrice, currency)}/${itemData.unit}.`,
        },
        error: (error) => ({
          title: "Failed to save item",
          description: getToastErrorMessage(error, "Unable to save catalog details."),
        }),
      });

      setShowModal(false);
      setEditingItemId(null);
      setForm(EMPTY_FORM);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string, name: string) {
    const confirmed = window.confirm(`Are you sure you want to delete "${name}" from the catalog?`);
    if (!confirmed) return;

    try {
      await notifyPromise(deleteCatalogItem(itemId), {
        loading: {
          title: "Deleting item...",
          description: "Removing from local storage.",
        },
        success: {
          title: "Item deleted",
          description: `Removed "${name}" from catalog.`,
        },
        error: (error) => ({
          title: "Failed to delete",
          description: getToastErrorMessage(error, "Unable to delete catalog item."),
        }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  function getUnitText(unit: CatalogItem["unit"]) {
    switch (unit) {
      case "hour":
        return "per hour";
      case "day":
        return "per day";
      case "flat":
        return "flat rate";
      case "unit":
        return "per unit";
      default:
        return "";
    }
  }

  return (
    <>
      <main className="app-main flex-1">
        {/* Page Header Area */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <AnimatedText as="p" text="Reusable Items & Rates" effect="micro-scale-fade" className="text-xs font-bold uppercase tracking-widest text-accent mb-2" />
            <AnimatedText
              as="h1"
              text="Service Catalog"
              effect="micro-scale-fade"
              className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
              delayMs={70}
            />
            <AnimatedText
              as="p"
              text="Manage reusable products, standardized services, and default pricing tiers."
              effect="micro-scale-fade"
              className="text-muted mt-2 text-base font-medium"
              delayMs={140}
            />
          </div>
          <button 
            onClick={openAddItem} 
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
            className="flex items-center gap-2 bg-card border border-card-border text-foreground hover:bg-accent hover:text-action-text hover:border-accent px-5 py-2.5 rounded-xl font-medium transition-all shadow-xs hover:shadow-md hover:shadow-accent/20 group active:scale-[0.97]"
          >
            <PlusIcon ref={plusIconRef} size={20} className="transition-transform duration-300" />
            Add Item
          </button>
        </header>

        {/* Overview Stats Bento Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Total Services */}
          <div 
            onMouseEnter={() => totalItemsRef.current?.startAnimation()}
            onMouseLeave={() => totalItemsRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Total Services</span>
              <StackIcon ref={totalItemsRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
                  <AnimatedNumber value={stats.totalCount} />
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-px bg-card-border" />
                  <div className="text-xs font-semibold text-muted leading-tight select-none">
                    <div>items</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Average Rate */}
          <div 
            onMouseEnter={() => avgRateRef.current?.startAnimation()}
            onMouseLeave={() => avgRateRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Average Rate</span>
              <WalletIcon ref={avgRateRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
                <AnimatedNumber value={formatCurrency(stats.avgPrice, currency)} />
              </span>
            </div>
          </div>

          {/* Premium Service Rate */}
          <div 
            onMouseEnter={() => topServiceRef.current?.startAnimation()}
            onMouseLeave={() => topServiceRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Premium Rate</span>
              <StarIcon ref={topServiceRef} size={20} className="text-accent transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
                  <AnimatedNumber value={formatCurrency(stats.maxPrice, currency)} />
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-px bg-card-border" />
                  <div className="text-xs font-semibold text-positive leading-tight select-none">
                    <div>max</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Services */}
          <div 
            onMouseEnter={() => hourlyRateRef.current?.startAnimation()}
            onMouseLeave={() => hourlyRateRef.current?.stopAnimation()}
            className="bg-card text-card-foreground rounded-xl border border-card-border p-5 group/card transition-all hover:border-accent/30 hover:shadow-xs"
          >
            <div className="flex items-center justify-between mb-3.5 select-none">
              <span className="text-sm font-semibold text-muted">Hourly Services</span>
              <ClockIcon ref={hourlyRateRef} size={20} className="text-muted-foreground group-hover/card:text-accent transition-colors" />
            </div>
            <div className="bg-foreground/[0.015] border border-card-border/50 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
                  <AnimatedNumber value={stats.hourlyCount} />
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-px bg-card-border" />
                  <div className="text-xs font-semibold text-muted leading-tight select-none">
                    <div>billed / hr</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search catalog by name or description..."
          />
        </div>

        {/* Catalog Grid or Empty State */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-card text-card-foreground border border-card-border rounded-xl p-4 sm:p-5 flex flex-col justify-between group relative hover:shadow-xl hover:border-accent/30 transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-foreground/[0.04] flex items-center justify-center border border-card-border shrink-0 text-muted-foreground group-hover:text-accent group-hover:bg-accent/5 transition-all duration-300">
                        <StackIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[13px] sm:text-[14px] text-foreground truncate group-hover:text-accent transition-smooth">
                          {item.name}
                        </h3>
                        <span className="inline-block px-2 py-0.5 mt-1 text-[9px] font-bold rounded-md bg-accent/10 border border-accent/20 text-accent tracking-wider uppercase">
                          {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[12px] text-foreground/70 leading-relaxed line-clamp-2 min-h-9 font-medium">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 pt-3.5 border-t border-card-border/55 border-dashed shrink-0">
                  <div className="flex items-baseline gap-1 select-none">
                    <span className="text-[16px] font-semibold text-foreground font-display">
                      {formatCurrency(item.defaultPrice, currency)}
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      {getUnitText(item.unit)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-smooth">
                    <button
                      onClick={() => openEdit(item)}
                      className="size-7 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer"
                      aria-label="Edit catalog item"
                    >
                      <PenIcon size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="size-7 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer"
                      aria-label="Delete catalog item"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-card-border rounded-xl">
            <Package className="size-10 text-foreground/10 mb-3 mx-auto block" />
            <AnimatedText as="p" text="No catalog items found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="bg-card border border-card-border shadow-2xl rounded-xl relative max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-foreground/[0.01] shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <Package className="size-4.5 text-muted-foreground" />
                <AnimatedText
                  as="h2"
                  text={editingItemId ? "Edit Catalog Item" : "Add Catalog Item"}
                  effect="fade-through"
                  className="text-lg font-bold text-foreground leading-none font-display"
                  replayKey={editingItemId ? "Edit Catalog Item" : "Add Catalog Item"}
                />
              </div>
              <button type="button" onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth text-muted hover:text-foreground cursor-pointer">
                <X className="size-4.5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveItem} className="flex-1 flex flex-col min-h-0 bg-background/35">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                
                {/* Identity & Scope Card */}
                <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
                  <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Item Details</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="catalog-name">Item Name</label>
                    <input
                      id="catalog-name"
                      required
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="e.g. Full-stack Web Design, Consultation, SEO Audit"
                      className="field-control px-3.5 py-2.5 text-[13px] rounded-xl"
                    />
                  </div>

                  {/* Segmented Button Selection for Units */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider">Billing Unit</label>
                    <div className="flex flex-wrap gap-1">
                      {UNITS.map((unit) => {
                        const isSelected = form.unit === unit.value;
                        return (
                          <button
                            key={unit.value}
                            type="button"
                            onClick={() => setForm({ ...form, unit: unit.value })}
                            className={`flex-1 min-h-7 rounded-xl border text-[10px] font-bold transition-all duration-200 active:scale-[0.96] ${
                              isSelected
                                ? "bg-accent/10 border-accent/20 text-accent shadow-xs font-bold"
                                : "border-card-border text-muted bg-card hover:border-foreground/10"
                            }`}
                          >
                            {unit.label.replace("Per ", "").replace(" (hr)", "").replace(" (day)", "")}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="catalog-description">Default Description</label>
                    <textarea
                      id="catalog-description"
                      required
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Provide a default description for this service to include on invoice line items."
                      className="field-control min-h-20 px-3.5 py-2.5 text-[13px] resize-none rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted uppercase tracking-wider" htmlFor="catalog-price">Default Price ({currency})</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[13px] font-semibold text-muted/50">{currency}</span>
                      <input
                        id="catalog-price"
                        type="number"
                        step="0.01"
                        min="0.00"
                        required
                        value={form.defaultPrice || ""}
                        onChange={(event) => setForm({ ...form, defaultPrice: parseFloat(event.target.value) || 0 })}
                        placeholder="0.00"
                        className="field-control pl-9 pr-3 py-2.5 text-[13px] font-mono text-right rounded-xl"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-card-border bg-card shrink-0 z-10 select-none">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 border border-card-border text-sm font-semibold rounded-xl text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all duration-200 cursor-pointer active:scale-[0.95]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-accent text-white hover:bg-accent/90 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.95] shadow-md shadow-accent/15"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : editingItemId ? "Save Changes" : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

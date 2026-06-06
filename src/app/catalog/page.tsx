"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, type CatalogItem } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";

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
        <div className="page-heading">
          <div>
            <AnimatedText as="p" text="Reusable Items & Rates" effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Service Catalog"
              effect="micro-scale-fade"
              className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
              delayMs={70}
            />
          </div>
          <button onClick={openAddItem} className="btn-primary active:scale-[0.97]">
            <span className="material-symbols-outlined text-[16px]">library_add</span>
            Add Item
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="surface-featured p-4 relative overflow-hidden">
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Services</p>
            <p className="text-xl font-semibold text-[var(--featured-text)] font-display">
              <AnimatedNumber value={stats.totalCount} /> <span className="text-[12px] font-normal text-[var(--featured-muted)]">reusable</span>
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Average Rate</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display">
              <AnimatedNumber value={formatCurrency(stats.avgPrice, currency)} />
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Premium Service Rate</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display">
              <AnimatedNumber value={formatCurrency(stats.maxPrice, currency)} /> <span className="text-[11px] font-normal text-[var(--positive)]">max</span>
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Hourly Services</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display">
              <AnimatedNumber value={stats.hourlyCount} /> <span className="text-[12px] font-normal text-[var(--muted)]">items</span>
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search catalog by name or description..."
          />
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="surface-card p-5 relative overflow-hidden flex flex-col justify-between border border-[var(--card-border)] hover:border-[var(--foreground)]/12 group transition-smooth"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-[15px] text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-colors duration-200">
                    {item.name}
                  </h3>
                  <span className="inline-block px-2 py-0.5 mt-1 text-[9px] font-bold rounded-md bg-[var(--foreground)]/[0.05] text-[var(--muted)] tracking-wider uppercase">
                    {item.unit}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                  <button
                    onClick={() => openEdit(item)}
                    className="size-7 flex items-center justify-center rounded-full text-[var(--foreground)]/30 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth"
                    aria-label={`Edit catalog item`}
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id, item.name)}
                    className="size-7 flex items-center justify-center rounded-full text-[var(--foreground)]/30 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth"
                    aria-label={`Delete catalog item`}
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>

              <p className="text-[12px] leading-relaxed text-[var(--muted)] mb-5 line-clamp-2 min-h-10">
                {item.description}
              </p>

              <div className="pt-3 border-t border-[var(--card-border)]/65 flex items-baseline gap-1.5 justify-end">
                <span className="text-[17px] font-semibold text-[var(--foreground)] font-display">
                  {formatCurrency(item.defaultPrice, currency)}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-medium">
                  {getUnitText(item.unit)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 surface-card">
            <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">inventory_2</span>
            <AnimatedText as="p" text="No catalog items found" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeModal} />
          <div role="dialog" aria-modal="true" className="modal-surface relative max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--card)] shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">inventory_2</span>
                <AnimatedText
                  as="h2"
                  text={editingItemId ? "Edit Catalog Item" : "Add Catalog Item"}
                  effect="fade-through"
                  className="text-lg font-bold text-[var(--foreground)] leading-none font-display"
                  replayKey={editingItemId ? "Edit Catalog Item" : "Add Catalog Item"}
                />
              </div>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth text-[var(--muted)] hover:text-[var(--foreground)]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveItem} className="flex-1 flex flex-col min-h-0 bg-[var(--background)]/35">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {/* Identity & Scope Card */}
                <div className="surface-card p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Item Details</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="catalog-name">Item Name</label>
                    <input
                      id="catalog-name"
                      required
                      value={form.name}
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      placeholder="e.g. Full-stack Web Design, Consultation, SEO Audit"
                      className="field-control px-3 py-1.5 text-[13px]"
                    />
                  </div>

                  {/* Segmented Button Selection for Units */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Billing Unit</label>
                    <div className="flex flex-wrap gap-1">
                      {UNITS.map((unit) => {
                        const isSelected = form.unit === unit.value;
                        return (
                          <button
                            key={unit.value}
                            type="button"
                            onClick={() => setForm({ ...form, unit: unit.value })}
                            className={`flex-1 min-h-7 rounded-lg border text-[10px] font-bold transition-all duration-200 active:scale-[0.96] ${
                              isSelected
                                ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] shadow-xs"
                                : "border-[var(--card-border)] text-[var(--muted)] bg-[var(--card)] hover:border-[var(--foreground)]/10"
                            }`}
                          >
                            {unit.label.replace("Per ", "").replace(" (hr)", "").replace(" (day)", "")}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="catalog-description">Default Description</label>
                    <textarea
                      id="catalog-description"
                      required
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Provide a default description for this service to include on invoice line items."
                      className="field-control min-h-20 px-3 py-1.5 text-[13px] resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="catalog-price">Default Price ({currency})</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-[13px] font-semibold text-[var(--muted)]/50">{currency}</span>
                      <input
                        id="catalog-price"
                        type="number"
                        step="0.01"
                        min="0.00"
                        required
                        value={form.defaultPrice || ""}
                        onChange={(event) => setForm({ ...form, defaultPrice: parseFloat(event.target.value) || 0 })}
                        placeholder="0.00"
                        className="field-control pl-9 pr-3 py-1.5 text-[13px] font-mono text-right"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card)] shrink-0 z-10">
                <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 rounded-full text-[12px] font-bold">
                  Cancel
                </button>
                <button type="submit" className="btn-primary min-h-9 px-5 rounded-full text-[12px] font-bold shadow-md active:scale-[0.97]" disabled={isSaving}>
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

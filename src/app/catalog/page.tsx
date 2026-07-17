"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { CatalogItemFormModal, type CatalogForm } from "./components/CatalogItemFormModal";
import { ModalOverlay } from "@/components/workspace-form-modal";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, type CatalogItem } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
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
  Plus, 
  Pencil, 
  Trash2, 
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const EMPTY_FORM: CatalogForm = {
  name: "",
  description: "",
  defaultPrice: 0,
  unit: "hour",
};

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
        <Reveal phase="header" className="mb-10">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <AnimatedText as="p" text={PAGE_EYEBROWS["/catalog"]} effect="micro-scale-fade" className="section-eyebrow" />
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
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl active:scale-[0.97]"
            >
              <PlusIcon ref={plusIconRef} size={20} />
              Add Item
            </button>
          </header>
        </Reveal>

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

        <Reveal phase="section">
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
                className="bg-card text-card-foreground border border-card-border rounded-xl p-4 sm:p-5 flex flex-col justify-between group relative hover-row"
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
          <div className="text-center py-16 surface-card">
            <Package className="size-10 text-foreground/10 mb-3 mx-auto block" />
            <AnimatedText as="p" text="No catalog items found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
        </Reveal>
      </main>

      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <CatalogItemFormModal
            isEditing={Boolean(editingItemId)}
            form={form}
            setForm={setForm}
            currency={currency}
            isSaving={isSaving}
            closeModal={closeModal}
            onSubmit={handleSaveItem}
          />
        </ModalOverlay>
      )}
    </>
  );
}

"use client";

import * as React from "react";
import { WorkspaceFormModal } from "@/components/workspace-form-modal";
import type { CatalogItem } from "@/data/invoices";
import { DollarSign, FileText, Package } from "lucide-react";

export type CatalogForm = {
  name: string;
  description: string;
  defaultPrice: number;
  unit: CatalogItem["unit"];
};

const UNIT_ORDER: CatalogItem["unit"][] = ["hour", "flat", "day", "unit"];

const UNIT_STYLES: Record<CatalogItem["unit"], { label: string; suffix: string; icon: string; text: string; bg: string; border: string; glow: string }> = {
  hour: { label: "Hourly", suffix: "/hr", icon: "schedule", text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30", glow: "shadow-[0_0_12px_rgba(14,165,233,0.15)]" },
  flat: { label: "Flat Rate", suffix: "flat", icon: "bolt", text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]" },
  day: { label: "Per Day", suffix: "/day", icon: "calendar_month", text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]" },
  unit: { label: "Per Unit", suffix: "/unit", icon: "inventory_2", text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]" },
};

interface CatalogItemFormModalProps {
  isEditing: boolean;
  form: CatalogForm;
  setForm: React.Dispatch<React.SetStateAction<CatalogForm>>;
  currency: string;
  isSaving: boolean;
  closeModal: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function CatalogItemFormModal({
  isEditing,
  form,
  setForm,
  currency,
  isSaving,
  closeModal,
  onSubmit,
}: CatalogItemFormModalProps) {
  const title = isEditing ? "Edit Item" : "Add Item";
  const subtitle = isEditing ? "Edit Session" : "Draft Workspace";

  const leftPanel = (
    <div className="surface-card p-4 space-y-4">
      <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
        <DollarSign className="size-3.5 text-muted/80" />
        Pricing & Unit
      </h3>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="catalog-price">
          Default Price
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-accent/80 shrink-0">{currency}</span>
          <input
            id="catalog-price"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.defaultPrice || ""}
            onChange={(event) => setForm({ ...form, defaultPrice: parseFloat(event.target.value) || 0 })}
            placeholder="0.00"
            className="field-control flex-1 px-3 py-2 text-[13px] font-mono rounded-lg"
          />
          <span className="text-[11px] font-semibold text-muted shrink-0">{UNIT_STYLES[form.unit].suffix}</span>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase block">Billing Unit</label>
        <div className="grid grid-cols-2 gap-1.5">
          {UNIT_ORDER.map((unit) => {
            const isSelected = form.unit === unit;
            const styles = UNIT_STYLES[unit];
            return (
              <button
                key={unit}
                type="button"
                onClick={() => setForm({ ...form, unit })}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 relative active:scale-[0.95] ${
                  isSelected
                    ? `${styles.bg} ${styles.border} ${styles.text} ${styles.glow} font-bold`
                    : "border-card-border text-muted bg-card hover:border-foreground/15 hover:text-foreground"
                }`}
              >
                <span className="material-symbols-outlined text-[18px] mb-1">{styles.icon}</span>
                <span className="text-[9.5px] tracking-wide font-medium truncate w-full px-1">{styles.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="surface-card p-4 space-y-4">
      <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
        <Package className="size-3.5 text-muted/80" />
        Item Details
      </h3>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="catalog-name">
          Item Name
        </label>
        <input
          id="catalog-name"
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="e.g. Web Design, Consultation, SEO Audit"
          className="field-control px-3 py-2 text-[13px] rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5" htmlFor="catalog-description">
          <FileText className="size-3 text-muted/70" />
          Default Description
        </label>
        <textarea
          id="catalog-description"
          required
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Default description for invoice line items."
          className="field-control min-h-24 px-3 py-2 text-[13px] resize-none rounded-lg"
        />
      </div>
    </div>
  );

  return (
    <WorkspaceFormModal
      title={title}
      subtitle={subtitle}
      onClose={closeModal}
      onSubmit={onSubmit}
      isSaving={isSaving}
      maxWidth="4xl"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      footerActions={{
        submitLabel: isEditing ? "Save Changes" : "Add to Catalog",
      }}
    />
  );
}

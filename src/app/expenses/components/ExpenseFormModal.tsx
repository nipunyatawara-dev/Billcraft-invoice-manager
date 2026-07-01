"use client";

import * as React from "react";
import { motion } from "motion/react";
import { WorkspaceFormModal } from "@/components/workspace-form-modal";
import type { Expense } from "@/data/invoices";
import {
  Calendar,
  FileText,
  Percent,
  Receipt,
  Store,
} from "lucide-react";

export type ExpenseForm = {
  merchant: string;
  description: string;
  category: Expense["category"];
  amount: number;
  date: string;
  isTaxDeductible: boolean;
  notes: string;
};

const CATEGORIES: Expense["category"][] = [
  "Travel",
  "Software",
  "Office Supplies",
  "Meals",
  "Marketing",
  "Tax/Legal",
  "Other",
];

const CATEGORY_STYLES: Record<Expense["category"], { text: string; bg: string; border: string; glow: string; icon: string }> = {
  Travel: { text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30", glow: "shadow-[0_0_12px_rgba(14,165,233,0.15)]", icon: "flight" },
  Software: { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]", icon: "terminal" },
  "Office Supplies": { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]", icon: "content_paste" },
  Meals: { text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", glow: "shadow-[0_0_12px_rgba(244,63,94,0.15)]", icon: "restaurant" },
  Marketing: { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]", icon: "campaign" },
  "Tax/Legal": { text: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/30", glow: "shadow-[0_0_12px_rgba(99,102,241,0.15)]", icon: "gavel" },
  Other: { text: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30", glow: "shadow-[0_0_12px_rgba(107,114,128,0.15)]", icon: "category" },
};

interface ExpenseFormModalProps {
  isEditing: boolean;
  form: ExpenseForm;
  setForm: React.Dispatch<React.SetStateAction<ExpenseForm>>;
  currency: string;
  isSaving: boolean;
  closeModal: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function ExpenseFormModal({
  isEditing,
  form,
  setForm,
  currency,
  isSaving,
  closeModal,
  onSubmit,
}: ExpenseFormModalProps) {
  const title = isEditing ? "Edit Expense" : "Add Expense";
  const subtitle = isEditing ? "Edit Session" : "Draft Workspace";

  const leftPanel = (
    <>
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          <Receipt className="size-3.5 text-muted/80" />
          Amount & Date
        </h3>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="expense-amount">
            Transaction Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-accent/80 shrink-0">{currency}</span>
            <input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount || ""}
              onChange={(event) => setForm({ ...form, amount: parseFloat(event.target.value) || 0 })}
              placeholder="0.00"
              className="field-control flex-1 px-3 py-2 text-[13px] font-mono rounded-lg"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5" htmlFor="expense-date">
            <Calendar className="size-3 text-muted/70" />
            Expense Date
          </label>
          <input
            id="expense-date"
            type="date"
            required
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            className="field-control px-3 py-2 text-[13px] rounded-lg"
          />
        </div>
      </div>

      <div className="surface-card p-4 space-y-3">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase">Category</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map((category) => {
            const isSelected = form.category === category;
            const styles = CATEGORY_STYLES[category];
            return (
              <button
                key={category}
                type="button"
                onClick={() => setForm({ ...form, category })}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 relative active:scale-[0.95] ${
                  isSelected
                    ? `${styles.bg} ${styles.border} ${styles.text} ${styles.glow} font-bold`
                    : "border-card-border text-muted bg-card hover:border-foreground/15 hover:text-foreground"
                }`}
              >
                <span className="material-symbols-outlined text-[18px] mb-1">{styles.icon}</span>
                <span className="text-[9.5px] tracking-wide font-medium truncate w-full px-1">{category}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const rightPanel = (
    <>
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          <Store className="size-3.5 text-muted/80" />
          Details
        </h3>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="expense-merchant">
            Merchant
          </label>
          <input
            id="expense-merchant"
            required
            value={form.merchant}
            onChange={(event) => setForm({ ...form, merchant: event.target.value })}
            placeholder="e.g. AWS, Stripe, Adobe"
            className="field-control px-3 py-2 text-[13px] rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5" htmlFor="expense-description">
            <FileText className="size-3 text-muted/70" />
            Description
          </label>
          <input
            id="expense-description"
            required
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="e.g. Monthly cloud server fees"
            className="field-control px-3 py-2 text-[13px] rounded-lg"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setForm({ ...form, isTaxDeductible: !form.isTaxDeductible })}
        className={`surface-card w-full flex items-center justify-between p-4 text-left transition-all active:scale-[0.98] ${
          form.isTaxDeductible ? "border-accent/40 bg-accent/5" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`p-2 rounded-lg ${form.isTaxDeductible ? "bg-accent/15 text-accent" : "bg-foreground/[0.03] text-muted"}`}>
            <Percent className="size-4" />
          </span>
          <div>
            <p className="text-[12px] font-bold text-foreground">Tax Write-Off Eligible</p>
            <p className="text-[10px] text-muted mt-0.5">Flag for business tax deductions</p>
          </div>
        </div>
        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${form.isTaxDeductible ? "bg-accent" : "bg-card-border"}`}>
          <motion.div
            layout
            className="size-4 rounded-full bg-white shadow-sm"
            animate={{ x: form.isTaxDeductible ? 14 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
      </button>

      <div className="surface-card p-4 space-y-3">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase block" htmlFor="expense-notes">
          Notes
        </label>
        <textarea
          id="expense-notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Receipt reference, payment card ID..."
          className="field-control min-h-20 px-3 py-2 text-[13px] resize-none rounded-lg"
        />
      </div>
    </>
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
        submitLabel: isEditing ? "Save Changes" : "Save Expense",
      }}
    />
  );
}

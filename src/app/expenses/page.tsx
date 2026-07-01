"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, formatDisplayDate, type Expense } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";
import { PAGE_EYEBROWS } from "@/lib/page-meta";
import PlusIcon from "@/components/icons/plus-icon";
import FileDescriptionIcon from "@/components/icons/file-description-icon";
import ShieldCheckIcon from "@/components/icons/shield-check";
import ChartBarIcon from "@/components/icons/chart-bar-icon";
import UnorderedListIcon from "@/components/icons/unordered-list-icon";
import PenIcon from "@/components/icons/pen-icon";
import TrashIcon from "@/components/icons/trash-icon";
import type { AnimatedIconHandle } from "@/components/icons/types";
import { PageStatsRow } from "@/components/page-stats-row";

type ExpenseForm = {
  merchant: string;
  description: string;
  category: Expense["category"];
  amount: number;
  date: string;
  isTaxDeductible: boolean;
  notes: string;
};

const EMPTY_FORM: ExpenseForm = {
  merchant: "",
  description: "",
  category: "Software",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  isTaxDeductible: true,
  notes: "",
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

const CATEGORY_ICONS: Record<Expense["category"], string> = {
  Travel: "flight",
  Software: "terminal",
  "Office Supplies": "content_paste",
  Meals: "restaurant",
  Marketing: "campaign",
  "Tax/Legal": "gavel",
  Other: "category",
};

const CATEGORY_STYLES: Record<Expense["category"], { text: string; bg: string; border: string; glow: string; icon: string }> = {
  Travel: { text: "text-sky-500", bg: "bg-sky-500/10", border: "border-sky-500/30", glow: "shadow-[0_0_12px_rgba(14,165,233,0.15)]", icon: "flight" },
  Software: { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", glow: "shadow-[0_0_12px_rgba(16,185,129,0.15)]", icon: "terminal" },
  "Office Supplies": { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]", icon: "content_paste" },
  Meals: { text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/30", glow: "shadow-[0_0_12px_rgba(244,63,94,0.15)]", icon: "restaurant" },
  Marketing: { text: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", glow: "shadow-[0_0_12px_rgba(168,85,247,0.15)]", icon: "campaign" },
  "Tax/Legal": { text: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/30", glow: "shadow-[0_0_12px_rgba(99,102,241,0.15)]", icon: "gavel" },
  Other: { text: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30", glow: "shadow-[0_0_12px_rgba(107,114,128,0.15)]", icon: "category" },
};

export default function Expenses() {
  const plusIconRef = useRef<AnimatedIconHandle>(null);
  const totalBilledRef = useRef<AnimatedIconHandle>(null);
  const taxDeductibleRef = useRef<AnimatedIconHandle>(null);
  const avgSpendRef = useRef<AnimatedIconHandle>(null);
  const totalRecordsRef = useRef<AnimatedIconHandle>(null);

  const { expenses = [], saveExpense, deleteExpense } = useUserData();
  const { currency } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showModal, setShowModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
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
      if (id && expenses.length > 0 && !editingExpenseId && !showModal) {
        const expense = expenses.find(e => e.id === id);
        if (expense) {
          setEditingExpenseId(expense.id);
          setForm({
            merchant: expense.merchant,
            description: expense.description,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            isTaxDeductible: expense.isTaxDeductible,
            notes: expense.notes || "",
          });
          setShowModal(true);
        }
      }
    }
  }, [expenses, editingExpenseId, showModal]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesCategory = selectedCategory === "All" || expense.category === selectedCategory;
      const normalizedSearch = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        expense.merchant.toLowerCase().includes(normalizedSearch) ||
        expense.description.toLowerCase().includes(normalizedSearch) ||
        (expense.notes || "").toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const taxDeductible = expenses.filter((e) => e.isTaxDeductible).reduce((sum, e) => sum + e.amount, 0);
    const avg = expenses.length > 0 ? total / expenses.length : 0;
    const deductibleCount = expenses.filter((e) => e.isTaxDeductible).length;

    return { total, taxDeductible, avg, deductibleCount };
  }, [expenses]);

  function openAddExpense() {
    setEditingExpenseId(null);
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpenseId(expense.id);
    setForm({
      merchant: expense.merchant,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      isTaxDeductible: expense.isTaxDeductible,
      notes: expense.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    if (isSaving) return;
    setShowModal(false);
    setEditingExpenseId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSaveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.merchant.trim() || !form.description.trim() || form.amount <= 0) {
      notify.warning({
        title: "Incomplete details",
        description: "Please enter merchant, description, and an amount greater than 0.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = Boolean(editingExpenseId);
      const expenseData: Expense = {
        id: editingExpenseId || `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        merchant: form.merchant.trim(),
        description: form.description.trim(),
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        isTaxDeductible: form.isTaxDeductible,
        notes: form.notes.trim() || undefined,
      };

      await notifyPromise(saveExpense(expenseData), {
        loading: {
          title: isEditing ? "Updating expense..." : "Saving expense...",
          description: "Writing expense data to your local workspace.",
        },
        success: {
          title: isEditing ? "Expense updated" : "Expense tracked",
          description: `Spent ${formatCurrency(expenseData.amount, currency)} at ${expenseData.merchant}.`,
        },
        error: (error) => ({
          title: "Failed to save expense",
          description: getToastErrorMessage(error, "Unable to save expense details."),
        }),
      });

      setShowModal(false);
      setEditingExpenseId(null);
      setForm(EMPTY_FORM);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteExpense(expenseId: string, merchant: string) {
    const confirmed = window.confirm(`Are you sure you want to delete the expense at ${merchant}?`);
    if (!confirmed) return;

    try {
      await notifyPromise(deleteExpense(expenseId), {
        loading: {
          title: "Deleting expense...",
          description: "Removing from local storage.",
        },
        success: {
          title: "Expense deleted",
          description: `Removed expense at ${merchant}.`,
        },
        error: (error) => ({
          title: "Failed to delete",
          description: getToastErrorMessage(error, "Unable to delete expense."),
        }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <main className="app-main flex-1">
        {/* Page Header Area */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div>
            <AnimatedText as="p" text={PAGE_EYEBROWS["/expenses"]} effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Expenses"
              effect="micro-scale-fade"
              className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
              delayMs={70}
            />
            <AnimatedText as="p" text="Track business expenses, tax-deductible items, and spending averages." effect="micro-scale-fade" className="text-muted mt-2 text-base font-medium" delayMs={140} />
          </div>
          
          <button 
            onClick={openAddExpense} 
            onMouseEnter={() => plusIconRef.current?.startAnimation()}
            onMouseLeave={() => plusIconRef.current?.stopAnimation()}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl active:scale-[0.97]"
          >
            <PlusIcon ref={plusIconRef} size={20} />
            Add Expense
          </button>
        </header>

        <PageStatsRow
          stats={[
            {
              label: "Total Expenses",
              hint: "all-time",
              icon: FileDescriptionIcon,
              iconRef: totalBilledRef,
              value: <AnimatedNumber value={formatCurrency(stats.total, currency)} />,
            },
            {
              label: "Tax Deductible",
              hint: `${stats.deductibleCount} items`,
              tone: "accent",
              icon: ShieldCheckIcon,
              iconRef: taxDeductibleRef,
              value: <AnimatedNumber value={formatCurrency(stats.taxDeductible, currency)} />,
            },
            {
              label: "Average Spend",
              hint: "per item",
              icon: ChartBarIcon,
              iconRef: avgSpendRef,
              value: <AnimatedNumber value={formatCurrency(stats.avg, currency)} />,
            },
            {
              label: "Total Records",
              hint: "logged",
              icon: UnorderedListIcon,
              iconRef: totalRecordsRef,
              value: <AnimatedNumber value={expenses.length} />,
            },
          ]}
        />

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <AnimatedSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search expenses..."
          />

          <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
            {["All", ...CATEGORIES].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-xl transition-all cursor-pointer select-none active:scale-[0.95] tracking-wide uppercase whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-accent/10 border-accent/20 text-accent border"
                    : "text-muted hover:bg-foreground/[0.04] border border-card-border"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-card text-card-foreground border border-card-border rounded-xl p-4 sm:p-5 flex flex-col justify-between group relative hover-row"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-foreground/[0.04] flex items-center justify-center border border-card-border shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-muted">
                          {CATEGORY_ICONS[expense.category] || "payments"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[13px] text-foreground truncate group-hover:text-accent transition-smooth">
                          {expense.merchant}
                        </h3>
                        <p className="text-[10px] text-muted mt-0.5 font-medium">
                          {formatDisplayDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold text-[14px] text-foreground">
                        {formatCurrency(expense.amount, currency)}
                      </p>
                    </div>
                  </div>

                  <p className="text-[12px] text-foreground/70 font-medium line-clamp-2 leading-relaxed">
                    {expense.description}
                  </p>

                  {expense.notes && (
                    <p className="mt-2 text-[10.5px] italic text-muted bg-foreground/[0.015] p-2 rounded-lg border border-card-border/30 line-clamp-2">
                      {expense.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-card-border/55 shrink-0">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-foreground/[0.05] text-muted tracking-wider uppercase border border-card-border/20">
                      {expense.category}
                    </span>

                    {expense.isTaxDeductible ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-positive/10 text-positive tracking-wider uppercase border border-positive/10">
                        Tax Deductible
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-accent/10 text-accent tracking-wider uppercase border border-accent/10">
                        Non-Deductible
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-smooth">
                    <button
                      onClick={() => openEdit(expense)}
                      className="size-7 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer"
                      aria-label="Edit expense"
                    >
                      <PenIcon size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id, expense.merchant)}
                      className="size-7 inline-flex items-center justify-center rounded-lg bg-background border border-card-border text-muted hover:border-foreground/20 hover:text-foreground hover:shadow-xs transition-all cursor-pointer"
                      aria-label="Delete expense"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-xl p-5 text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-foreground/10 mb-3 block">receipt_long</span>
            <AnimatedText as="p" text="No expenses found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              aria-label="Close modal"
              className="absolute inset-0 bg-[#030303]/60 backdrop-blur-md cursor-default"
              onClick={closeModal}
            />
            
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="modal-surface relative max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-card shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_6px_var(--accent)]"></span>
                  <span className="material-symbols-outlined text-[18px] text-muted">payments</span>
                  <AnimatedText
                    as="h2"
                    text={editingExpenseId ? "Edit Expense" : "Add Expense"}
                    effect="fade-through"
                    className="text-base font-bold text-foreground leading-none font-display"
                    replayKey={editingExpenseId ? "Edit Expense" : "Add Expense"}
                  />
                </div>
                <button type="button" onClick={closeModal} className="size-7 flex items-center justify-center rounded-full hover:bg-foreground/[0.04] transition-smooth text-muted hover:text-foreground">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveExpense} className="flex-1 flex flex-col min-h-0 bg-background/20">
                
                {/* 1. Large, Premium Amount Input Header */}
                <div className="relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-accent/5 to-transparent border-b border-card-border/40 select-none">
                  <label htmlFor="expense-amount" className="text-[9px] font-bold text-muted uppercase tracking-widest mb-1.5">Transaction Amount</label>
                  <div className="relative flex items-center justify-center max-w-[280px]">
                    <span className="text-xl font-bold text-accent/80 mr-1.5 select-none">{currency}</span>
                    <input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={form.amount || ""}
                      onChange={(event) => setForm({ ...form, amount: parseFloat(event.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full text-center bg-transparent border-none outline-none font-bold text-4xl text-foreground focus:ring-0 placeholder:text-muted/20 font-mono tracking-tight"
                      style={{ caretColor: "var(--accent)" }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  
                  {/* Expense Details Card */}
                  <div className="surface-card p-4.5 rounded-xl border border-card-border bg-card space-y-5 shadow-sm">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest block">Details & Metadata</span>
                    
                    {/* Merchant */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="expense-merchant">Merchant</label>
                      <input
                        id="expense-merchant"
                        required
                        value={form.merchant}
                        onChange={(event) => setForm({ ...form, merchant: event.target.value })}
                        placeholder="e.g. AWS, Stripe, Adobe, Starbucks"
                        className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                      />
                    </div>

                    {/* Category Grid Selector */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest block">Category</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        {CATEGORIES.map((category) => {
                          const isSelected = form.category === category;
                          const styles = CATEGORY_STYLES[category] || { text: "text-muted", bg: "bg-card", border: "border-card-border", glow: "", icon: "payments" };
                          
                          return (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setForm({ ...form, category })}
                              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-300 relative group active:scale-[0.95] ${
                                isSelected
                                  ? `${styles.bg} ${styles.border} ${styles.text} ${styles.glow} font-bold`
                                  : "border-card-border text-muted bg-card hover:border-foreground/15 hover:text-foreground"
                              }`}
                            >
                              {/* Selected indicator dot */}
                              {isSelected && (
                                <motion.span
                                  layoutId="activeCategoryDot"
                                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]"
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                              )}
                              
                              <motion.span
                                animate={{ scale: isSelected ? 1.1 : 1 }}
                                className="material-symbols-outlined text-[18px] mb-1.5"
                              >
                                {styles.icon}
                              </motion.span>
                              <span className="text-[9.5px] tracking-wide font-medium truncate w-full px-1">{category}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="expense-description">Description</label>
                      <input
                        id="expense-description"
                        required
                        value={form.description}
                        onChange={(event) => setForm({ ...form, description: event.target.value })}
                        placeholder="e.g. Monthly cloud server infrastructure fees"
                        className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-muted uppercase tracking-widest" htmlFor="expense-date">Expense Date</label>
                      <input
                        id="expense-date"
                        type="date"
                        required
                        value={form.date}
                        onChange={(event) => setForm({ ...form, date: event.target.value })}
                        className="field-control px-3 py-2 text-[12.5px] transition-all bg-foreground/[0.01]"
                      />
                    </div>
                  </div>

                  {/* 2. Tax Write-Off Premium Card Toggle */}
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isTaxDeductible: !form.isTaxDeductible })}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden group shadow-sm active:scale-[0.98] ${
                      form.isTaxDeductible
                        ? "bg-accent/5 border-accent/40"
                        : "border-card-border hover:border-foreground/10 bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined p-2 rounded-lg transition-colors duration-300 ${
                        form.isTaxDeductible ? "bg-accent/15 text-accent" : "bg-foreground/[0.03] text-muted"
                      }`}>
                        percent
                      </span>
                      <div>
                        <p className="text-[12px] font-bold text-foreground">Tax Write-Off Eligible</p>
                        <p className="text-[10px] text-muted mt-0.5 font-medium">Flag this expense to deduct from business tax liabilities</p>
                      </div>
                    </div>
                    <div className={`w-9 h-5.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
                      form.isTaxDeductible ? "bg-accent" : "bg-card-border"
                    }`}>
                      <motion.div
                        layout
                        className="size-4.5 rounded-full bg-white shadow-sm"
                        animate={{ x: form.isTaxDeductible ? 14 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>

                  {/* 3. Transaction Notes */}
                  <div className="surface-card p-4.5 rounded-xl border border-card-border bg-card space-y-3 shadow-sm">
                    <label className="text-[9px] font-bold text-muted uppercase tracking-widest block" htmlFor="expense-notes">Notes & Auditing References</label>
                    <textarea
                      id="expense-notes"
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="e.g. Receipt invoice reference, payment card ID..."
                      className="field-control min-h-16 px-3 py-2 text-[12.5px] resize-none transition-all bg-foreground/[0.01]"
                    />
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="flex justify-end items-center gap-2.5 px-6 py-4.5 border-t border-card-border/60 bg-card shrink-0 z-10">
                  <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 text-[12px] font-bold rounded-lg transition-all active:scale-[0.98]">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary min-h-9 px-5 text-[12px] font-bold shadow-md transition-all active:scale-[0.96] rounded-lg" disabled={isSaving}>
                    {isSaving ? "Saving..." : editingExpenseId ? "Save Changes" : "Save Expense"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

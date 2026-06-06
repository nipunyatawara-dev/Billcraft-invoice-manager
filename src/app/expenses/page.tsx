"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, formatDisplayDate, type Expense } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedSearchBar } from "@/components/ui/animated-search-bar";

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

export default function Expenses() {
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
        <div className="page-heading">
          <div>
            <AnimatedText as="p" text="Tax & Write-offs" effect="micro-scale-fade" className="section-eyebrow" />
            <AnimatedText
              as="h1"
              text="Expenses"
              effect="micro-scale-fade"
              className="text-3xl lg:text-[40px] font-semibold text-[var(--foreground)] leading-[1.1]"
              delayMs={70}
            />
          </div>
          <button onClick={openAddExpense} className="btn-primary active:scale-[0.97]">
            <span className="material-symbols-outlined text-[16px]">add_card</span>
            Add Expense
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="surface-featured p-4 relative overflow-hidden">
            <p className="text-[11px] font-semibold text-[var(--featured-text)]/40 tracking-wider uppercase mb-2.5">Total Expenses</p>
            <p className="text-xl font-semibold text-[var(--featured-text)] font-display">
              <AnimatedNumber value={formatCurrency(stats.total, currency)} />
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Tax Deductible</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display">
              <AnimatedNumber value={formatCurrency(stats.taxDeductible, currency)} />
              <span className="text-[11px] font-normal text-[var(--positive)] ml-1">
                ({stats.deductibleCount} items)
              </span>
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Average Spend</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display">
              <AnimatedNumber value={formatCurrency(stats.avg, currency)} />
            </p>
          </div>
          <div className="surface-card p-4">
            <p className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase mb-2.5">Total Records</p>
            <p className="text-xl font-semibold text-[var(--foreground)] font-display">
              <AnimatedNumber value={expenses.length} /> <span className="text-[12px] font-normal text-[var(--muted)]">logged</span>
            </p>
          </div>
        </div>

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
                className={`px-4 py-2 text-[13px] font-medium rounded-full transition-smooth active:scale-[0.95] whitespace-nowrap ${
                  selectedCategory === category
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                    : "text-[var(--foreground)]/70 hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04] bg-transparent"
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
                className="surface-card p-4 sm:p-5 flex flex-col justify-between group relative hover:border-[var(--foreground)]/15 transition-smooth"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-[var(--foreground)]/[0.04] flex items-center justify-center border border-[var(--card-border)] shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-[var(--muted)]">
                          {CATEGORY_ICONS[expense.category] || "payments"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[13px] text-[var(--foreground)] truncate group-hover:text-[var(--accent)] transition-smooth">
                          {expense.merchant}
                        </h3>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">
                          {formatDisplayDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold text-[14px] text-[var(--foreground)]">
                        {formatCurrency(expense.amount, currency)}
                      </p>
                    </div>
                  </div>

                  <p className="text-[12px] text-[var(--foreground)]/70 font-medium line-clamp-2 leading-relaxed">
                    {expense.description}
                  </p>

                  {expense.notes && (
                    <p className="mt-2 text-[10.5px] italic text-[var(--muted)] bg-[var(--foreground)]/[0.015] p-2 rounded-lg border border-[var(--card-border)]/30 line-clamp-2">
                      {expense.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--card-border)]/55 shrink-0">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[var(--foreground)]/[0.05] text-[var(--muted)] tracking-wider uppercase">
                      {expense.category}
                    </span>

                    {expense.isTaxDeductible ? (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[var(--positive)]/10 text-[var(--positive)] tracking-wider uppercase">
                        Tax Deductible
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[var(--accent)]/10 text-[var(--accent)] tracking-wider uppercase">
                        Non-Deductible
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-smooth">
                    <button
                      onClick={() => openEdit(expense)}
                      className="size-7 flex items-center justify-center rounded-full text-[var(--foreground)]/30 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth"
                      aria-label="Edit expense"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id, expense.merchant)}
                      className="size-7 flex items-center justify-center rounded-full text-[var(--foreground)]/30 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth"
                      aria-label="Delete expense"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card p-5 text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">receipt_long</span>
            <AnimatedText as="p" text="No expenses found" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
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
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">payments</span>
                <AnimatedText
                  as="h2"
                  text={editingExpenseId ? "Edit Expense" : "Add Expense"}
                  effect="fade-through"
                  className="text-lg font-bold text-[var(--foreground)] leading-none font-display"
                  replayKey={editingExpenseId ? "Edit Expense" : "Add Expense"}
                />
              </div>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth text-[var(--muted)] hover:text-[var(--foreground)]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveExpense} className="flex-1 flex flex-col min-h-0 bg-[var(--background)]/35">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                
                {/* Expense Details Card */}
                <div className="surface-card p-4 space-y-4">
                  <h3 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Expense Details</h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="expense-merchant">Merchant</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-[16px] text-[var(--muted)]/50">store</span>
                      <input
                        id="expense-merchant"
                        required
                        value={form.merchant}
                        onChange={(event) => setForm({ ...form, merchant: event.target.value })}
                        placeholder="e.g. AWS, Stripe, Cafe, Adobe"
                        className="field-control pl-9 pr-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Category Grid Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Expense Category</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {CATEGORIES.map((category) => {
                        const isSelected = form.category === category;
                        const icon = CATEGORY_ICONS[category] || "payments";
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setForm({ ...form, category })}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-200 active:scale-[0.96] ${
                              isSelected
                                ? "bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] shadow-xs"
                                : "border-[var(--card-border)] text-[var(--muted)] bg-[var(--card)] hover:border-[var(--foreground)]/10 hover:text-[var(--foreground)]"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px] mb-1">{icon}</span>
                            <span className="text-[10px] font-bold truncate max-w-[80px]">{category}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="expense-description">Description</label>
                    <input
                      id="expense-description"
                      required
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="e.g. Monthly server billing, Client networking lunch, etc."
                      className="field-control px-3 py-1.5 text-[13px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="expense-amount">Amount ({currency})</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-[13px] font-semibold text-[var(--muted)]/50">{currency}</span>
                        <input
                          id="expense-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          value={form.amount || ""}
                          onChange={(event) => setForm({ ...form, amount: parseFloat(event.target.value) || 0 })}
                          placeholder="0.00"
                          className="field-control pl-9 pr-3 py-1.5 text-[13px] text-right font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="expense-date">Date</label>
                      <input
                        id="expense-date"
                        type="date"
                        required
                        value={form.date}
                        onChange={(event) => setForm({ ...form, date: event.target.value })}
                        className="field-control px-3 py-1.5 text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Tax Deductible Slider Switch */}
                  <div className="flex items-center justify-between py-2 border-t border-[var(--card-border)]/55">
                    <div>
                      <p className="text-[12px] font-bold text-[var(--foreground)]">Tax Deductible</p>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5 font-medium">Write off this expense from business taxes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        id="expense-deductible"
                        type="checkbox"
                        checked={form.isTaxDeductible}
                        onChange={(event) => setForm({ ...form, isTaxDeductible: event.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-[var(--card-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider" htmlFor="expense-notes">Notes</label>
                    <textarea
                      id="expense-notes"
                      value={form.notes}
                      onChange={(event) => setForm({ ...form, notes: event.target.value })}
                      placeholder="e.g. Receipt numbers, bank transaction reference..."
                      className="field-control min-h-16 px-3 py-1.5 text-[13px] resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-[var(--card-border)] bg-[var(--card)] shrink-0 z-10">
                <button type="button" onClick={closeModal} className="btn-ghost min-h-9 px-4 rounded-full text-[12px] font-bold">
                  Cancel
                </button>
                <button type="submit" className="btn-primary min-h-9 px-5 rounded-full text-[12px] font-bold shadow-md active:scale-[0.97]" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingExpenseId ? "Save Changes" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

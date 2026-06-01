"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { AnimatedText } from "@/components/animated-text";
import { formatCurrency, formatDisplayDate, type Expense } from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatePresence, motion } from "motion/react";

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
  const { expenses = [], saveExpense, deleteExpense, activeProfile } = useUserData();
  const { currency } = useCurrency();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showModal, setShowModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

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
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-6">
          <div className="search-field w-full max-w-md" data-expanded={searchQuery.length > 0}>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search expenses..."
              type="text"
            />
            <span className="search-icon-btn">
              <span className="material-symbols-outlined text-[15px]">search</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {["All", ...CATEGORIES].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-[11px] font-semibold rounded-lg tracking-wider uppercase transition-smooth ${
                  selectedCategory === category
                    ? "bg-[var(--action)]/12 text-[var(--action)]"
                    : "text-[var(--foreground)]/50 hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]/80"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses List */}
        <div className="surface-card p-4 sm:p-5 min-h-[320px]">
          {filteredExpenses.length > 0 ? (
            <div className="divide-y divide-[var(--card-border)]/65">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0 group">
                  <div className="size-11 rounded-xl bg-[var(--foreground)]/[0.04] flex items-center justify-center shrink-0 border border-[var(--card-border)]">
                    <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">
                      {CATEGORY_ICONS[expense.category] || "payments"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[14px] text-[var(--foreground)] truncate">
                          {expense.merchant}
                        </h3>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate">
                          {expense.description}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-display font-semibold text-[14px] text-[var(--foreground)]">
                          {formatCurrency(expense.amount, currency)}
                        </p>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">
                          {formatDisplayDate(expense.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-2.5 pt-2 border-t border-[var(--card-border)]/35">
                      <div className="flex items-center gap-2">
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
                          aria-label={`Edit expense`}
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id, expense.merchant)}
                          className="size-7 flex items-center justify-center rounded-full text-[var(--foreground)]/30 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-smooth"
                          aria-label={`Delete expense`}
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {expense.notes && (
                      <p className="mt-2 text-[11px] italic text-[var(--muted)] bg-[var(--foreground)]/[0.015] p-2 rounded-lg border border-[var(--card-border)]/30">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-[42px] text-[var(--foreground)]/10 mb-3 block">receipt_long</span>
              <AnimatedText as="p" text="No expenses found" effect="per-word-crossfade" className="text-[13px] text-[var(--muted)] font-medium" />
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button aria-label="Close modal" className="absolute inset-0 bg-[var(--foreground)]/25 backdrop-blur-sm" onClick={closeModal} />
          <div className="modal-surface relative max-w-lg p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <AnimatedText
                as="h2"
                text={editingExpenseId ? "Edit Expense" : "Add Expense"}
                effect="fade-through"
                className="text-xl font-semibold text-[var(--foreground)] font-display"
                replayKey={editingExpenseId ? "Edit Expense" : "Add Expense"}
              />
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full hover:bg-[var(--foreground)]/[0.04] transition-smooth">
                <span className="material-symbols-outlined text-[18px] text-[var(--muted)]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="expense-merchant">Merchant</label>
                  <input
                    id="expense-merchant"
                    required
                    value={form.merchant}
                    onChange={(event) => setForm({ ...form, merchant: event.target.value })}
                    placeholder="e.g. Stripe, AWS, Cafe, etc."
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="expense-category">Category</label>
                  <select
                    id="expense-category"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as Expense["category"] })}
                    className="field-control px-3 py-2"
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="expense-description">Description</label>
                <input
                  id="expense-description"
                  required
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="e.g. Monthly server billing, Client lunch, etc."
                  className="field-control px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="expense-amount">Amount ({currency})</label>
                  <input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.amount || ""}
                    onChange={(event) => setForm({ ...form, amount: parseFloat(event.target.value) || 0 })}
                    placeholder="0.00"
                    className="field-control px-3 py-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="expense-date">Date</label>
                  <input
                    id="expense-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) => setForm({ ...form, date: event.target.value })}
                    className="field-control px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  id="expense-deductible"
                  type="checkbox"
                  checked={form.isTaxDeductible}
                  onChange={(event) => setForm({ ...form, isTaxDeductible: event.target.checked })}
                  className="size-4 rounded accent-[var(--action)]"
                />
                <label className="text-[12px] font-semibold text-[var(--foreground)] select-none cursor-pointer" htmlFor="expense-deductible">
                  Tax deductible business expense
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--muted)] tracking-wider uppercase" htmlFor="expense-notes">Notes</label>
                <textarea
                  id="expense-notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  placeholder="Additional tax info or transaction records..."
                  className="field-control min-h-20 px-3 py-2 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary active:scale-[0.97]" disabled={isSaving}>
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

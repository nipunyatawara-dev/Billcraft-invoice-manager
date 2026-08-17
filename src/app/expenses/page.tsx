"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { ExpenseFormModal, type ExpenseForm } from "./components/ExpenseFormModal";
import { ModalOverlay } from "@/components/workspace-form-modal";
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
import { Reveal } from "@/components/reveal";


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
        <Reveal phase="header" className="mb-10">
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
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
        </Reveal>

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

        <Reveal phase="section">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4 min-w-0">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-card text-card-foreground border border-card-border rounded-xl p-4 sm:p-5 flex flex-col justify-between group relative hover-row min-w-0 overflow-hidden"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2.5 min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-9 rounded-xl bg-foreground/[0.04] flex items-center justify-center border border-card-border shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-muted">
                          {CATEGORY_ICONS[expense.category] || "payments"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[13px] text-foreground truncate group-hover:text-accent transition-smooth" title={expense.merchant}>
                          {expense.merchant}
                        </h3>
                        <p className="text-[10px] text-muted mt-0.5 font-medium truncate">
                          {formatDisplayDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-0 max-w-[45%]">
                      <p className="font-display font-semibold text-[14px] text-foreground truncate block" title={formatCurrency(expense.amount, currency)}>
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
          <div className="surface-card p-5 text-center py-16">
            <span className="material-symbols-outlined text-[42px] text-foreground/10 mb-3 block">receipt_long</span>
            <AnimatedText as="p" text="No expenses found" effect="per-word-crossfade" className="text-[13px] text-muted font-medium" />
          </div>
        )}
        </Reveal>
      </main>

      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <ExpenseFormModal
            isEditing={Boolean(editingExpenseId)}
            form={form}
            setForm={setForm}
            currency={currency}
            isSaving={isSaving}
            closeModal={closeModal}
            onSubmit={handleSaveExpense}
          />
        </ModalOverlay>
      )}
    </>
  );
}

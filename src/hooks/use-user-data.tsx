"use client";
 
import {
  createAvatar,
  formatCurrency,
  formatDisplayDate,
  getInvoiceItemsTotal,
  getStatusColor,
  type AnalyticsPreferences,
  type Client,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoiceWorkflowStatus,
  type OutsourcingInvoice,
  type PaymentAttachment,
  type PaymentRecord,
  type UserProfile,
  type Vendor,
  type Expense,
  type CatalogItem,
  type TrashItem,
} from "@/data/invoices";
import type { TodoTask } from "@/data/todos";
import { useCurrency } from "@/hooks/use-currency";
import { exportInvoicePdf, exportOutsourcingInvoicePdf } from "@/lib/pdf-export";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
 
const ACTIVE_PROFILE_KEY = "billcraft.active-profile.v1";
 
type LocalDataSnapshot = {
  profiles: UserProfile[];
  activeProfileId: string | null;
  activeProfile: UserProfile | null;
  clients: Client[];
  invoices: Invoice[];
  vendors: Vendor[];
  outsourcingInvoices: OutsourcingInvoice[];
  todoTasks: TodoTask[];
  expenses: Expense[];
  catalogItems: CatalogItem[];
  trash: TrashItem[];
  userDataPath: string;
};
 
export type ProfileDraft = {
  name: string;
  profession: string;
  email?: string;
  phone?: string;
  businessName?: string;
  defaultDeliveryLink?: string;
  profilePic?: string;
  signature?: string;
  password?: string;
  passwordHint?: string;
};
 
export type ClientDraft = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  address?: string;
  deliveryLink?: string;
  avatar?: string;
  notes?: string;
};
 
export type VendorDraft = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  avatar?: string;
  notes?: string;
};
 
export type InvoiceDraft = {
  id?: string;
  clientId?: string;
  client: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  address?: string;
  deliveryLink?: string;
  avatar?: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  workflowStatus?: InvoiceWorkflowStatus;
  templateId: string;
  templateName: string;
  items: InvoiceItem[];
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  receiptAttachments?: PaymentAttachment[];
  payments?: PaymentRecord[];
  saveClientMode?: "regular" | "onetime";
  currency?: string;
  discount?: number;
  paymentLink?: string;
};
 
export type OutsourcingInvoiceDraft = {
  id?: string;
  vendorId?: string;
  vendor: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  avatar?: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  templateId: string;
  templateName: string;
  items: InvoiceItem[];
  amountPaid?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  receiptAttachments?: PaymentAttachment[];
  payments?: PaymentRecord[];
  saveVendorMode?: "regular" | "onetime";
};
 
export type ProfilePasswordDraft = {
  currentPassword?: string;
  password: string;
};
 
export type ProfilePasswordHintDraft = {
  currentPassword?: string;
  passwordHint?: string;
};
 
type UserDataContextValue = LocalDataSnapshot & {
  loading: boolean;
  error: string | null;
  isProfileLocked: boolean;
  createProfile: (profile: ProfileDraft) => Promise<UserProfile | null>;
  updateProfile: (profile: ProfileDraft) => Promise<void>;
  switchProfile: (profileId: string, password?: string) => Promise<void>;
  unlockProfile: (profileId: string, password: string) => Promise<void>;
  logoutProfile: () => void;
  verifyProfilePassword: (profileId: string, password: string) => Promise<void>;
  changeProfilePassword: (password: ProfilePasswordDraft) => Promise<void>;
  updateProfilePasswordHint: (hint: ProfilePasswordHintDraft) => Promise<void>;
  deleteProfile: () => Promise<void>;
  deleteAllProfiles: () => Promise<void>;
  deleteInvoices: (invoiceIds: string[]) => Promise<void>;
  updateInvoicesStatus: (invoiceIds: string[], status: InvoiceStatus, workflowStatus?: InvoiceWorkflowStatus) => Promise<void>;
  restoreInvoices: (invoiceIds: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  saveClient: (originalClientId: string | null, client: ClientDraft) => Promise<Client | null>;
  saveInvoice: (invoice: InvoiceDraft) => Promise<Invoice | null>;
  saveVendor: (originalVendorId: string | null, vendor: VendorDraft) => Promise<Vendor | null>;
  saveOutsourcingInvoice: (invoice: OutsourcingInvoiceDraft) => Promise<OutsourcingInvoice | null>;
  saveAnalyticsPreferences: (preferences: AnalyticsPreferences) => Promise<AnalyticsPreferences | null>;
  markProfileBackedUp: () => Promise<UserProfile | null>;
  saveTodoTasks: (tasks: TodoTask[]) => Promise<TodoTask[]>;
  saveExpense: (expense: Expense) => Promise<Expense | null>;
  deleteExpense: (expenseId: string) => Promise<void>;
  saveCatalogItem: (item: CatalogItem) => Promise<CatalogItem | null>;
  deleteCatalogItem: (itemId: string) => Promise<void>;
  exportInvoice: (invoice: Invoice) => Promise<void>;
  exportOutsourcingInvoice: (invoice: OutsourcingInvoice) => Promise<void>;
  refresh: () => Promise<void>;
};
 
const EMPTY_SNAPSHOT: LocalDataSnapshot = {
  profiles: [],
  activeProfileId: null,
  activeProfile: null,
  clients: [],
  invoices: [],
  vendors: [],
  outsourcingInvoices: [],
  todoTasks: [],
  expenses: [],
  catalogItems: [],
  trash: [],
  userDataPath: "",
};
 
const UserDataContext = createContext<UserDataContextValue | null>(null);
 
function readActiveProfileId() {
  if (typeof window === "undefined") {
    return null;
  }
 
  return window.localStorage.getItem(ACTIVE_PROFILE_KEY);
}
 
function writeActiveProfileId(profileId: string | null) {
  if (typeof window === "undefined") {
    return;
  }
 
  if (profileId) {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
  } else {
    window.localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
}
 
function getNextInvoiceId(invoices: Invoice[]) {
  const highestNumber = invoices.reduce((highest, invoice) => {
    const parsed = Number(invoice.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);
 
  return `#INV-${String(highestNumber + 1).padStart(4, "0")}`;
}
 
function getNextOutsourcingInvoiceId(invoices: OutsourcingInvoice[]) {
  const highestNumber = invoices.reduce((highest, invoice) => {
    const parsed = Number(invoice.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);
 
  return `#OUT-${String(highestNumber + 1).padStart(4, "0")}`;
}
 
function normalizeLineItems(items: InvoiceItem[]) {
  return items
    .map((item, index) => ({
      id: item.id || `item-${Date.now().toString(36)}-${index}`,
      description: item.description.trim(),
      quantity: Number(item.quantity) || 0,
      price: Number(item.price) || 0,
    }))
    .filter((item) => item.description || item.quantity > 0 || item.price > 0);
}
 
function hydrateSnapshot(snapshot: LocalDataSnapshot): LocalDataSnapshot {
  return {
    ...snapshot,
    profiles: snapshot.profiles || [],
    activeProfileId: snapshot.activeProfileId || snapshot.activeProfile?.id || null,
    activeProfile: snapshot.activeProfile || null,
    clients: snapshot.clients || [],
    invoices: (snapshot.invoices || []).map((invoice) => ({
      ...invoice,
      statusColor: getStatusColor(invoice.status),
      clientColor: invoice.clientColor || "bg-[var(--foreground)]/10",
      avatar: invoice.avatar || createAvatar(invoice.client),
      items: invoice.items || [],
    })),
    vendors: snapshot.vendors || [],
    outsourcingInvoices: (snapshot.outsourcingInvoices || []).map((invoice) => ({
      ...invoice,
      statusColor: getStatusColor(invoice.status),
      vendorColor: invoice.vendorColor || "bg-[var(--foreground)]/10",
      avatar: invoice.avatar || createAvatar(invoice.vendor),
      items: invoice.items || [],
    })),
    todoTasks: snapshot.todoTasks || [],
    expenses: snapshot.expenses || [],
    catalogItems: snapshot.catalogItems || [],
    trash: snapshot.trash || [],
  };
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { currency } = useCurrency();
  const [snapshot, setSnapshot] = useState<LocalDataSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedProfileId, setUnlockedProfileId] = useState<string | null>(null);
  const isProfileLocked = Boolean(
    snapshot.activeProfileId &&
    snapshot.activeProfile?.hasPassword &&
    unlockedProfileId !== snapshot.activeProfileId,
  );

  const applySnapshot = useCallback((nextSnapshot: LocalDataSnapshot) => {
    const hydrated = hydrateSnapshot(nextSnapshot);
    setSnapshot(hydrated);
    writeActiveProfileId(hydrated.activeProfileId);
    return hydrated;
  }, []);

  const fetchSnapshot = useCallback(async (profileId?: string | null) => {
    const searchParams = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
    const response = await fetch(`/api/user-data${searchParams}`, { cache: "no-store" });

    if (!response.ok) {
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const body = isJson ? await response.json().catch(() => null) as { error?: string } | null : null;
      const fallback = response.status === 404
        ? "Local data route is unavailable. Restart the dev server and try again."
        : "Unable to load local user data.";

      throw new Error(body?.error || fallback);
    }

    return applySnapshot(await response.json() as LocalDataSnapshot);
  }, [applySnapshot]);

  const postAction = useCallback(async (body: unknown) => {
    const response = await fetch("/api/user-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const result = isJson ? await response.json().catch(() => null) as { error?: string } | null : null;
      const fallback = response.status === 404
        ? "Local data route is unavailable. Restart the dev server and try again."
        : "Unable to save local user data.";

      throw new Error(result?.error || fallback);
    }

    return applySnapshot(await response.json() as LocalDataSnapshot);
  }, [applySnapshot]);

  const refresh = useCallback(async () => {
    setError(null);
    await fetchSnapshot(readActiveProfileId());
  }, [fetchSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const nextSnapshot = await fetchSnapshot(readActiveProfileId());

        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load local data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [fetchSnapshot]);

  const createProfile = useCallback(async (profile: ProfileDraft) => {
    setError(null);
    try {
      const nextSnapshot = await postAction({ action: "createProfile", profile });
      setUnlockedProfileId(nextSnapshot.activeProfileId);
      return nextSnapshot.activeProfile;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to create profile.";
      setError(message);
      throw saveError;
    }
  }, [postAction]);

  const updateProfile = useCallback(async (profile: ProfileDraft) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({ action: "updateProfile", profileId: snapshot.activeProfileId, profile });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to update profile.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const switchProfile = useCallback(async (profileId: string, password?: string) => {
    setError(null);

    try {
      const targetProfile = snapshot.profiles.find((profile) => profile.id === profileId);

      if (targetProfile?.hasPassword) {
        const nextSnapshot = await postAction({ action: "verifyProfilePassword", profileId, password: password || "" });
        setUnlockedProfileId(nextSnapshot.activeProfileId);
        return;
      }

      setUnlockedProfileId(null);
      writeActiveProfileId(profileId);
      await fetchSnapshot(profileId);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to switch profile.";
      setError(message);
      throw saveError;
    }
  }, [fetchSnapshot, postAction, snapshot.profiles]);

  const unlockProfile = useCallback(async (profileId: string, password: string) => {
    setError(null);

    try {
      const nextSnapshot = await postAction({ action: "verifyProfilePassword", profileId, password });
      setUnlockedProfileId(nextSnapshot.activeProfileId);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to unlock profile.";
      setError(message);
      throw saveError;
    }
  }, [postAction]);

  const logoutProfile = useCallback(() => {
    setUnlockedProfileId(null);
    writeActiveProfileId(null);
    setSnapshot((current) => ({ ...current, activeProfileId: null }));
  }, []);

  const verifyProfilePassword = useCallback(async (profileId: string, password: string) => {
    setError(null);

    try {
      await postAction({ action: "verifyProfilePassword", profileId, password });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to verify password.";
      setError(message);
      throw saveError;
    }
  }, [postAction]);

  const changeProfilePassword = useCallback(async (password: ProfilePasswordDraft) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);

    try {
      const nextSnapshot = await postAction({
        action: "changeProfilePassword",
        profileId: snapshot.activeProfileId,
        password,
      });
      setUnlockedProfileId(nextSnapshot.activeProfileId);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to change password.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const updateProfilePasswordHint = useCallback(async (hint: ProfilePasswordHintDraft) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);

    try {
      const nextSnapshot = await postAction({
        action: "updateProfilePasswordHint",
        profileId: snapshot.activeProfileId,
        hint,
      });
      setUnlockedProfileId(nextSnapshot.activeProfileId);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to update password hint.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const deleteProfile = useCallback(async () => {
    if (!snapshot.activeProfileId) return;
    setError(null);
    try {
      await postAction({ action: "deleteProfile", profileId: snapshot.activeProfileId });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to delete profile.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const deleteAllProfiles = useCallback(async () => {
    setError(null);
    try {
      await postAction({ action: "deleteAllProfiles" });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to delete all profiles.";
      setError(message);
      throw saveError;
    }
  }, [postAction]);

  const saveClient = useCallback(async (originalClientId: string | null, client: ClientDraft) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    setError(null);
    const nextSnapshot = await postAction({
      action: "saveClient",
      profileId: snapshot.activeProfileId,
      originalClientId,
      client,
    });

    return nextSnapshot.clients.find((currentClient) => (
      currentClient.id === originalClientId ||
      currentClient.id === client.id ||
      currentClient.name === client.name.trim()
    )) || null;
  }, [postAction, snapshot.activeProfileId]);

  const saveInvoice = useCallback(async (draft: InvoiceDraft) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    const items = normalizeLineItems(draft.items);
    const subtotal = getInvoiceItemsTotal(items);
    const discount = Number(draft.discount) || 0;
    const total = Math.max(0, subtotal - discount);
    const activeCurrency = draft.currency || currency;
    const invoice: Invoice = {
      id: draft.id || getNextInvoiceId(snapshot.invoices),
      clientId: draft.clientId,
      client: draft.client.trim(),
      email: draft.email?.trim() || "",
      phone: draft.phone?.trim() || "",
      whatsapp: draft.whatsapp?.trim() || undefined,
      company: draft.company?.trim() || undefined,
      address: draft.address?.trim() || undefined,
      deliveryLink: draft.deliveryLink?.trim() || undefined,
      avatar: draft.avatar || createAvatar(draft.client.trim()),
      date: formatDisplayDate(draft.date),
      dueDate: draft.dueDate ? formatDisplayDate(draft.dueDate) : undefined,
      amount: formatCurrency(total, activeCurrency),
      subtotal,
      discount,
      total,
      currency: draft.currency || undefined,
      templateId: draft.templateId,
      templateName: draft.templateName,
      items,
      amountPaid: draft.amountPaid,
      paidAt: draft.paidAt,
      paymentMethod: draft.paymentMethod,
      paymentNotes: draft.paymentNotes,
      receiptAttachments: draft.receiptAttachments || [],
      payments: draft.payments || [],
      status: draft.status,
      workflowStatus: draft.workflowStatus || "Draft",
      statusColor: getStatusColor(draft.status),
      clientColor: "bg-[var(--foreground)]/10",
    };

    setError(null);

    const nextSnapshot = await postAction({
      action: "saveInvoice",
      profileId: snapshot.activeProfileId,
      invoice,
      clientSaveMode: draft.saveClientMode,
      client: draft.saveClientMode === "regular"
        ? {
          id: draft.clientId,
          name: draft.client,
          email: draft.email,
          phone: draft.phone,
          whatsapp: draft.whatsapp,
          company: draft.company,
          address: draft.address,
          deliveryLink: draft.deliveryLink,
          avatar: draft.avatar,
        }
        : undefined,
    });

    return nextSnapshot.invoices.find((currentInvoice) => currentInvoice.id === invoice.id) || invoice;
  }, [currency, postAction, snapshot.activeProfileId, snapshot.invoices]);

  const saveVendor = useCallback(async (originalVendorId: string | null, vendor: VendorDraft) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    setError(null);
    const nextSnapshot = await postAction({
      action: "saveVendor",
      profileId: snapshot.activeProfileId,
      originalVendorId,
      vendor,
    });

    return nextSnapshot.vendors.find((currentVendor) => (
      currentVendor.id === originalVendorId ||
      currentVendor.id === vendor.id ||
      currentVendor.name === vendor.name.trim()
    )) || null;
  }, [postAction, snapshot.activeProfileId]);

  const saveOutsourcingInvoice = useCallback(async (draft: OutsourcingInvoiceDraft) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    const items = normalizeLineItems(draft.items);
    const total = getInvoiceItemsTotal(items);
    const invoice: OutsourcingInvoice = {
      id: draft.id || getNextOutsourcingInvoiceId(snapshot.outsourcingInvoices),
      vendorId: draft.vendorId,
      vendor: draft.vendor.trim(),
      email: draft.email?.trim() || "",
      phone: draft.phone?.trim() || "",
      company: draft.company?.trim() || undefined,
      address: draft.address?.trim() || undefined,
      avatar: draft.avatar || createAvatar(draft.vendor.trim()),
      date: formatDisplayDate(draft.date),
      dueDate: draft.dueDate ? formatDisplayDate(draft.dueDate) : undefined,
      amount: formatCurrency(total, currency),
      subtotal: total,
      total,
      templateId: draft.templateId,
      templateName: draft.templateName,
      items,
      amountPaid: draft.amountPaid,
      paidAt: draft.paidAt,
      paymentMethod: draft.paymentMethod,
      paymentNotes: draft.paymentNotes,
      receiptAttachments: draft.receiptAttachments || [],
      payments: draft.payments || [],
      status: draft.status,
      statusColor: getStatusColor(draft.status),
      vendorColor: "bg-[var(--foreground)]/10",
    };

    setError(null);

    const nextSnapshot = await postAction({
      action: "saveOutsourcingInvoice",
      profileId: snapshot.activeProfileId,
      invoice,
      vendorSaveMode: draft.saveVendorMode,
      vendor: draft.saveVendorMode === "regular"
        ? {
          id: draft.vendorId,
          name: draft.vendor,
          email: draft.email,
          phone: draft.phone,
          company: draft.company,
          address: draft.address,
          avatar: draft.avatar,
        }
        : undefined,
    });

    return nextSnapshot.outsourcingInvoices.find((currentInvoice) => currentInvoice.id === invoice.id) || invoice;
  }, [currency, postAction, snapshot.activeProfileId, snapshot.outsourcingInvoices]);

  const saveTodoTasks = useCallback(async (tasks: TodoTask[]) => {
    if (!snapshot.activeProfileId) {
      return [];
    }

    setError(null);
    const nextSnapshot = await postAction({
      action: "saveTodoTasks",
      profileId: snapshot.activeProfileId,
      tasks,
    });

    return nextSnapshot.todoTasks;
  }, [postAction, snapshot.activeProfileId]);

  const saveAnalyticsPreferences = useCallback(async (preferences: AnalyticsPreferences) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    setError(null);
    const nextSnapshot = await postAction({
      action: "saveAnalyticsPreferences",
      profileId: snapshot.activeProfileId,
      preferences,
    });

    return nextSnapshot.activeProfile?.analyticsPreferences || preferences;
  }, [postAction, snapshot.activeProfileId]);

  const markProfileBackedUp = useCallback(async () => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    setError(null);
    const nextSnapshot = await postAction({
      action: "markProfileBackedUp",
      profileId: snapshot.activeProfileId,
    });

    return nextSnapshot.activeProfile;
  }, [postAction, snapshot.activeProfileId]);

  const exportInvoice = useCallback(async (invoice: Invoice) => {
    await exportInvoicePdf(invoice, snapshot.activeProfile, currency);
  }, [currency, snapshot.activeProfile]);

  const exportOutsourcingInvoice = useCallback(async (invoice: OutsourcingInvoice) => {
    await exportOutsourcingInvoicePdf(invoice, snapshot.activeProfile, currency);
  }, [currency, snapshot.activeProfile]);

  const deleteInvoices = useCallback(async (invoiceIds: string[]) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({
        action: "deleteInvoices",
        profileId: snapshot.activeProfileId,
        invoiceIds,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to delete invoices.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const updateInvoicesStatus = useCallback(async (
    invoiceIds: string[],
    status: InvoiceStatus,
    workflowStatus?: InvoiceWorkflowStatus
  ) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({
        action: "updateInvoicesStatus",
        profileId: snapshot.activeProfileId,
        invoiceIds,
        status,
        workflowStatus,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to update invoices status.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const restoreInvoices = useCallback(async (invoiceIds: string[]) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({
        action: "restoreInvoices",
        profileId: snapshot.activeProfileId,
        invoiceIds,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to restore invoices.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const emptyTrash = useCallback(async () => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({
        action: "emptyTrash",
        profileId: snapshot.activeProfileId,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to empty trash.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const saveExpense = useCallback(async (expense: Expense) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    setError(null);
    try {
      const nextSnapshot = await postAction({
        action: "saveExpense",
        profileId: snapshot.activeProfileId,
        expense,
      });

      return nextSnapshot.expenses.find((e) => e.id === expense.id) || expense;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save expense.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const deleteExpense = useCallback(async (expenseId: string) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({
        action: "deleteExpense",
        profileId: snapshot.activeProfileId,
        expenseId,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to delete expense.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const saveCatalogItem = useCallback(async (item: CatalogItem) => {
    if (!snapshot.activeProfileId) {
      return null;
    }

    setError(null);
    try {
      const nextSnapshot = await postAction({
        action: "saveCatalogItem",
        profileId: snapshot.activeProfileId,
        item,
      });

      return nextSnapshot.catalogItems.find((c) => c.id === item.id) || item;
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save catalog item.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const deleteCatalogItem = useCallback(async (itemId: string) => {
    if (!snapshot.activeProfileId) {
      return;
    }

    setError(null);
    try {
      await postAction({
        action: "deleteCatalogItem",
        profileId: snapshot.activeProfileId,
        itemId,
      });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to delete catalog item.";
      setError(message);
      throw saveError;
    }
  }, [postAction, snapshot.activeProfileId]);

  const value = useMemo<UserDataContextValue>(() => ({
    ...snapshot,
    loading,
    error,
    isProfileLocked,
    createProfile,
    updateProfile,
    switchProfile,
    unlockProfile,
    logoutProfile,
    verifyProfilePassword,
    changeProfilePassword,
    updateProfilePasswordHint,
    deleteProfile,
    deleteAllProfiles,
    deleteInvoices,
    updateInvoicesStatus,
    restoreInvoices,
    emptyTrash,
    saveClient,
    saveInvoice,
    saveVendor,
    saveOutsourcingInvoice,
    saveAnalyticsPreferences,
    markProfileBackedUp,
    saveTodoTasks,
    saveExpense,
    deleteExpense,
    saveCatalogItem,
    deleteCatalogItem,
    exportInvoice,
    exportOutsourcingInvoice,
    refresh,
  }), [
    changeProfilePassword,
    createProfile,
    error,
    exportInvoice,
    exportOutsourcingInvoice,
    isProfileLocked,
    loading,
    logoutProfile,
    markProfileBackedUp,
    refresh,
    saveClient,
    saveInvoice,
    saveOutsourcingInvoice,
    saveAnalyticsPreferences,
    saveTodoTasks,
    saveVendor,
    saveExpense,
    deleteExpense,
    saveCatalogItem,
    deleteCatalogItem,
    snapshot,
    switchProfile,
    deleteProfile,
    deleteAllProfiles,
    deleteInvoices,
    updateInvoicesStatus,
    restoreInvoices,
    emptyTrash,
    unlockProfile,
    updateProfile,
    updateProfilePasswordHint,
    verifyProfilePassword,
  ]);

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData() {
  const context = useContext(UserDataContext);

  if (!context) {
    throw new Error("useUserData must be used within UserDataProvider.");
  }

  return context;
}

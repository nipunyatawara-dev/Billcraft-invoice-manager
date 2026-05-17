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
  type OutsourcingInvoice,
  type UserProfile,
  type Vendor,
} from "@/data/invoices";
import type { TodoTask } from "@/data/todos";
import { useCurrency } from "@/hooks/use-currency";
import { exportInvoicePdf } from "@/lib/pdf-export";
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
  userDataPath: string;
};

export type ProfileDraft = {
  name: string;
  profession: string;
  email?: string;
  phone?: string;
  businessName?: string;
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
  company?: string;
  address?: string;
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
  company?: string;
  address?: string;
  avatar?: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  templateId: string;
  templateName: string;
  items: InvoiceItem[];
  saveClientMode?: "regular" | "onetime";
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
  createProfile: (profile: ProfileDraft) => Promise<void>;
  updateProfile: (profile: ProfileDraft) => Promise<void>;
  switchProfile: (profileId: string, password?: string) => Promise<void>;
  unlockProfile: (profileId: string, password: string) => Promise<void>;
  logoutProfile: () => void;
  verifyProfilePassword: (profileId: string, password: string) => Promise<void>;
  changeProfilePassword: (password: ProfilePasswordDraft) => Promise<void>;
  updateProfilePasswordHint: (hint: ProfilePasswordHintDraft) => Promise<void>;
  deleteProfile: () => Promise<void>;
  deleteAllProfiles: () => Promise<void>;
  saveClient: (originalClientId: string | null, client: ClientDraft) => Promise<Client | null>;
  saveInvoice: (invoice: InvoiceDraft) => Promise<Invoice | null>;
  saveVendor: (originalVendorId: string | null, vendor: VendorDraft) => Promise<Vendor | null>;
  saveOutsourcingInvoice: (invoice: OutsourcingInvoiceDraft) => Promise<OutsourcingInvoice | null>;
  saveAnalyticsPreferences: (preferences: AnalyticsPreferences) => Promise<AnalyticsPreferences | null>;
  saveTodoTasks: (tasks: TodoTask[]) => Promise<TodoTask[]>;
  exportInvoice: (invoice: Invoice) => Promise<void>;
  exportOutsourcingInvoice: (invoice: OutsourcingInvoice) => void;
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
    const total = getInvoiceItemsTotal(items);
    const invoice: Invoice = {
      id: draft.id || getNextInvoiceId(snapshot.invoices),
      clientId: draft.clientId,
      client: draft.client.trim(),
      email: draft.email?.trim() || "",
      phone: draft.phone?.trim() || "",
      company: draft.company?.trim() || undefined,
      address: draft.address?.trim() || undefined,
      avatar: draft.avatar || createAvatar(draft.client.trim()),
      date: formatDisplayDate(draft.date),
      dueDate: draft.dueDate ? formatDisplayDate(draft.dueDate) : undefined,
      amount: formatCurrency(total, currency),
      subtotal: total,
      total,
      templateId: draft.templateId,
      templateName: draft.templateName,
      items,
      status: draft.status,
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
          company: draft.company,
          address: draft.address,
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

  const exportInvoice = useCallback(async (invoice: Invoice) => {
    await exportInvoicePdf(invoice, snapshot.activeProfile, currency);
  }, [currency, snapshot.activeProfile]);

  const exportOutsourcingInvoice = useCallback((invoice: OutsourcingInvoice) => {
    const profile = snapshot.activeProfile;
    const lineItems = (invoice.items || []).map((item) => (
      `${item.description} | ${item.quantity} x ${formatCurrency(item.price, currency)} = ${formatCurrency(item.quantity * item.price, currency)}`
    ));
    const contents = [
      profile?.businessName || profile?.name || "BillCraft",
      profile?.profession ? `Profession: ${profile.profession}` : "",
      "",
      `Outsourcing Invoice: ${invoice.id}`,
      `Template: ${invoice.templateName || "Outsourcing Invoice"}`,
      `Pay To: ${invoice.vendor}`,
      `Email: ${invoice.email || "Not provided"}`,
      `Phone: ${invoice.phone || "Not provided"}`,
      `Date: ${invoice.date}`,
      invoice.dueDate ? `Due: ${invoice.dueDate}` : "",
      `Status: ${invoice.status}`,
      "",
      "Work",
      ...(lineItems.length > 0 ? lineItems : ["No line items"]),
      "",
      `Total Payable: ${formatCurrency(invoice.total || getInvoiceItemsTotal(invoice.items), currency)}`,
    ].filter(Boolean).join("\n");
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${invoice.id.replace("#", "")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currency, snapshot.activeProfile]);

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
    saveClient,
    saveInvoice,
    saveVendor,
    saveOutsourcingInvoice,
    saveAnalyticsPreferences,
    saveTodoTasks,
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
    refresh,
    saveClient,
    saveInvoice,
    saveOutsourcingInvoice,
    saveAnalyticsPreferences,
    saveTodoTasks,
    saveVendor,
    snapshot,
    switchProfile,
    deleteProfile,
    deleteAllProfiles,
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

"use client";

import {
  createAvatar,
  formatCurrency,
  formatDisplayDate,
  getInvoiceItemsTotal,
  getStatusColor,
  type Client,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type UserProfile,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ACTIVE_PROFILE_KEY = "billcraft.active-profile.v1";

type LocalDataSnapshot = {
  profiles: UserProfile[];
  activeProfileId: string | null;
  activeProfile: UserProfile | null;
  clients: Client[];
  invoices: Invoice[];
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

type UserDataContextValue = LocalDataSnapshot & {
  loading: boolean;
  error: string | null;
  createProfile: (profile: ProfileDraft) => Promise<void>;
  updateProfile: (profile: ProfileDraft) => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  saveClient: (originalClientId: string | null, client: ClientDraft) => Promise<Client | null>;
  saveInvoice: (invoice: InvoiceDraft) => Promise<Invoice | null>;
  exportInvoice: (invoice: Invoice) => void;
  refresh: () => Promise<void>;
};

const EMPTY_SNAPSHOT: LocalDataSnapshot = {
  profiles: [],
  activeProfileId: null,
  activeProfile: null,
  clients: [],
  invoices: [],
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
  };
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { currency } = useCurrency();
  const [snapshot, setSnapshot] = useState<LocalDataSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error || "Unable to load local user data.");
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
      const result = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(result?.error || "Unable to save local user data.");
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
      await postAction({ action: "createProfile", profile });
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

  const switchProfile = useCallback(async (profileId: string) => {
    setError(null);
    writeActiveProfileId(profileId);
    await fetchSnapshot(profileId);
  }, [fetchSnapshot]);

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

  const exportInvoice = useCallback((invoice: Invoice) => {
    const profile = snapshot.activeProfile;
    const lineItems = (invoice.items || []).map((item) => (
      `${item.description} | ${item.quantity} x ${formatCurrency(item.price, currency)} = ${formatCurrency(item.quantity * item.price, currency)}`
    ));
    const contents = [
      profile?.businessName || profile?.name || "BillCraft",
      profile?.profession ? `Profession: ${profile.profession}` : "",
      "",
      `Invoice: ${invoice.id}`,
      `Template: ${invoice.templateName || "Classic Invoice"}`,
      `Client: ${invoice.client}`,
      `Email: ${invoice.email || "Not provided"}`,
      `Phone: ${invoice.phone || "Not provided"}`,
      `Date: ${invoice.date}`,
      invoice.dueDate ? `Due: ${invoice.dueDate}` : "",
      `Status: ${invoice.status}`,
      "",
      "Work",
      ...(lineItems.length > 0 ? lineItems : ["No line items"]),
      "",
      `Total: ${formatCurrency(invoice.total || getInvoiceItemsTotal(invoice.items), currency)}`,
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
    createProfile,
    updateProfile,
    switchProfile,
    saveClient,
    saveInvoice,
    exportInvoice,
    refresh,
  }), [
    createProfile,
    error,
    exportInvoice,
    loading,
    refresh,
    saveClient,
    saveInvoice,
    snapshot,
    switchProfile,
    updateProfile,
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

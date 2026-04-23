"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAvatar,
  formatCurrency,
  formatDisplayDate,
  getStatusColor,
  INVOICES,
  parseInvoiceAmount,
  type Client,
  type Invoice,
  type InvoiceStatus,
} from "@/data/invoices";
import { useCurrency } from "@/hooks/use-currency";

const STORAGE_KEY = "billcraft.invoices.v1";
const CLIENT_STORAGE_KEY = "billcraft.clients.v1";

type InvoiceDraft = {
  id?: string;
  client: string;
  email: string;
  phone: string;
  date: string;
  amount: string;
  status: InvoiceStatus;
  avatar?: string;
};

function normalizeAmount(amount: string, currency: string) {
  const numericAmount = Number(amount.replace(/[$,]/g, ""));
  return formatCurrency(Number.isFinite(numericAmount) ? numericAmount : 0, currency);
}

function getNextInvoiceId(invoices: Invoice[]) {
  const highestNumber = invoices.reduce((highest, invoice) => {
    const parsed = Number(invoice.id.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);

  return `#INV-${String(highestNumber + 1).padStart(4, "0")}`;
}

function hydrateInvoice(invoice: Invoice): Invoice {
  return {
    ...invoice,
    statusColor: getStatusColor(invoice.status),
    clientColor: invoice.clientColor || "bg-[#212842]/10",
    avatar: invoice.avatar || createAvatar(invoice.client),
  };
}

export function useInvoices() {
  const { currency } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>(INVOICES);
  const [clientRecords, setClientRecords] = useState<Client[]>([]);

  useEffect(() => {
    const loadStoredData = window.setTimeout(() => {
      const storedInvoices = window.localStorage.getItem(STORAGE_KEY);
      const storedClients = window.localStorage.getItem(CLIENT_STORAGE_KEY);

      if (storedInvoices) {
        try {
          const parsedInvoices = JSON.parse(storedInvoices) as Invoice[];
          setInvoices(parsedInvoices.map(hydrateInvoice));
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      if (storedClients) {
        try {
          const parsedClients = JSON.parse(storedClients) as Client[];
          setClientRecords(parsedClients);
        } catch {
          window.localStorage.removeItem(CLIENT_STORAGE_KEY);
        }
      }
    }, 0);

    return () => window.clearTimeout(loadStoredData);
  }, []);

  const persistInvoices = useCallback((nextInvoices: Invoice[]) => {
    setInvoices(nextInvoices);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextInvoices));
  }, []);

  const persistClients = useCallback((nextClients: Client[]) => {
    setClientRecords(nextClients);
    window.localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(nextClients));
  }, []);

  const saveInvoice = useCallback((draft: InvoiceDraft) => {
    const matchingClient = clientRecords.find((client) => client.name === draft.client.trim());
    const invoice: Invoice = hydrateInvoice({
      id: draft.id || getNextInvoiceId(invoices),
      client: draft.client.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      avatar: draft.avatar || matchingClient?.avatar || createAvatar(draft.client.trim()),
      date: formatDisplayDate(draft.date),
      amount: normalizeAmount(draft.amount, currency),
      status: draft.status,
      statusColor: getStatusColor(draft.status),
      clientColor: "bg-[#212842]/10",
    });

    const nextInvoices = draft.id
      ? invoices.map((currentInvoice) => currentInvoice.id === draft.id ? invoice : currentInvoice)
      : [invoice, ...invoices];

    persistInvoices(nextInvoices);
    return invoice;
  }, [clientRecords, currency, invoices, persistInvoices]);

  const saveClient = useCallback((originalName: string | null, client: Pick<Invoice, "client" | "email" | "phone"> & { avatar?: string; company?: string }) => {
    const trimmedClient = {
      name: client.client.trim(),
      email: client.email.trim(),
      phone: client.phone.trim(),
      company: client.company?.trim(),
      avatar: client.avatar,
    };

    const matchingName = originalName || trimmedClient.name;
    const matchingInvoices = invoices.filter((invoice) => invoice.client === matchingName);
    const savedClientExists = clientRecords.some((currentClient) => currentClient.name === matchingName);

    if (matchingInvoices.length > 0) {
      const nextInvoices = invoices.map((invoice) => {
        if (invoice.client !== matchingName) {
          return invoice;
        }

        return hydrateInvoice({
          ...invoice,
          client: trimmedClient.name,
          email: trimmedClient.email,
          phone: trimmedClient.phone,
          avatar: trimmedClient.avatar || invoice.avatar || createAvatar(trimmedClient.name),
        });
      });

      persistInvoices(nextInvoices);
    }

    const savedClient: Client = {
      name: trimmedClient.name,
      email: trimmedClient.email,
      phone: trimmedClient.phone,
      company: trimmedClient.company,
      avatar: trimmedClient.avatar || createAvatar(trimmedClient.name),
    };
    const nextClients = savedClientExists
      ? clientRecords.map((currentClient) => currentClient.name === matchingName ? savedClient : currentClient)
      : [savedClient, ...clientRecords];

    persistClients(nextClients);
  }, [clientRecords, invoices, persistClients, persistInvoices]);

  const exportInvoice = useCallback((invoice: Invoice) => {
    const contents = [
      "BillCraft Invoice",
      invoice.id,
      "",
      `Client: ${invoice.client}`,
      `Email: ${invoice.email}`,
      `Phone: ${invoice.phone}`,
      `Date: ${invoice.date}`,
      `Status: ${invoice.status}`,
      `Amount: ${formatCurrency(parseInvoiceAmount(invoice.amount), currency)}`,
    ].join("\n");
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${invoice.id.replace("#", "")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [currency]);

  const resetInvoices = useCallback(() => {
    persistInvoices(INVOICES);
    persistClients([]);
  }, [persistClients, persistInvoices]);

  return useMemo(() => ({
    invoices,
    saveInvoice,
    clientRecords,
    saveClient,
    exportInvoice,
    resetInvoices,
  }), [clientRecords, exportInvoice, invoices, resetInvoices, saveClient, saveInvoice]);
}

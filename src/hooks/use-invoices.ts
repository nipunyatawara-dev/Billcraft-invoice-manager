"use client";

import { useUserData } from "@/hooks/use-user-data";

export function useInvoices() {
  const userData = useUserData();

  return {
    invoices: userData.invoices,
    clientRecords: userData.clients,
    saveInvoice: userData.saveInvoice,
    saveClient: userData.saveClient,
    exportInvoice: userData.exportInvoice,
    deleteInvoices: userData.deleteInvoices,
    updateInvoicesStatus: userData.updateInvoicesStatus,
    resetInvoices: userData.refresh,
  };
}

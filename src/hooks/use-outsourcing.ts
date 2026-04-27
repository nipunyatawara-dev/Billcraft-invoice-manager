"use client";

import { useUserData } from "@/hooks/use-user-data";

export function useOutsourcing() {
  const userData = useUserData();

  return {
    vendors: userData.vendors,
    outsourcingInvoices: userData.outsourcingInvoices,
    saveVendor: userData.saveVendor,
    saveOutsourcingInvoice: userData.saveOutsourcingInvoice,
    exportOutsourcingInvoice: userData.exportOutsourcingInvoice,
    refresh: userData.refresh,
  };
}

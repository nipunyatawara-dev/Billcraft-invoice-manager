import { useMemo } from "react";
import { getBalanceDue, isRecordOverdue } from "@/data/invoices";
import { type Profile, type Client, type Invoice, type Vendor, type OutsourcingInvoice, type TodoTask } from "@/hooks/use-user-data";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getTimeValue(value?: string) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export type BillingNotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "warning" | "info";
};

interface UseBillingAlertsProps {
  activeProfile: Profile | null;
  clients: Client[];
  invoices: Invoice[];
  outsourcingInvoices: OutsourcingInvoice[];
  todoTasks: TodoTask[];
  vendors: Vendor[];
}

export function useBillingAlerts({
  activeProfile,
  clients,
  invoices,
  outsourcingInvoices,
  todoTasks,
  vendors,
}: UseBillingAlertsProps) {
  const notificationItems = useMemo(() => {
    const items: BillingNotificationItem[] = [];

    for (const invoice of invoices.filter(isRecordOverdue)) {
      items.push({
        id: `overdue-${invoice.id}`,
        title: `${invoice.client} · ${invoice.id}`,
        description: "Overdue client invoice — follow up on payment",
        href: `/invoices?id=${encodeURIComponent(invoice.id)}`,
        tone: "warning",
      });
    }

    for (const task of todoTasks.filter((entry) => entry.stage !== "done" && entry.dueDate === todayKey())) {
      items.push({
        id: `task-${task.id}`,
        title: task.title,
        description: task.client ? `Due today · ${task.client}` : "Due today",
        href: `/todo?id=${encodeURIComponent(task.id)}`,
        tone: "info",
      });
    }

    const latestProfileDataTime = Math.max(
      getTimeValue(activeProfile?.updatedAt),
      ...clients.map((client) => getTimeValue(client.updatedAt || client.createdAt)),
      ...invoices.map((invoice) => getTimeValue(invoice.updatedAt || invoice.createdAt)),
      ...vendors.map((vendor) => getTimeValue(vendor.updatedAt || vendor.createdAt)),
      ...outsourcingInvoices.map((invoice) => getTimeValue(invoice.updatedAt || invoice.createdAt)),
      ...todoTasks.map((task) => getTimeValue(task.updatedAt || task.createdAt)),
    );
    const hasProfileData =
      clients.length + invoices.length + vendors.length + outsourcingInvoices.length + todoTasks.length > 0;
    const profileNeedsBackup = Boolean(
      activeProfile &&
      hasProfileData &&
      (!activeProfile.lastBackupAt || getTimeValue(activeProfile.lastBackupAt) < latestProfileDataTime),
    );

    if (profileNeedsBackup) {
      items.push({
        id: "backup-due",
        title: "Profile backup due",
        description: "Export the latest local data from Settings",
        href: "/settings?tab=data",
        tone: "info",
      });
    }

    for (const invoice of outsourcingInvoices.filter((entry) => getBalanceDue(entry) > 0)) {
      items.push({
        id: `payable-${invoice.id}`,
        title: `${invoice.vendor} · ${invoice.id}`,
        description: "Unpaid vendor payable",
        href: `/outsourcing?id=${encodeURIComponent(invoice.id)}`,
        tone: "warning",
      });
    }

    return items;
  }, [activeProfile, clients, invoices, outsourcingInvoices, todoTasks, vendors]);

  const alertCount = notificationItems.length;

  return { notificationItems, alertCount };
}

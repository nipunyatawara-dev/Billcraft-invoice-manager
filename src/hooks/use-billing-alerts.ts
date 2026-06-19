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
  const activeAlerts = useMemo(() => {
    const overdueInvoices = invoices.filter(isRecordOverdue);
    const tasksDueToday = todoTasks.filter((task) => task.stage !== "done" && task.dueDate === todayKey());
    const unpaidVendorInvoices = outsourcingInvoices.filter((invoice) => getBalanceDue(invoice) > 0);
    const latestProfileDataTime = Math.max(
      getTimeValue(activeProfile?.updatedAt),
      ...clients.map((client) => getTimeValue(client.updatedAt || client.createdAt)),
      ...invoices.map((invoice) => getTimeValue(invoice.updatedAt || invoice.createdAt)),
      ...vendors.map((vendor) => getTimeValue(vendor.updatedAt || vendor.createdAt)),
      ...outsourcingInvoices.map((invoice) => getTimeValue(invoice.updatedAt || invoice.createdAt)),
      ...todoTasks.map((task) => getTimeValue(task.updatedAt || task.createdAt)),
    );
    const hasProfileData = clients.length + invoices.length + vendors.length + outsourcingInvoices.length + todoTasks.length > 0;
    const profileNeedsBackup = Boolean(
      activeProfile &&
      hasProfileData &&
      (!activeProfile.lastBackupAt || getTimeValue(activeProfile.lastBackupAt) < latestProfileDataTime),
    );

    return [
      overdueInvoices.length > 0
        ? { icon: "warning", label: "Overdue invoices", count: overdueInvoices.length, detail: "Client invoices need follow-up." }
        : null,
      tasksDueToday.length > 0
        ? { icon: "event", label: "Tasks due today", count: tasksDueToday.length, detail: "To-do items are due today." }
        : null,
      profileNeedsBackup
        ? { icon: "backup", label: "Profile backup due", count: 1, detail: "Export the latest local data from Settings." }
        : null,
      unpaidVendorInvoices.length > 0
        ? { icon: "engineering", label: "Unpaid vendor invoices", count: unpaidVendorInvoices.length, detail: "Outsourcing payables still have a balance." }
        : null,
    ].filter(Boolean) as Array<{ icon: string; label: string; count: number; detail: string }>;
  }, [activeProfile, clients, invoices, outsourcingInvoices, todoTasks, vendors]);

  const alertCount = activeAlerts.reduce((sum, alert) => sum + alert.count, 0);

  return { activeAlerts, alertCount };
}

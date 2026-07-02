import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useUserData } from "@/hooks/use-user-data";
import { getBackupSummary, parseBackupFile, type BillCraftBackup, type ImportMode } from "@/lib/backup-restore";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";
import {
  Database, User, Users, FileText, Store, CheckCircle2, FileSpreadsheet,
  Download, Lock, Upload, ArchiveRestore, AlertTriangle, Package, Receipt, BookOpen,
} from "lucide-react";

type ExportRow = Record<string, string | number | null | undefined>;
type SecurityAction = "export-json" | "export-csv" | "restore";

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: ExportRow[]) {
  const columns = [
    "category", "id", "name", "email", "phone", "company", "date", "dueDate",
    "status", "total", "amountPaid", "balanceDue", "paidAt", "paymentMethod",
    "priority", "stage", "createdAt", "updatedAt", "details",
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")),
  ].join("\n");
}

function downloadFile(fileName: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function fileSafeName(value?: string | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "billcraft-data";
}

function formatBackupDate(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export function DataTab() {
  const {
    activeProfile, activeProfileId, profiles, clients, invoices, vendors,
    outsourcingInvoices, todoTasks, expenses, catalogItems,
    verifyProfilePassword, markProfileBackedUp, exportProfileBackup, importProfileBackup, loading,
  } = useUserData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [securityAction, setSecurityAction] = useState<SecurityAction | null>(null);
  const [securityPassword, setSecurityPassword] = useState("");
  const [isSecurityBusy, setIsSecurityBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BillCraftBackup | null>(null);
  const [restoreMode, setRestoreMode] = useState<ImportMode>("replace");
  const [isRestoring, setIsRestoring] = useState(false);

  async function markCurrentExportBackedUp() {
    try {
      await markProfileBackedUp();
    } catch {
      notify.warning({
        title: "Backup marker not saved",
        description: "The export downloaded, but BillCraft could not update the backup reminder.",
      });
    }
  }

  async function downloadFullBackup() {
    const backup = await exportProfileBackup();
    downloadFile(
      `${fileSafeName(activeProfile?.businessName || activeProfile?.name)}-backup-${new Date().toISOString().slice(0, 10)}.json`,
      `${JSON.stringify(backup, null, 2)}\n`,
      "application/json;charset=utf-8",
    );
    await markCurrentExportBackedUp();
    notify.success({
      title: "Backup created",
      description: "Full profile backup downloaded with all data and assets.",
    });
  }

  async function downloadCsv() {
    const rows: ExportRow[] = [
      ...profiles.map((profile) => ({
        category: "profile", id: profile.id, name: profile.name, email: profile.email, phone: profile.phone,
        company: profile.businessName, createdAt: profile.createdAt, updatedAt: profile.updatedAt,
        details: [profile.profession, profile.defaultDeliveryLink].filter(Boolean).join(" | "),
      })),
      ...clients.map((client) => ({
        category: "client", id: client.id, name: client.name, email: client.email, phone: client.phone,
        company: client.company, createdAt: client.createdAt, updatedAt: client.updatedAt,
        details: [client.notes, client.address, client.whatsapp, client.deliveryLink].filter(Boolean).join(" | "),
      })),
      ...invoices.map((invoice) => ({
        category: "invoice", id: invoice.id, name: invoice.client, email: invoice.email, phone: invoice.phone,
        company: invoice.company, date: invoice.date, dueDate: invoice.dueDate, status: invoice.status,
        total: invoice.total, amountPaid: invoice.amountPaid, balanceDue: Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0),
        paidAt: invoice.paidAt, paymentMethod: invoice.paymentMethod, createdAt: invoice.createdAt, updatedAt: invoice.updatedAt,
        details: [
          invoice.paymentNotes,
          (invoice.payments || []).map((payment) => `${payment.paidAt}: ${payment.amount} via ${payment.method}`).join("; "),
          (invoice.items || []).map((item) => `${item.description}: ${item.quantity} x ${item.price}`).join("; "),
        ].filter(Boolean).join(" | "),
      })),
      ...vendors.map((vendor) => ({
        category: "vendor", id: vendor.id, name: vendor.name, email: vendor.email, phone: vendor.phone,
        company: vendor.company, createdAt: vendor.createdAt, updatedAt: vendor.updatedAt,
        details: vendor.notes || vendor.address,
      })),
      ...outsourcingInvoices.map((invoice) => ({
        category: "outsourcing invoice", id: invoice.id, name: invoice.vendor, email: invoice.email, phone: invoice.phone,
        company: invoice.company, date: invoice.date, dueDate: invoice.dueDate, status: invoice.status,
        total: invoice.total, amountPaid: invoice.amountPaid, balanceDue: Math.max((invoice.total || 0) - (invoice.amountPaid || 0), 0),
        paidAt: invoice.paidAt, paymentMethod: invoice.paymentMethod, createdAt: invoice.createdAt, updatedAt: invoice.updatedAt,
        details: [
          invoice.paymentNotes,
          (invoice.payments || []).map((payment) => `${payment.paidAt}: ${payment.amount} via ${payment.method}`).join("; "),
          (invoice.items || []).map((item) => `${item.description}: ${item.quantity} x ${item.price}`).join("; "),
        ].filter(Boolean).join(" | "),
      })),
      ...todoTasks.map((task) => ({
        category: "todo", id: task.id, name: task.title, date: task.dueDate, priority: task.priority,
        stage: task.stage, createdAt: task.createdAt, updatedAt: task.updatedAt,
        details: [task.description, task.client, task.estimate, ...(task.tags || [])].filter(Boolean).join("; "),
      })),
      ...expenses.map((expense) => ({
        category: "expense", id: expense.id, name: expense.description, date: expense.date,
        total: expense.amount, company: expense.merchant, status: expense.category,
        createdAt: expense.createdAt, updatedAt: expense.updatedAt,
        details: [expense.notes, expense.isTaxDeductible ? "tax deductible" : ""].filter(Boolean).join(" | "),
      })),
      ...catalogItems.map((item) => ({
        category: "catalog", id: item.id, name: item.name, total: item.defaultPrice,
        details: [item.description, item.unit].filter(Boolean).join(" | "),
        createdAt: item.createdAt, updatedAt: item.updatedAt,
      })),
    ];

    downloadFile(
      `${fileSafeName(activeProfile?.businessName || activeProfile?.name)}-${new Date().toISOString().slice(0, 10)}.csv`,
      `${toCsv(rows)}\n`,
      "text/csv;charset=utf-8",
    );
    await markCurrentExportBackedUp();
    notify.success({ title: "Data exported", description: "CSV file is ready in your downloads." });
  }

  function requestSecurityAction(action: SecurityAction) {
    if (!activeProfile?.hasPassword || !activeProfileId) {
      if (action === "export-json") void downloadFullBackup();
      else if (action === "export-csv") void downloadCsv();
      else if (action === "restore" && pendingRestore) void confirmRestore(pendingRestore, restoreMode);
      return;
    }

    setSecurityAction(action);
    setSecurityPassword("");
  }

  async function handleConfirmSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!securityAction || !activeProfileId || isSecurityBusy) return;

    setIsSecurityBusy(true);
    try {
      await notifyPromise(verifyProfilePassword(activeProfileId, securityPassword), {
        loading: { title: "Checking password...", description: "Verifying before continuing." },
        success: { title: "Password accepted", description: "Continuing with your request." },
        error: (error) => ({ title: "Action blocked", description: getToastErrorMessage(error, "Incorrect password.") }),
      });

      if (securityAction === "export-json") await downloadFullBackup();
      else if (securityAction === "export-csv") await downloadCsv();
      else if (securityAction === "restore" && pendingRestore) await confirmRestore(pendingRestore, restoreMode);

      setSecurityAction(null);
      setSecurityPassword("");
    } finally {
      setIsSecurityBusy(false);
    }
  }

  async function handleBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBackupFile(JSON.parse(text));
      setPendingRestore(parsed);
      setRestoreMode("replace");
    } catch (error) {
      notify.error({
        title: "Invalid backup file",
        description: getToastErrorMessage(error, "Choose a valid BillCraft JSON backup."),
      });
    }
  }

  async function confirmRestore(backup: BillCraftBackup, mode: ImportMode) {
    if (!activeProfileId || isRestoring) return;

    setIsRestoring(true);
    try {
      await notifyPromise(importProfileBackup(backup, mode), {
        loading: { title: "Restoring backup...", description: mode === "merge" ? "Merging records into your profile." : "Replacing profile data." },
        success: { title: "Backup restored", description: "Your profile data has been updated." },
        error: (error) => ({ title: "Restore failed", description: getToastErrorMessage(error, "Unable to restore backup.") }),
      });
      setPendingRestore(null);
    } finally {
      setIsRestoring(false);
    }
  }

  function startRestore() {
    if (!pendingRestore) return;
    requestSecurityAction("restore");
  }

  const restoreSummary = pendingRestore ? getBackupSummary(pendingRestore) : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-xl group">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djIwaC0ydi0yMEgzNHYyaDJoMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-br from-action/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="text-center sm:text-left">
            <AnimatedText as="p" text="System Storage" effect="micro-scale-fade" className="text-[11px] font-bold text-featured-text/50 tracking-widest uppercase mb-2" />
            <AnimatedText
              as="h2"
              text="Your Data Ownership"
              effect="micro-scale-fade"
              className="text-2xl sm:text-3xl font-bold text-featured-text font-display mb-2 tracking-tight"
              delayMs={70}
            />
            <p className="text-[14px] text-featured-text/70 font-medium max-w-xl">
              Create full backups with assets, restore anytime, and export spreadsheets when you need them. You fully own your BillCraft data.
            </p>
            {activeProfile?.lastBackupAt && (
              <p className="mt-3 text-[12px] text-featured-text/50 font-medium">
                Last backup: {formatBackupDate(activeProfile.lastBackupAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Profiles", value: profiles.length, icon: User },
          { label: "Clients", value: clients.length, icon: Users },
          { label: "Invoices", value: invoices.length, icon: FileText },
          { label: "Vendors", value: vendors.length, icon: Store },
          { label: "Tasks", value: todoTasks.length, icon: CheckCircle2 },
          { label: "Expenses", value: expenses.length, icon: Receipt },
          { label: "Catalog", value: catalogItems.length, icon: BookOpen },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <item.icon className="size-16" />
            </div>
            <div className="flex items-center gap-2 text-action mb-2">
              <item.icon className="size-4" />
            </div>
            <p className="text-[10px] font-bold text-muted tracking-wider uppercase">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-foreground font-display tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="surface-card p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group border border-card-border hover:border-action/30">
          <div>
            <div className="size-12 rounded-xl bg-action/10 text-action flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-action group-hover:text-action-text transition-all duration-300">
              <Database className="size-6" />
            </div>
            <h3 className="text-[18px] font-bold text-foreground tracking-tight mb-2">Full Backup</h3>
            <p className="text-[13px] text-muted leading-relaxed mb-6">
              Complete restore-ready snapshot including clients, invoices, expenses, catalog, trash, and embedded assets.
            </p>
          </div>

          <button
            type="button"
            onClick={() => requestSecurityAction("export-json")}
            disabled={loading || isSecurityBusy || !activeProfileId}
            className="w-full py-3 px-4 bg-foreground/[0.03] hover:bg-action hover:text-action-text text-foreground font-bold text-[13px] rounded-lg flex items-center justify-center gap-2 transition-all duration-300 border border-card-border hover:border-transparent active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="size-[18px]" />
            Download Backup
          </button>
        </div>

        <div className="surface-card p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group border border-card-border hover:border-accent/30">
          <div>
            <div className="size-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-300">
              <FileSpreadsheet className="size-6" />
            </div>
            <h3 className="text-[18px] font-bold text-foreground tracking-tight mb-2">CSV Export</h3>
            <p className="text-[13px] text-muted leading-relaxed mb-6">
              Spreadsheet-friendly rows grouped by data category. Ideal for Excel, Google Sheets, or manual accounting.
            </p>
          </div>

          <button
            type="button"
            onClick={() => requestSecurityAction("export-csv")}
            disabled={loading || isSecurityBusy || !activeProfileId}
            className="w-full py-3 px-4 bg-foreground/[0.03] hover:bg-accent hover:text-white text-foreground font-bold text-[13px] rounded-lg flex items-center justify-center gap-2 transition-all duration-300 border border-card-border hover:border-transparent active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="size-[18px]" />
            Download CSV
          </button>
        </div>

        <div className="surface-card p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group border border-card-border hover:border-warning/30">
          <div>
            <div className="size-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-warning group-hover:text-white transition-all duration-300">
              <ArchiveRestore className="size-6" />
            </div>
            <h3 className="text-[18px] font-bold text-foreground tracking-tight mb-2">Restore Backup</h3>
            <p className="text-[13px] text-muted leading-relaxed mb-6">
              Import a BillCraft JSON backup into the active profile. Choose merge or full replace after previewing contents.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleBackupFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || isRestoring || !activeProfileId}
            className="w-full py-3 px-4 bg-foreground/[0.03] hover:bg-warning hover:text-white text-foreground font-bold text-[13px] rounded-lg flex items-center justify-center gap-2 transition-all duration-300 border border-card-border hover:border-transparent active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Upload className="size-[18px]" />
            Choose Backup File
          </button>
        </div>
      </div>

      {pendingRestore && restoreSummary && (
        <div className="surface-card p-6 sm:p-8 rounded-xl border border-warning/20">
          <div className="flex items-start gap-4 mb-6">
            <div className="size-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
              <Package className="size-6" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-foreground tracking-tight mb-1">Backup Preview</h3>
              <p className="text-[13px] text-muted">
                Exported {formatBackupDate(pendingRestore.exportedAt)} from profile &ldquo;{pendingRestore.profile.name}&rdquo;
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Clients", value: restoreSummary.clients },
              { label: "Invoices", value: restoreSummary.invoices },
              { label: "Expenses", value: restoreSummary.expenses },
              { label: "Assets", value: restoreSummary.assets },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-foreground/[0.03] border border-card-border px-4 py-3">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{item.label}</p>
                <p className="mt-1 text-xl font-black text-foreground font-display">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-6">
            <label className="flex items-start gap-3 rounded-lg border border-card-border px-4 py-3 cursor-pointer hover:border-action/30 transition-colors">
              <input
                type="radio"
                name="restore-mode"
                checked={restoreMode === "replace"}
                onChange={() => setRestoreMode("replace")}
                className="mt-1"
              />
              <span>
                <span className="block text-[14px] font-bold text-foreground">Replace current profile data</span>
                <span className="block text-[12px] text-muted mt-1">Overwrites clients, invoices, expenses, catalog, and trash with the backup.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-card-border px-4 py-3 cursor-pointer hover:border-action/30 transition-colors">
              <input
                type="radio"
                name="restore-mode"
                checked={restoreMode === "merge"}
                onChange={() => setRestoreMode("merge")}
                className="mt-1"
              />
              <span>
                <span className="block text-[14px] font-bold text-foreground">Merge with existing data</span>
                <span className="block text-[12px] text-muted mt-1">Adds or updates records by ID without deleting unmatched items.</span>
              </span>
            </label>
          </div>

          {restoreMode === "replace" && (
            <div className="flex items-start gap-3 rounded-lg bg-warning/10 border border-warning/20 px-4 py-3 mb-6">
              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
              <p className="text-[13px] text-foreground/80">
                Replace mode will overwrite your current profile data. Create a backup first if you want a rollback point.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setPendingRestore(null)}
              disabled={isRestoring}
              className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startRestore}
              disabled={isRestoring}
              className="btn-primary px-6 py-2.5 rounded-lg shadow-md active:scale-95 disabled:opacity-50"
            >
              {isRestoring ? "Restoring..." : restoreMode === "merge" ? "Merge Backup" : "Restore Backup"}
            </button>
          </div>
        </div>
      )}

      {securityAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-background border border-card-border rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="size-12 rounded-xl bg-action/10 text-action flex items-center justify-center mb-4">
              <Lock className="size-6" />
            </div>
            <h3 className="text-[20px] font-bold text-foreground mb-2 tracking-tight">Security Check</h3>
            <p className="text-[13px] text-muted mb-6">Enter your profile password to authorize this action.</p>

            <form onSubmit={handleConfirmSecurity}>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter password"
                value={securityPassword}
                onChange={(e) => setSecurityPassword(e.target.value)}
                className="w-full bg-foreground/[0.02] border border-card-border rounded-lg px-4 py-3 text-[14px] font-semibold text-foreground outline-none focus:border-action focus:ring-2 focus:ring-action/20 transition-all mb-6"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setSecurityAction(null); setSecurityPassword(""); }}
                  className="px-5 py-2.5 rounded-lg text-[13px] font-bold text-muted hover:text-foreground hover:bg-foreground/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!securityPassword || isSecurityBusy}
                  className="btn-primary px-6 py-2.5 rounded-lg shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSecurityBusy ? "Checking..." : "Unlock & Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

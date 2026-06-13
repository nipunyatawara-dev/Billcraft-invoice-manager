import { FormEvent, useState } from "react";
import { useCurrency } from "@/hooks/use-currency";
import { useUserData } from "@/hooks/use-user-data";
import { getToastErrorMessage, notify, notifyPromise } from "@/lib/toast";
import { AnimatedText } from "@/components/animated-text";

type ExportFormat = "json" | "csv";
type ExportRow = Record<string, string | number | null | undefined>;

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

export function DataTab() {
  const { currency } = useCurrency();
  const {
    activeProfile, activeProfileId, profiles, clients, invoices, vendors,
    outsourcingInvoices, todoTasks, verifyProfilePassword, markProfileBackedUp, loading,
  } = useUserData();

  const [exportRequest, setExportRequest] = useState<ExportFormat | null>(null);
  const [exportPassword, setExportPassword] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  function getExportSnapshot() {
    return {
      exportedAt: new Date().toISOString(),
      currency,
      activeProfileId,
      activeProfile,
      profiles,
      clients,
      invoices,
      vendors,
      outsourcingInvoices,
      todoTasks,
    };
  }

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

  async function downloadJson() {
    const snapshot = getExportSnapshot();
    downloadFile(
      `${fileSafeName(activeProfile?.businessName || activeProfile?.name)}-${new Date().toISOString().slice(0, 10)}.json`,
      `${JSON.stringify(snapshot, null, 2)}\n`,
      "application/json;charset=utf-8",
    );
    await markCurrentExportBackedUp();
    notify.success({ title: "Data exported", description: "JSON file is ready in your downloads." });
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
    ];

    downloadFile(
      `${fileSafeName(activeProfile?.businessName || activeProfile?.name)}-${new Date().toISOString().slice(0, 10)}.csv`,
      `${toCsv(rows)}\n`,
      "text/csv;charset=utf-8",
    );
    await markCurrentExportBackedUp();
    notify.success({ title: "Data exported", description: "CSV file is ready in your downloads." });
  }

  function requestExport(format: ExportFormat) {
    if (!activeProfile?.hasPassword || !activeProfileId) {
      if (format === "json") void downloadJson();
      else void downloadCsv();
      return;
    }
    setExportRequest(format);
    setExportPassword("");
  }

  async function handleConfirmExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exportRequest || !activeProfileId || isExporting) return;

    setIsExporting(true);
    try {
      await notifyPromise(verifyProfilePassword(activeProfileId, exportPassword), {
        loading: { title: "Checking password...", description: "Verifying before export." },
        success: { title: "Password accepted", description: "Preparing your download." },
        error: (error) => ({ title: "Export blocked", description: getToastErrorMessage(error, "Incorrect password.") }),
      });

      if (exportRequest === "json") await downloadJson();
      else await downloadCsv();

      setExportRequest(null);
      setExportPassword("");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Intro */}
      <div className="surface-featured p-6 sm:p-8 relative overflow-hidden rounded-3xl group">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djIwaC0ydi0yMEgzNHYyaDJoMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--action)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="size-16 sm:size-20 rounded-2xl bg-[var(--action)] text-[var(--action-text)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--action)]/30 transform group-hover:-translate-y-1 transition-transform duration-500">
            <span className="material-symbols-outlined text-[32px] sm:text-[40px]">database</span>
          </div>
          <div className="text-center sm:text-left">
            <AnimatedText as="p" text="System Storage" effect="micro-scale-fade" className="text-[11px] font-bold text-[var(--featured-text)]/50 tracking-widest uppercase mb-2" />
            <AnimatedText
              as="h2"
              text="Your Data Ownership"
              effect="micro-scale-fade"
              className="text-2xl sm:text-3xl font-bold text-[var(--featured-text)] font-display mb-2 tracking-tight"
              delayMs={70}
            />
            <p className="text-[14px] text-[var(--featured-text)]/70 font-medium max-w-xl">Export your profiles, clients, invoices, vendors, and tasks anytime. You fully own your BillCraft data.</p>
          </div>
        </div>
      </div>

      {/* Stats Bento Box */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Profiles", value: profiles.length, icon: "person" },
          { label: "Clients", value: clients.length, icon: "groups" },
          { label: "Invoices", value: invoices.length, icon: "receipt_long" },
          { label: "Vendors", value: vendors.length, icon: "store" },
          { label: "Tasks", value: todoTasks.length, icon: "task_alt" },
        ].map((item) => (
          <div key={item.label} className="surface-card p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
              <span className="material-symbols-outlined text-6xl">{item.icon}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--action)] mb-2">
              <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
            </div>
            <p className="text-[10px] font-bold text-[var(--muted)] tracking-wider uppercase">{item.label}</p>
            <p className="mt-1 text-2xl font-black text-[var(--foreground)] font-display tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* JSON Export */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group border border-[var(--card-border)] hover:border-[var(--action)]/30">
          <div>
            <div className="size-12 rounded-full bg-[var(--action)]/10 text-[var(--action)] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[var(--action)] group-hover:text-[var(--action-text)] transition-all duration-300">
              <span className="material-symbols-outlined text-[24px]">data_object</span>
            </div>
            <h3 className="text-[18px] font-bold text-[var(--foreground)] tracking-tight mb-2">JSON Export</h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-6">Complete snapshot containing nested invoice items, payments, and full profile metadata. Best for backups or transferring to another system.</p>
          </div>
          
          <button
            type="button"
            onClick={() => requestExport("json")}
            disabled={loading || isExporting}
            className="w-full py-3 px-4 bg-[var(--foreground)]/[0.03] hover:bg-[var(--action)] hover:text-[var(--action-text)] text-[var(--foreground)] font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all duration-300 border border-[var(--card-border)] hover:border-transparent active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download JSON
          </button>
        </div>

        {/* CSV Export */}
        <div className="surface-card p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group border border-[var(--card-border)] hover:border-[var(--accent)]/30">
          <div>
            <div className="size-12 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-[var(--accent)] group-hover:text-white transition-all duration-300">
              <span className="material-symbols-outlined text-[24px]">table_chart</span>
            </div>
            <h3 className="text-[18px] font-bold text-[var(--foreground)] tracking-tight mb-2">CSV Export</h3>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed mb-6">Spreadsheet-friendly rows grouped by data category. Ideal for opening in Excel, Google Sheets, or Numbers for manual accounting.</p>
          </div>
          
          <button
            type="button"
            onClick={() => requestExport("csv")}
            disabled={loading || isExporting}
            className="w-full py-3 px-4 bg-[var(--foreground)]/[0.03] hover:bg-[var(--accent)] hover:text-white text-[var(--foreground)] font-bold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all duration-300 border border-[var(--card-border)] hover:border-transparent active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download CSV
          </button>
        </div>
      </div>

      {/* Export Password Modal (if needed) */}
      {exportRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="size-12 rounded-full bg-[var(--action)]/10 text-[var(--action)] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[24px]">lock</span>
            </div>
            <h3 className="text-[20px] font-bold text-[var(--foreground)] mb-2 tracking-tight">Security Check</h3>
            <p className="text-[13px] text-[var(--muted)] mb-6">Enter your profile password to authorize this export.</p>
            
            <form onSubmit={handleConfirmExport}>
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                className="w-full bg-[var(--foreground)]/[0.02] border border-[var(--card-border)] rounded-xl px-4 py-3 text-[14px] font-semibold text-[var(--foreground)] outline-none focus:border-[var(--action)] focus:ring-2 focus:ring-[var(--action)]/20 transition-all mb-6"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setExportRequest(null); setExportPassword(""); }}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.05] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!exportPassword || isExporting}
                  className="btn-primary px-6 py-2.5 rounded-xl shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isExporting ? "Checking..." : "Unlock & Download"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

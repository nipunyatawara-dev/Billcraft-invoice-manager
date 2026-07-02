import type {
  CatalogItem,
  Client,
  Expense,
  Invoice,
  OutsourcingInvoice,
  PaymentAttachment,
  PaymentRecord,
  TrashItem,
  UserProfile,
  Vendor,
} from "@/data/invoices";
import type { TodoTask } from "@/data/todos";

export const BACKUP_SCHEMA_VERSION = 1;

export type ImportMode = "replace" | "merge";

export type BillCraftBackup = {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  profileId: string;
  profile: UserProfile;
  clients: Client[];
  invoices: Invoice[];
  vendors: Vendor[];
  outsourcingInvoices: OutsourcingInvoice[];
  todoTasks: TodoTask[];
  expenses: Expense[];
  catalogItems: CatalogItem[];
  trash: TrashItem[];
  assets: Record<string, string>;
};

export type BackupSummary = {
  clients: number;
  invoices: number;
  vendors: number;
  outsourcingInvoices: number;
  todoTasks: number;
  expenses: number;
  catalogItems: number;
  trash: number;
  assets: number;
};

type LegacyExport = {
  exportedAt?: string;
  activeProfileId?: string | null;
  activeProfile?: UserProfile | null;
  profiles?: UserProfile[];
  clients?: Client[];
  invoices?: Invoice[];
  vendors?: Vendor[];
  outsourcingInvoices?: OutsourcingInvoice[];
  todoTasks?: TodoTask[];
  expenses?: Expense[];
  catalogItems?: CatalogItem[];
  trash?: TrashItem[];
};

const MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".webp": "image/webp",
};

export function extractAssetFileName(url?: string | null) {
  if (!url?.startsWith("/api/user-data/asset?")) {
    return null;
  }

  const query = url.split("?")[1];
  if (!query) {
    return null;
  }

  return new URLSearchParams(query).get("file");
}

export function buildAssetUrl(profileId: string, fileName: string) {
  return `/api/user-data/asset?profileId=${encodeURIComponent(profileId)}&file=${encodeURIComponent(fileName)}`;
}

export function rewriteAssetUrl(url: string | undefined, sourceProfileId: string, targetProfileId: string) {
  if (!url) {
    return url;
  }

  const fileName = extractAssetFileName(url);
  if (!fileName) {
    return url;
  }

  if (sourceProfileId === targetProfileId) {
    return url;
  }

  return buildAssetUrl(targetProfileId, fileName);
}

function collectAttachmentUrls(attachments: PaymentAttachment[] = []) {
  return attachments.map((attachment) => attachment.url).filter(Boolean) as string[];
}

function collectPaymentUrls(payments: PaymentRecord[] = []) {
  return payments.flatMap((payment) => collectAttachmentUrls(payment.receiptAttachments));
}

function collectBillableUrls(entity: Invoice | OutsourcingInvoice) {
  return [
    entity.avatar,
    ...collectAttachmentUrls(entity.receiptAttachments),
    ...collectPaymentUrls(entity.payments),
  ];
}

export function collectAssetFileNames(data: {
  profile?: UserProfile | null;
  clients?: Client[];
  vendors?: Vendor[];
  invoices?: Invoice[];
  outsourcingInvoices?: OutsourcingInvoice[];
  trash?: TrashItem[];
}) {
  const fileNames = new Set<string>();

  function addUrl(url?: string) {
    const fileName = extractAssetFileName(url);
    if (fileName) {
      fileNames.add(fileName);
    }
  }

  addUrl(data.profile?.profilePic);
  addUrl(data.profile?.signature);

  for (const client of data.clients || []) {
    addUrl(client.avatar);
  }

  for (const vendor of data.vendors || []) {
    addUrl(vendor.avatar);
  }

  for (const invoice of data.invoices || []) {
    for (const url of collectBillableUrls(invoice)) {
      addUrl(url);
    }
  }

  for (const invoice of data.outsourcingInvoices || []) {
    for (const url of collectBillableUrls(invoice)) {
      addUrl(url);
    }
  }

  for (const item of data.trash || []) {
    if (item.type === "invoice") {
      for (const url of collectBillableUrls(item.data)) {
        addUrl(url);
      }
    }
  }

  return [...fileNames];
}

function rewriteAttachments(attachments: PaymentAttachment[] = [], sourceProfileId: string, targetProfileId: string) {
  return attachments.map((attachment) => ({
    ...attachment,
    url: rewriteAssetUrl(attachment.url, sourceProfileId, targetProfileId) || attachment.url,
  }));
}

function rewritePayments(payments: PaymentRecord[] = [], sourceProfileId: string, targetProfileId: string) {
  return payments.map((payment) => ({
    ...payment,
    receiptAttachments: rewriteAttachments(payment.receiptAttachments, sourceProfileId, targetProfileId),
  }));
}

function rewriteBillable<T extends Invoice | OutsourcingInvoice>(entity: T, sourceProfileId: string, targetProfileId: string): T {
  return {
    ...entity,
    avatar: rewriteAssetUrl(entity.avatar, sourceProfileId, targetProfileId) || entity.avatar,
    receiptAttachments: rewriteAttachments(entity.receiptAttachments, sourceProfileId, targetProfileId),
    payments: rewritePayments(entity.payments, sourceProfileId, targetProfileId),
  };
}

export function rewriteBackupForProfile(backup: BillCraftBackup, targetProfileId: string): BillCraftBackup {
  const sourceProfileId = backup.profileId;

  return {
    ...backup,
    profileId: targetProfileId,
    profile: {
      ...backup.profile,
      id: targetProfileId,
      profilePic: rewriteAssetUrl(backup.profile.profilePic, sourceProfileId, targetProfileId),
      signature: rewriteAssetUrl(backup.profile.signature, sourceProfileId, targetProfileId),
    },
    clients: backup.clients.map((client) => ({
      ...client,
      avatar: rewriteAssetUrl(client.avatar, sourceProfileId, targetProfileId) || client.avatar,
    })),
    vendors: backup.vendors.map((vendor) => ({
      ...vendor,
      avatar: rewriteAssetUrl(vendor.avatar, sourceProfileId, targetProfileId) || vendor.avatar,
    })),
    invoices: backup.invoices.map((invoice) => rewriteBillable(invoice, sourceProfileId, targetProfileId)),
    outsourcingInvoices: backup.outsourcingInvoices.map((invoice) => rewriteBillable(invoice, sourceProfileId, targetProfileId)),
    trash: backup.trash.map((item) => ({
      ...item,
      data: rewriteBillable(item.data, sourceProfileId, targetProfileId),
    })),
  };
}

export function getBackupSummary(backup: BillCraftBackup): BackupSummary {
  return {
    clients: backup.clients.length,
    invoices: backup.invoices.length,
    vendors: backup.vendors.length,
    outsourcingInvoices: backup.outsourcingInvoices.length,
    todoTasks: backup.todoTasks.length,
    expenses: backup.expenses.length,
    catalogItems: backup.catalogItems.length,
    trash: backup.trash.length,
    assets: Object.keys(backup.assets || {}).length,
  };
}

export function mimeTypeForFileName(fileName: string) {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[extension] || "application/octet-stream";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isBillCraftBackup(value: unknown): value is BillCraftBackup {
  if (!isRecord(value)) {
    return false;
  }

  return value.schemaVersion === BACKUP_SCHEMA_VERSION
    && typeof value.exportedAt === "string"
    && typeof value.profileId === "string"
    && isRecord(value.profile)
    && Array.isArray(value.clients)
    && Array.isArray(value.invoices);
}

export function normalizeLegacyExport(value: unknown): BillCraftBackup | null {
  if (!isRecord(value)) {
    return null;
  }

  const legacy = value as LegacyExport;
  const profile = legacy.activeProfile || legacy.profiles?.[0];

  if (!profile?.id) {
    return null;
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: legacy.exportedAt || new Date().toISOString(),
    profileId: profile.id,
    profile,
    clients: legacy.clients || [],
    invoices: legacy.invoices || [],
    vendors: legacy.vendors || [],
    outsourcingInvoices: legacy.outsourcingInvoices || [],
    todoTasks: legacy.todoTasks || [],
    expenses: legacy.expenses || [],
    catalogItems: legacy.catalogItems || [],
    trash: legacy.trash || [],
    assets: {},
  };
}

export function parseBackupFile(value: unknown): BillCraftBackup {
  if (isBillCraftBackup(value)) {
    return value;
  }

  const legacy = normalizeLegacyExport(value);
  if (legacy) {
    return legacy;
  }

  throw new Error("Unrecognized backup file. Use a BillCraft JSON backup.");
}

export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const map = new Map(existing.map((item) => [item.id, item]));

  for (const item of incoming) {
    map.set(item.id, item);
  }

  return [...map.values()];
}

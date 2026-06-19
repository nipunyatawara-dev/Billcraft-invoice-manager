import { promises as fs } from "fs";
import path from "path";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import {
  createAvatar,
  getInvoiceItemsTotal,
  getLatestPayment,
  getPaymentRecordsTotal,
  getStatusColor,
  normalizeAnalyticsPreferences,
  type AnalyticsPreferences,
  type Client,
  type Invoice,
  type InvoiceStatus,
  type InvoiceWorkflowStatus,
  type PaymentAttachment,
  type PaymentRecord,
  type OutsourcingInvoice,
  type UserProfile,
  type Vendor,
  type Expense,
  type CatalogItem,
  type TrashItem,
} from "@/data/invoices";
import { createDefaultTodoTasks, TODO_PRIORITIES, TODO_STAGES, type TodoTask } from "@/data/todos";

const USER_DATA_DIR = path.join(process.cwd(), "User data");
const PROFILE_INDEX_PATH = path.join(USER_DATA_DIR, "profiles.json");
const MAX_PROFILES = 5;
const MIN_PROFILE_PASSWORD_LENGTH = 6;
const PASSWORD_HASH_LENGTH = 64;
const scryptAsync = promisify(scryptCallback);

type ProfileIndex = {
  profiles: UserProfile[];
};

type ProfileDraft = {
  name: string;
  profession: string;
  email?: string;
  phone?: string;
  businessName?: string;
  defaultDeliveryLink?: string;
  profilePic?: string;
  signature?: string;
  password?: string;
  passwordHint?: string;
};

type ProfileSecurity = {
  passwordHash: string;
  passwordSalt: string;
  passwordHint?: string;
  passwordChangedAt: string;
};

type ClientDraft = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  address?: string;
  deliveryLink?: string;
  avatar?: string;
  notes?: string;
};

type VendorDraft = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  avatar?: string;
  notes?: string;
  paypal?: string;
  stripe?: string;
};

export type LocalDataSnapshot = {
  profiles: UserProfile[];
  activeProfileId: string | null;
  activeProfile: UserProfile | null;
  clients: Client[];
  invoices: Invoice[];
  vendors: Vendor[];
  outsourcingInvoices: OutsourcingInvoice[];
  todoTasks: TodoTask[];
  expenses: Expense[];
  catalogItems: CatalogItem[];
  trash: TrashItem[];
  userDataPath: string;
};

export type SaveInvoicePayload = {
  profileId: string;
  invoice: Invoice;
  clientSaveMode?: "regular" | "onetime";
  client?: ClientDraft;
};

export type SaveOutsourcingInvoicePayload = {
  profileId: string;
  invoice: OutsourcingInvoice;
  vendorSaveMode?: "regular" | "onetime";
  vendor?: VendorDraft;
};

export type ProfilePasswordDraft = {
  currentPassword?: string;
  password: string;
};

export type ProfilePasswordHintDraft = {
  currentPassword?: string;
  passwordHint?: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "profile";
}

function assertSafeProfileId(profileId: string) {
  if (!/^[a-z0-9-]+$/.test(profileId)) {
    throw new Error("Invalid profile id.");
  }
}

function getProfileDir(profileId: string) {
  assertSafeProfileId(profileId);
  return path.join(USER_DATA_DIR, profileId);
}

function getProfileDataPath(profileId: string, fileName: "clients.json" | "invoices.json" | "profile.json" | "vendors.json" | "outsourcing-invoices.json" | "todo-tasks.json" | "trash.json" | "expenses.json" | "catalog.json") {
  return path.join(getProfileDir(profileId), fileName);
}

function getProfileSecurityPath(profileId: string) {
  return path.join(getProfileDir(profileId), "security.json");
}

function getAssetDir(profileId: string) {
  return path.join(getProfileDir(profileId), "assets");
}

async function ensureUserDataDir() {
  await fs.mkdir(USER_DATA_DIR, { recursive: true });
}

async function ensureProfileDir(profileId: string) {
  await fs.mkdir(getAssetDir(profileId), { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readProfileIndex(): Promise<ProfileIndex> {
  await ensureUserDataDir();
  return readJson<ProfileIndex>(PROFILE_INDEX_PATH, { profiles: [] });
}

async function writeProfileIndex(index: ProfileIndex) {
  await ensureUserDataDir();
  await writeJson(PROFILE_INDEX_PATH, index);
}

function sanitizePasswordHint(value?: string) {
  const hint = value?.trim();
  return hint ? hint.slice(0, 160) : undefined;
}

function assertValidProfilePassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < MIN_PROFILE_PASSWORD_LENGTH) {
    throw new Error("Profile password must be at least 6 characters.");
  }
}

async function derivePasswordHash(password: string, salt: string) {
  const derivedKey = await scryptAsync(password, salt, PASSWORD_HASH_LENGTH);
  return (derivedKey as Buffer).toString("hex");
}

async function createProfileSecurity(password: string, passwordHint?: string): Promise<ProfileSecurity> {
  assertValidProfilePassword(password);

  const passwordSalt = randomBytes(16).toString("hex");

  return {
    passwordSalt,
    passwordHash: await derivePasswordHash(password, passwordSalt),
    passwordHint: sanitizePasswordHint(passwordHint),
    passwordChangedAt: new Date().toISOString(),
  };
}

async function readProfileSecurity(profileId: string) {
  return readJson<ProfileSecurity | null>(getProfileSecurityPath(profileId), null);
}

async function writeProfileSecurity(profileId: string, security: ProfileSecurity) {
  await writeJson(getProfileSecurityPath(profileId), security);
}

async function isProfilePasswordMatch(security: ProfileSecurity, password: string) {
  const suppliedHash = Buffer.from(await derivePasswordHash(password, security.passwordSalt), "hex");
  const storedHash = Buffer.from(security.passwordHash, "hex");

  if (suppliedHash.length !== storedHash.length) {
    return false;
  }

  return timingSafeEqual(suppliedHash, storedHash);
}

async function getProfileSecurityMetadata(profileId: string) {
  const security = await readProfileSecurity(profileId);
  const hasPassword = Boolean(security?.passwordHash && security.passwordSalt);

  return {
    hasPassword,
    passwordHint: hasPassword ? security?.passwordHint : undefined,
    passwordChangedAt: hasPassword ? security?.passwordChangedAt : undefined,
  };
}

async function withProfileSecurityMetadata(profile: UserProfile): Promise<UserProfile> {
  return {
    ...profile,
    ...await getProfileSecurityMetadata(profile.id),
  };
}

async function withProfilesSecurityMetadata(profiles: UserProfile[]) {
  return Promise.all(profiles.map(withProfileSecurityMetadata));
}

function uniqueIdForProfile(name: string, profiles: UserProfile[]) {
  const base = slugify(name);
  let candidate = `${base}-${Date.now().toString(36)}`;
  let counter = 2;
  const existingIds = new Set(profiles.map((profile) => profile.id));

  while (existingIds.has(candidate)) {
    candidate = `${base}-${Date.now().toString(36)}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function uniqueEntityId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fileExtensionForMime(mimeType: string) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "text/plain": "txt",
  };

  return extensions[mimeType] || "png";
}

function isStoredAsset(value?: string) {
  return value?.startsWith("/api/user-data/asset?") || false;
}

async function saveDataUrlAsset(profileId: string, label: string, value?: string) {
  if (!value || isStoredAsset(value)) {
    return value;
  }

  const match = value.match(/^data:([a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/);

  if (!match) {
    return value;
  }

  const [, mimeType, base64] = match;
  const extension = fileExtensionForMime(mimeType);
  const fileName = `${slugify(label)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const assetPath = path.join(getAssetDir(profileId), fileName);

  await ensureProfileDir(profileId);
  await fs.writeFile(assetPath, Buffer.from(base64, "base64"));

  return `/api/user-data/asset?profileId=${encodeURIComponent(profileId)}&file=${encodeURIComponent(fileName)}`;
}

async function savePaymentAttachmentAssets(profileId: string, label: string, attachments: PaymentAttachment[] = []) {
  const nextAttachments = await Promise.all(attachments.map(async (attachment, index) => ({
    ...hydratePaymentAttachment(attachment, index),
    url: await saveDataUrlAsset(profileId, `${label}-${attachment.name || attachment.id || index}`, attachment.url) || attachment.url,
  })));

  return nextAttachments.filter((attachment) => attachment.url);
}

async function savePaymentRecordAssets(profileId: string, label: string, payments: PaymentRecord[] = []) {
  return Promise.all(payments.map(async (payment, index) => ({
    ...hydratePaymentRecord(payment),
    receiptAttachments: await savePaymentAttachmentAssets(profileId, `${label}-${payment.id || index}`, payment.receiptAttachments || []),
  })));
}

async function normalizeProfileAssets(profileId: string, draft: ProfileDraft, existingProfile?: UserProfile): Promise<UserProfile> {
  const now = new Date().toISOString();

  return {
    id: profileId,
    name: draft.name.trim(),
    profession: draft.profession.trim(),
    email: draft.email?.trim() || undefined,
    phone: draft.phone?.trim() || undefined,
    businessName: draft.businessName?.trim() || undefined,
    defaultDeliveryLink: draft.defaultDeliveryLink?.trim() || undefined,
    profilePic: await saveDataUrlAsset(profileId, "profile-picture", draft.profilePic || existingProfile?.profilePic),
    signature: await saveDataUrlAsset(profileId, "signature", draft.signature || existingProfile?.signature),
    analyticsPreferences: existingProfile?.analyticsPreferences
      ? normalizeAnalyticsPreferences(existingProfile.analyticsPreferences)
      : undefined,
    lastBackupAt: existingProfile?.lastBackupAt,
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
  };
}

function hydratePaymentAttachment(attachment: PaymentAttachment, index: number): PaymentAttachment {
  return {
    id: attachment.id || uniqueEntityId("receipt"),
    name: attachment.name?.trim() || `Receipt ${index + 1}`,
    type: attachment.type || "application/octet-stream",
    size: Number.isFinite(attachment.size) ? Math.max(attachment.size, 0) : 0,
    url: attachment.url || "",
  };
}

function hydratePaymentRecord(payment: PaymentRecord): PaymentRecord {
  return {
    ...payment,
    id: payment.id || uniqueEntityId("payment"),
    amount: Number.isFinite(payment.amount) ? Math.max(payment.amount, 0) : 0,
    paidAt: payment.paidAt || new Date().toISOString().slice(0, 10),
    method: payment.method?.trim() || "Other",
    notes: payment.notes?.trim() || undefined,
    receiptAttachments: (payment.receiptAttachments || []).map(hydratePaymentAttachment),
  };
}

function hydrateClient(client: Client): Client {
  return {
    ...client,
    id: client.id || uniqueEntityId("client"),
    name: client.name || "Unnamed Client",
    email: client.email || "",
    phone: client.phone || "",
    whatsapp: client.whatsapp || undefined,
    deliveryLink: client.deliveryLink || undefined,
    avatar: client.avatar || createAvatar(client.name),
  };
}

function hydrateVendor(vendor: Vendor): Vendor {
  return {
    ...vendor,
    id: vendor.id || uniqueEntityId("vendor"),
    name: vendor.name || "Unnamed Vendor",
    email: vendor.email || "",
    phone: vendor.phone || "",
    avatar: vendor.avatar || createAvatar(vendor.name),
  };
}

function hydrateInvoice(invoice: Invoice): Invoice {
  const items = invoice.items || [];
  const total = typeof invoice.total === "number" ? invoice.total : getInvoiceItemsTotal(items);
  const payments = (invoice.payments || []).map(hydratePaymentRecord);
  const paymentAttachments = (invoice.receiptAttachments || []).map(hydratePaymentAttachment);
  const latestPayment = getLatestPayment(payments);
  const paidFromPayments = getPaymentRecordsTotal(payments);
  const amountPaid = typeof invoice.amountPaid === "number"
    ? invoice.amountPaid
    : paidFromPayments > 0
      ? paidFromPayments
      : invoice.status === "Paid"
        ? total
        : 0;

  return {
    ...invoice,
    items,
    total,
    subtotal: typeof invoice.subtotal === "number" ? invoice.subtotal : total,
    amountPaid: Math.min(Math.max(amountPaid, 0), total),
    paidAt: invoice.paidAt || latestPayment?.paidAt,
    paymentMethod: invoice.paymentMethod || latestPayment?.method,
    paymentNotes: invoice.paymentNotes?.trim() || undefined,
    receiptAttachments: paymentAttachments,
    payments,
    statusColor: getStatusColor(invoice.status),
    clientColor: invoice.clientColor || "bg-foreground/10",
    avatar: invoice.avatar || createAvatar(invoice.client),
    templateId: invoice.templateId || "classic",
    templateName: invoice.templateName || "Classic Invoice",
    workflowStatus: invoice.workflowStatus || "Draft",
    whatsapp: invoice.whatsapp?.trim() || undefined,
    deliveryLink: invoice.deliveryLink?.trim() || undefined,
  };
}

function hydrateOutsourcingInvoice(invoice: OutsourcingInvoice): OutsourcingInvoice {
  const items = invoice.items || [];
  const total = typeof invoice.total === "number" ? invoice.total : getInvoiceItemsTotal(items);
  const payments = (invoice.payments || []).map(hydratePaymentRecord);
  const paymentAttachments = (invoice.receiptAttachments || []).map(hydratePaymentAttachment);
  const latestPayment = getLatestPayment(payments);
  const paidFromPayments = getPaymentRecordsTotal(payments);
  const amountPaid = typeof invoice.amountPaid === "number"
    ? invoice.amountPaid
    : paidFromPayments > 0
      ? paidFromPayments
      : invoice.status === "Paid"
        ? total
        : 0;

  return {
    ...invoice,
    items,
    total,
    subtotal: typeof invoice.subtotal === "number" ? invoice.subtotal : total,
    amountPaid: Math.min(Math.max(amountPaid, 0), total),
    paidAt: invoice.paidAt || latestPayment?.paidAt,
    paymentMethod: invoice.paymentMethod || latestPayment?.method,
    paymentNotes: invoice.paymentNotes?.trim() || undefined,
    receiptAttachments: paymentAttachments,
    payments,
    statusColor: getStatusColor(invoice.status),
    vendorColor: invoice.vendorColor || "bg-foreground/10",
    avatar: invoice.avatar || createAvatar(invoice.vendor),
    templateId: invoice.templateId || "outsourcing",
    templateName: invoice.templateName || "Outsourcing Invoice",
  };
}

function hydrateTodoTask(task: TodoTask, index: number): TodoTask {
  const stageIds = new Set(TODO_STAGES.map((stage) => stage.id));
  const priorities = new Set<string>(TODO_PRIORITIES);
  const now = new Date().toISOString();
  const title = task.title?.trim() || "Untitled task";

  return {
    ...task,
    id: task.id || uniqueEntityId("todo"),
    title,
    description: task.description?.trim() || undefined,
    client: task.client?.trim() || undefined,
    clientId: task.clientId?.trim() || undefined,
    clientEmail: task.clientEmail?.trim() || undefined,
    clientPhone: task.clientPhone?.trim() || undefined,
    clientWhatsapp: task.clientWhatsapp?.trim() || undefined,
    invoiceId: task.invoiceId?.trim() || undefined,
    jobColor: task.jobColor?.trim() || undefined,
    deliveryLink: task.deliveryLink?.trim() || undefined,
    dueDate: task.dueDate || undefined,
    estimate: task.estimate?.trim() || undefined,
    stage: stageIds.has(task.stage) ? task.stage : "backlog",
    priority: priorities.has(task.priority) ? task.priority : "Medium",
    tags: Array.isArray(task.tags) ? task.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 4) : [],
    order: Number.isFinite(task.order) ? task.order : index,
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
  };
}

async function readClients(profileId: string) {
  const clients = await readJson<Client[]>(getProfileDataPath(profileId, "clients.json"), []);
  return clients.map(hydrateClient);
}

async function writeClients(profileId: string, clients: Client[]) {
  await writeJson(getProfileDataPath(profileId, "clients.json"), clients.map(hydrateClient));
}

async function readVendors(profileId: string) {
  const vendors = await readJson<Vendor[]>(getProfileDataPath(profileId, "vendors.json"), []);
  return vendors.map(hydrateVendor);
}

async function writeVendors(profileId: string, vendors: Vendor[]) {
  await writeJson(getProfileDataPath(profileId, "vendors.json"), vendors.map(hydrateVendor));
}

async function readInvoices(profileId: string) {
  const invoices = await readJson<Invoice[]>(getProfileDataPath(profileId, "invoices.json"), []);
  return invoices.map(hydrateInvoice);
}

async function writeInvoices(profileId: string, invoices: Invoice[]) {
  await writeJson(getProfileDataPath(profileId, "invoices.json"), invoices.map(hydrateInvoice));
}

async function readOutsourcingInvoices(profileId: string) {
  const invoices = await readJson<OutsourcingInvoice[]>(getProfileDataPath(profileId, "outsourcing-invoices.json"), []);
  return invoices.map(hydrateOutsourcingInvoice);
}

async function writeOutsourcingInvoices(profileId: string, invoices: OutsourcingInvoice[]) {
  await writeJson(getProfileDataPath(profileId, "outsourcing-invoices.json"), invoices.map(hydrateOutsourcingInvoice));
}

async function readTodoTasks(profileId: string) {
  const todoPath = getProfileDataPath(profileId, "todo-tasks.json");

  try {
    const contents = await fs.readFile(todoPath, "utf8");
    const tasks = JSON.parse(contents) as TodoTask[];
    return tasks.map(hydrateTodoTask).sort((a, b) => a.order - b.order);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const defaultTasks = createDefaultTodoTasks();
      await writeTodoTasks(profileId, defaultTasks);
      return defaultTasks;
    }

    throw error;
  }
}

async function writeTodoTasks(profileId: string, tasks: TodoTask[]) {
  const normalizedTasks = tasks.map(hydrateTodoTask).sort((a, b) => a.order - b.order);

  await writeJson(getProfileDataPath(profileId, "todo-tasks.json"), normalizedTasks);
}

async function readTrash(profileId: string): Promise<TrashItem[]> {
  return readJson<TrashItem[]>(getProfileDataPath(profileId, "trash.json"), []);
}

async function writeTrash(profileId: string, trash: TrashItem[]) {
  await writeJson(getProfileDataPath(profileId, "trash.json"), trash);
}

async function saveProfileFile(profile: UserProfile) {
  await writeJson(getProfileDataPath(profile.id, "profile.json"), profile);
}

function resolveActiveProfile(profiles: UserProfile[], requestedProfileId?: string | null) {
  if (requestedProfileId && profiles.some((profile) => profile.id === requestedProfileId)) {
    return requestedProfileId;
  }

  return profiles[0]?.id || null;
}

async function readExpenses(profileId: string): Promise<Expense[]> {
  return readJson<Expense[]>(getProfileDataPath(profileId, "expenses.json"), []);
}

async function writeExpenses(profileId: string, expenses: Expense[]) {
  await writeJson(getProfileDataPath(profileId, "expenses.json"), expenses);
}

async function readCatalog(profileId: string): Promise<CatalogItem[]> {
  return readJson<CatalogItem[]>(getProfileDataPath(profileId, "catalog.json"), []);
}

async function writeCatalog(profileId: string, catalog: CatalogItem[]) {
  await writeJson(getProfileDataPath(profileId, "catalog.json"), catalog);
}

export async function saveExpense(profileId: string, expense: Expense) {
  await ensureProfileDir(profileId);
  const expenses = await readExpenses(profileId);
  const existingIndex = expenses.findIndex((e) => e.id === expense.id);
  const now = new Date().toISOString();
  
  const updatedExpense: Expense = {
    ...expense,
    createdAt: existingIndex >= 0 ? expenses[existingIndex].createdAt : now,
    updatedAt: now,
  };

  const nextExpenses = existingIndex >= 0
    ? expenses.map((e) => e.id === expense.id ? updatedExpense : e)
    : [updatedExpense, ...expenses];

  await writeExpenses(profileId, nextExpenses);
  return updatedExpense;
}

export async function deleteExpense(profileId: string, expenseId: string) {
  await ensureProfileDir(profileId);
  const expenses = await readExpenses(profileId);
  const nextExpenses = expenses.filter((e) => e.id !== expenseId);
  await writeExpenses(profileId, nextExpenses);
}

export async function saveCatalogItem(profileId: string, item: CatalogItem) {
  await ensureProfileDir(profileId);
  const catalog = await readCatalog(profileId);
  const existingIndex = catalog.findIndex((c) => c.id === item.id);
  const now = new Date().toISOString();

  const updatedItem: CatalogItem = {
    ...item,
    createdAt: existingIndex >= 0 ? catalog[existingIndex].createdAt : now,
    updatedAt: now,
  };

  const nextCatalog = existingIndex >= 0
    ? catalog.map((c) => c.id === item.id ? updatedItem : c)
    : [updatedItem, ...catalog];

  await writeCatalog(profileId, nextCatalog);
  return updatedItem;
}

export async function deleteCatalogItem(profileId: string, itemId: string) {
  await ensureProfileDir(profileId);
  const catalog = await readCatalog(profileId);
  const nextCatalog = catalog.filter((c) => c.id !== itemId);
  await writeCatalog(profileId, nextCatalog);
}

export async function loadLocalDataSnapshot(requestedProfileId?: string | null): Promise<LocalDataSnapshot> {
  const { profiles: storedProfiles } = await readProfileIndex();
  const profiles = await withProfilesSecurityMetadata(storedProfiles);
  const activeProfileId = resolveActiveProfile(profiles, requestedProfileId);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || null;

  if (!activeProfileId) {
    return {
      profiles,
      activeProfileId: null,
      activeProfile: null,
      clients: [],
      invoices: [],
      vendors: [],
      outsourcingInvoices: [],
      todoTasks: [],
      expenses: [],
      catalogItems: [],
      trash: [],
      userDataPath: USER_DATA_DIR,
    };
  }

  await ensureProfileDir(activeProfileId);

  return {
    profiles,
    activeProfileId,
    activeProfile,
    clients: await readClients(activeProfileId),
    invoices: await readInvoices(activeProfileId),
    vendors: await readVendors(activeProfileId),
    outsourcingInvoices: await readOutsourcingInvoices(activeProfileId),
    todoTasks: await readTodoTasks(activeProfileId),
    expenses: await readExpenses(activeProfileId),
    catalogItems: await readCatalog(activeProfileId),
    trash: await readTrash(activeProfileId),
    userDataPath: USER_DATA_DIR,
  };
}

export async function createProfile(draft: ProfileDraft) {
  if (!draft.name.trim() || !draft.profession.trim()) {
    throw new Error("Name and profession are required.");
  }

  assertValidProfilePassword(draft.password);

  const index = await readProfileIndex();

  if (index.profiles.length >= MAX_PROFILES) {
    throw new Error("You can create up to 5 profiles.");
  }

  const profileId = uniqueIdForProfile(draft.name, index.profiles);
  await ensureProfileDir(profileId);

  const profile = await normalizeProfileAssets(profileId, draft);
  const nextProfiles = [profile, ...index.profiles];

  await writeProfileIndex({ profiles: nextProfiles });
  await saveProfileFile(profile);
  await writeProfileSecurity(profileId, await createProfileSecurity(draft.password, draft.passwordHint));
  await writeClients(profileId, []);
  await writeInvoices(profileId, []);
  await writeVendors(profileId, []);
  await writeOutsourcingInvoices(profileId, []);
  await writeTodoTasks(profileId, createDefaultTodoTasks());
  await writeExpenses(profileId, []);
  await writeCatalog(profileId, []);

  return profile;
}

export async function updateProfile(profileId: string, draft: ProfileDraft) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  if (!draft.name.trim() || !draft.profession.trim()) {
    throw new Error("Name and profession are required.");
  }

  const profile = await normalizeProfileAssets(profileId, draft, existingProfile);
  const nextProfiles = index.profiles.map((currentProfile) => currentProfile.id === profileId ? profile : currentProfile);

  await writeProfileIndex({ profiles: nextProfiles });
  await saveProfileFile(profile);

  return profile;
}

export async function verifyProfilePassword(profileId: string, password: string) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  const security = await readProfileSecurity(profileId);

  if (!security?.passwordHash || !security.passwordSalt) {
    throw new Error("Password is not set for this profile.");
  }

  if (!await isProfilePasswordMatch(security, password || "")) {
    throw new Error("Incorrect password.");
  }

  return true;
}

export async function changeProfilePassword(profileId: string, draft: ProfilePasswordDraft) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  const existingSecurity = await readProfileSecurity(profileId);

  if (existingSecurity?.passwordHash && !await isProfilePasswordMatch(existingSecurity, draft.currentPassword || "")) {
    throw new Error("Current password is incorrect.");
  }

  const security = await createProfileSecurity(draft.password, existingSecurity?.passwordHint);

  await writeProfileSecurity(profileId, security);

  const updatedProfile: UserProfile = {
    ...existingProfile,
    updatedAt: new Date().toISOString(),
  };

  await writeProfileIndex({
    profiles: index.profiles.map((profile) => profile.id === profileId ? updatedProfile : profile),
  });
  await saveProfileFile(updatedProfile);

  return {
    hasPassword: true,
    passwordHint: security.passwordHint,
    passwordChangedAt: security.passwordChangedAt,
  };
}

export async function updateProfilePasswordHint(profileId: string, draft: ProfilePasswordHintDraft) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  const existingSecurity = await readProfileSecurity(profileId);

  if (!existingSecurity?.passwordHash || !existingSecurity.passwordSalt) {
    throw new Error("Password is not set for this profile.");
  }

  if (!await isProfilePasswordMatch(existingSecurity, draft.currentPassword || "")) {
    throw new Error("Current password is incorrect.");
  }

  const security: ProfileSecurity = {
    ...existingSecurity,
    passwordHint: sanitizePasswordHint(draft.passwordHint),
  };

  await writeProfileSecurity(profileId, security);

  const updatedProfile: UserProfile = {
    ...existingProfile,
    updatedAt: new Date().toISOString(),
  };

  await writeProfileIndex({
    profiles: index.profiles.map((profile) => profile.id === profileId ? updatedProfile : profile),
  });
  await saveProfileFile(updatedProfile);

  return {
    hasPassword: true,
    passwordHint: security.passwordHint,
    passwordChangedAt: security.passwordChangedAt,
  };
}

export async function saveAnalyticsPreferences(profileId: string, preferences: AnalyticsPreferences) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  const now = new Date().toISOString();
  const analyticsPreferences = normalizeAnalyticsPreferences({
    ...preferences,
    updatedAt: preferences.updatedAt || now,
  });
  const profile: UserProfile = {
    ...existingProfile,
    analyticsPreferences,
    updatedAt: now,
  };
  const nextProfiles = index.profiles.map((currentProfile) => currentProfile.id === profileId ? profile : currentProfile);

  await writeProfileIndex({ profiles: nextProfiles });
  await saveProfileFile(profile);

  return analyticsPreferences;
}

export async function markProfileBackedUp(profileId: string) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);

  if (!existingProfile) {
    throw new Error("Profile not found.");
  }

  const profile: UserProfile = {
    ...existingProfile,
    lastBackupAt: new Date().toISOString(),
  };
  const nextProfiles = index.profiles.map((currentProfile) => currentProfile.id === profileId ? profile : currentProfile);

  await writeProfileIndex({ profiles: nextProfiles });
  await saveProfileFile(profile);

  return profile;
}

export async function saveClient(profileId: string, originalClientId: string | null, draft: ClientDraft) {
  if (!draft.name.trim()) {
    throw new Error("Client name is required.");
  }

  await ensureProfileDir(profileId);

  const clients = await readClients(profileId);
  const now = new Date().toISOString();
  const clientId = originalClientId || draft.id || uniqueEntityId("client");
  const existingClient = clients.find((client) => client.id === clientId);
  const avatar = await saveDataUrlAsset(profileId, `client-${clientId}`, draft.avatar || existingClient?.avatar);
  const client: Client = hydrateClient({
    id: clientId,
    name: draft.name.trim(),
    email: draft.email?.trim() || "",
    phone: draft.phone?.trim() || "",
    whatsapp: draft.whatsapp?.trim() || undefined,
    company: draft.company?.trim() || undefined,
    address: draft.address?.trim() || undefined,
    deliveryLink: draft.deliveryLink?.trim() || undefined,
    avatar: avatar || createAvatar(draft.name.trim()),
    notes: draft.notes?.trim() || undefined,
    createdAt: existingClient?.createdAt || now,
    updatedAt: now,
  });

  const nextClients = existingClient
    ? clients.map((currentClient) => currentClient.id === clientId ? client : currentClient)
    : [client, ...clients];

  await writeClients(profileId, nextClients);

  const invoices = await readInvoices(profileId);
  const nextInvoices = invoices.map((invoice) => {
    if (invoice.clientId !== clientId) {
      return invoice;
    }

    return hydrateInvoice({
      ...invoice,
      client: client.name,
      email: client.email,
      phone: client.phone,
      whatsapp: client.whatsapp,
      company: client.company,
      address: client.address,
      deliveryLink: client.deliveryLink,
      avatar: client.avatar,
    });
  });

  if (nextInvoices.some((invoice, index) => invoice !== invoices[index])) {
    await writeInvoices(profileId, nextInvoices);
  }

  return client;
}

export async function saveVendor(profileId: string, originalVendorId: string | null, draft: VendorDraft) {
  if (!draft.name.trim()) {
    throw new Error("Vendor name is required.");
  }

  await ensureProfileDir(profileId);

  const vendors = await readVendors(profileId);
  const now = new Date().toISOString();
  const vendorId = originalVendorId || draft.id || uniqueEntityId("vendor");
  const existingVendor = vendors.find((vendor) => vendor.id === vendorId);
  const avatar = await saveDataUrlAsset(profileId, `vendor-${vendorId}`, draft.avatar || existingVendor?.avatar);
  const vendor: Vendor = hydrateVendor({
    id: vendorId,
    name: draft.name.trim(),
    email: draft.email?.trim() || "",
    phone: draft.phone?.trim() || "",
    company: draft.company?.trim() || undefined,
    address: draft.address?.trim() || undefined,
    avatar: avatar || createAvatar(draft.name.trim()),
    notes: draft.notes?.trim() || undefined,
    paypal: draft.paypal?.trim() || undefined,
    stripe: draft.stripe?.trim() || undefined,
    createdAt: existingVendor?.createdAt || now,
    updatedAt: now,
  });

  const nextVendors = existingVendor
    ? vendors.map((currentVendor) => currentVendor.id === vendorId ? vendor : currentVendor)
    : [vendor, ...vendors];

  await writeVendors(profileId, nextVendors);

  const outsourcingInvoices = await readOutsourcingInvoices(profileId);
  const nextOutsourcingInvoices = outsourcingInvoices.map((invoice) => {
    if (invoice.vendorId !== vendorId) {
      return invoice;
    }

    return hydrateOutsourcingInvoice({
      ...invoice,
      vendor: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      company: vendor.company,
      address: vendor.address,
      avatar: vendor.avatar,
      paypal: vendor.paypal,
      stripe: vendor.stripe,
    });
  });

  if (nextOutsourcingInvoices.some((invoice, index) => invoice !== outsourcingInvoices[index])) {
    await writeOutsourcingInvoices(profileId, nextOutsourcingInvoices);
  }

  return vendor;
}

export async function saveInvoice({ profileId, invoice, clientSaveMode, client }: SaveInvoicePayload) {
  await ensureProfileDir(profileId);

  let regularClient: Client | null = null;

  if (clientSaveMode === "regular" && client?.name.trim()) {
    regularClient = await saveClient(profileId, client.id || null, client);
  }

  const invoices = await readInvoices(profileId);
  const existingInvoice = invoices.find((currentInvoice) => currentInvoice.id === invoice.id);
  const now = new Date().toISOString();
  const payments = await savePaymentRecordAssets(profileId, `invoice-${invoice.id}-payment`, invoice.payments || []);
  const receiptAttachments = await savePaymentAttachmentAssets(profileId, `invoice-${invoice.id}-receipt`, invoice.receiptAttachments || []);
  const amountPaid = typeof invoice.amountPaid === "number" ? invoice.amountPaid : getPaymentRecordsTotal(payments);
  const latestPayment = getLatestPayment(payments);
  const hydratedInvoice = hydrateInvoice({
    ...invoice,
    amountPaid,
    paidAt: invoice.paidAt || latestPayment?.paidAt,
    paymentMethod: invoice.paymentMethod || latestPayment?.method,
    receiptAttachments,
    payments,
    clientId: invoice.clientId || regularClient?.id,
    avatar: invoice.avatar || regularClient?.avatar || createAvatar(invoice.client),
    statusColor: getStatusColor(invoice.status),
    clientColor: "bg-foreground/10",
    createdAt: existingInvoice?.createdAt || invoice.createdAt || now,
    updatedAt: now,
  });

  const nextInvoices = existingInvoice
    ? invoices.map((currentInvoice) => currentInvoice.id === hydratedInvoice.id ? hydratedInvoice : currentInvoice)
    : [hydratedInvoice, ...invoices];

  await writeInvoices(profileId, nextInvoices);

  return hydratedInvoice;
}

export async function saveOutsourcingInvoice({ profileId, invoice, vendorSaveMode, vendor }: SaveOutsourcingInvoicePayload) {
  await ensureProfileDir(profileId);

  let regularVendor: Vendor | null = null;

  if (vendorSaveMode === "regular" && vendor?.name.trim()) {
    regularVendor = await saveVendor(profileId, vendor.id || null, vendor);
  }

  const invoices = await readOutsourcingInvoices(profileId);
  const existingInvoice = invoices.find((currentInvoice) => currentInvoice.id === invoice.id);
  const now = new Date().toISOString();
  const payments = await savePaymentRecordAssets(profileId, `outsourcing-${invoice.id}-payment`, invoice.payments || []);
  const receiptAttachments = await savePaymentAttachmentAssets(profileId, `outsourcing-${invoice.id}-receipt`, invoice.receiptAttachments || []);
  const amountPaid = typeof invoice.amountPaid === "number" ? invoice.amountPaid : getPaymentRecordsTotal(payments);
  const latestPayment = getLatestPayment(payments);
  const hydratedInvoice = hydrateOutsourcingInvoice({
    ...invoice,
    amountPaid,
    paidAt: invoice.paidAt || latestPayment?.paidAt,
    paymentMethod: invoice.paymentMethod || latestPayment?.method,
    receiptAttachments,
    payments,
    vendorId: invoice.vendorId || regularVendor?.id,
    avatar: invoice.avatar || regularVendor?.avatar || createAvatar(invoice.vendor),
    statusColor: getStatusColor(invoice.status),
    vendorColor: "bg-foreground/10",
    createdAt: existingInvoice?.createdAt || invoice.createdAt || now,
    updatedAt: now,
  });

  const nextInvoices = existingInvoice
    ? invoices.map((currentInvoice) => currentInvoice.id === hydratedInvoice.id ? hydratedInvoice : currentInvoice)
    : [hydratedInvoice, ...invoices];

  await writeOutsourcingInvoices(profileId, nextInvoices);

  return hydratedInvoice;
}

export async function saveTodoTasks(profileId: string, tasks: TodoTask[]) {
  await ensureProfileDir(profileId);

  const normalizedTasks = tasks.map((task, index) => hydrateTodoTask({
    ...task,
    order: Number.isFinite(task.order) ? task.order : index,
    updatedAt: new Date().toISOString(),
  }, index));

  await writeTodoTasks(profileId, normalizedTasks);

  return normalizedTasks;
}

export function getAssetFilePath(profileId: string, fileName: string) {
  assertSafeProfileId(profileId);

  const safeFileName = path.basename(fileName);
  const assetPath = path.join(getAssetDir(profileId), safeFileName);
  const resolvedAssetPath = path.resolve(assetPath);
  const resolvedAssetDir = path.resolve(getAssetDir(profileId));

  if (!resolvedAssetPath.startsWith(resolvedAssetDir)) {
    throw new Error("Invalid asset path.");
  }

  return resolvedAssetPath;
}

export async function deleteProfile(profileId: string) {
  const index = await readProfileIndex();
  const existingProfile = index.profiles.find((profile) => profile.id === profileId);
  if (!existingProfile) return;

  const nextProfiles = index.profiles.filter((profile) => profile.id !== profileId);
  await writeProfileIndex({ profiles: nextProfiles });

  try {
    await fs.rm(getProfileDir(profileId), { recursive: true, force: true });
  } catch {
    // ignore
  }
}

export async function deleteAllProfiles() {
  await writeProfileIndex({ profiles: [] });
  
  try {
    const items = await fs.readdir(USER_DATA_DIR);
    for (const item of items) {
      if (item !== "profiles.json") {
        const itemPath = path.join(USER_DATA_DIR, item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          await fs.rm(itemPath, { recursive: true, force: true });
        }
      }
    }
  } catch {
    // ignore
  }
}

export async function deleteInvoices(profileId: string, invoiceIds: string[]) {
  await ensureProfileDir(profileId);
  const invoices = await readInvoices(profileId);
  const idsSet = new Set(invoiceIds);
  const deletedInvoices = invoices.filter((inv) => idsSet.has(inv.id));
  const nextInvoices = invoices.filter((inv) => !idsSet.has(inv.id));

  if (deletedInvoices.length > 0) {
    const trash = await readTrash(profileId);
    const now = new Date().toISOString();
    const newTrashItems: TrashItem[] = deletedInvoices.map((inv) => ({
      id: inv.id,
      deletedAt: now,
      type: "invoice",
      data: inv,
    }));
    await writeTrash(profileId, [...newTrashItems, ...trash]);
  }

  await writeInvoices(profileId, nextInvoices);
  return nextInvoices;
}

export async function restoreInvoices(profileId: string, invoiceIds: string[]) {
  await ensureProfileDir(profileId);
  const trash = await readTrash(profileId);
  const invoices = await readInvoices(profileId);
  const idsSet = new Set(invoiceIds);

  const restoredItems = trash.filter((item) => idsSet.has(item.id) && item.type === "invoice");
  const nextTrash = trash.filter((item) => !(idsSet.has(item.id) && item.type === "invoice"));

  if (restoredItems.length > 0) {
    const restoredInvoices = restoredItems.map((item) => hydrateInvoice(item.data));
    await writeInvoices(profileId, [...restoredInvoices, ...invoices]);
  }
  await writeTrash(profileId, nextTrash);
  return {
    invoices: await readInvoices(profileId),
    trash: nextTrash,
  };
}

export async function emptyTrash(profileId: string) {
  await ensureProfileDir(profileId);
  await writeTrash(profileId, []);
  return [];
}

export async function updateInvoicesStatus(
  profileId: string,
  invoiceIds: string[],
  status: InvoiceStatus,
  workflowStatus?: InvoiceWorkflowStatus
) {
  await ensureProfileDir(profileId);
  const invoices = await readInvoices(profileId);
  const idsSet = new Set(invoiceIds);
  const now = new Date().toISOString();
  
  const nextInvoices = invoices.map((inv) => {
    if (idsSet.has(inv.id)) {
      return hydrateInvoice({
        ...inv,
        status,
        statusColor: getStatusColor(status),
        workflowStatus: workflowStatus !== undefined ? workflowStatus : inv.workflowStatus,
        updatedAt: now,
      });
    }
    return inv;
  });

  await writeInvoices(profileId, nextInvoices);
  return nextInvoices;
}

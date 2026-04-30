import { promises as fs } from "fs";
import path from "path";
import {
  createAvatar,
  getInvoiceItemsTotal,
  getStatusColor,
  type Client,
  type Invoice,
  type OutsourcingInvoice,
  type UserProfile,
  type Vendor,
} from "@/data/invoices";
import { createDefaultTodoTasks, TODO_PRIORITIES, TODO_STAGES, type TodoTask } from "@/data/todos";

const USER_DATA_DIR = path.join(process.cwd(), "User data");
const PROFILE_INDEX_PATH = path.join(USER_DATA_DIR, "profiles.json");
const MAX_PROFILES = 5;

type ProfileIndex = {
  profiles: UserProfile[];
};

type ProfileDraft = {
  name: string;
  profession: string;
  email?: string;
  phone?: string;
  businessName?: string;
  profilePic?: string;
  signature?: string;
};

type ClientDraft = {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
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

function getProfileDataPath(profileId: string, fileName: "clients.json" | "invoices.json" | "profile.json" | "vendors.json" | "outsourcing-invoices.json" | "todo-tasks.json") {
  return path.join(getProfileDir(profileId), fileName);
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

  const match = value.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);

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

async function normalizeProfileAssets(profileId: string, draft: ProfileDraft, existingProfile?: UserProfile): Promise<UserProfile> {
  const now = new Date().toISOString();

  return {
    id: profileId,
    name: draft.name.trim(),
    profession: draft.profession.trim(),
    email: draft.email?.trim() || undefined,
    phone: draft.phone?.trim() || undefined,
    businessName: draft.businessName?.trim() || undefined,
    profilePic: await saveDataUrlAsset(profileId, "profile-picture", draft.profilePic || existingProfile?.profilePic),
    signature: await saveDataUrlAsset(profileId, "signature", draft.signature || existingProfile?.signature),
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
  };
}

function hydrateClient(client: Client): Client {
  return {
    ...client,
    id: client.id || uniqueEntityId("client"),
    name: client.name || "Unnamed Client",
    email: client.email || "",
    phone: client.phone || "",
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

  return {
    ...invoice,
    items,
    total,
    subtotal: typeof invoice.subtotal === "number" ? invoice.subtotal : total,
    statusColor: getStatusColor(invoice.status),
    clientColor: invoice.clientColor || "bg-[var(--foreground)]/10",
    avatar: invoice.avatar || createAvatar(invoice.client),
    templateId: invoice.templateId || "classic",
    templateName: invoice.templateName || "Classic Invoice",
  };
}

function hydrateOutsourcingInvoice(invoice: OutsourcingInvoice): OutsourcingInvoice {
  const items = invoice.items || [];
  const total = typeof invoice.total === "number" ? invoice.total : getInvoiceItemsTotal(items);

  return {
    ...invoice,
    items,
    total,
    subtotal: typeof invoice.subtotal === "number" ? invoice.subtotal : total,
    statusColor: getStatusColor(invoice.status),
    vendorColor: invoice.vendorColor || "bg-[var(--foreground)]/10",
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

async function saveProfileFile(profile: UserProfile) {
  await writeJson(getProfileDataPath(profile.id, "profile.json"), profile);
}

function resolveActiveProfile(profiles: UserProfile[], requestedProfileId?: string | null) {
  if (requestedProfileId && profiles.some((profile) => profile.id === requestedProfileId)) {
    return requestedProfileId;
  }

  return profiles[0]?.id || null;
}

export async function loadLocalDataSnapshot(requestedProfileId?: string | null): Promise<LocalDataSnapshot> {
  const { profiles } = await readProfileIndex();
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
    userDataPath: USER_DATA_DIR,
  };
}

export async function createProfile(draft: ProfileDraft) {
  if (!draft.name.trim() || !draft.profession.trim()) {
    throw new Error("Name and profession are required.");
  }

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
  await writeClients(profileId, []);
  await writeInvoices(profileId, []);
  await writeVendors(profileId, []);
  await writeOutsourcingInvoices(profileId, []);
  await writeTodoTasks(profileId, createDefaultTodoTasks());

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
    company: draft.company?.trim() || undefined,
    address: draft.address?.trim() || undefined,
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
      company: client.company,
      address: client.address,
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
  const hydratedInvoice = hydrateInvoice({
    ...invoice,
    clientId: invoice.clientId || regularClient?.id,
    avatar: invoice.avatar || regularClient?.avatar || createAvatar(invoice.client),
    statusColor: getStatusColor(invoice.status),
    clientColor: "bg-[var(--foreground)]/10",
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
  const hydratedInvoice = hydrateOutsourcingInvoice({
    ...invoice,
    vendorId: invoice.vendorId || regularVendor?.id,
    avatar: invoice.avatar || regularVendor?.avatar || createAvatar(invoice.vendor),
    statusColor: getStatusColor(invoice.status),
    vendorColor: "bg-[var(--foreground)]/10",
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
  } catch (error) {
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
  } catch (error) {
    // ignore
  }
}

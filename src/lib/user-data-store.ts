import { promises as fs } from "fs";
import path from "path";
import {
  createAvatar,
  getInvoiceItemsTotal,
  getStatusColor,
  type Client,
  type Invoice,
  type UserProfile,
} from "@/data/invoices";

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

export type LocalDataSnapshot = {
  profiles: UserProfile[];
  activeProfileId: string | null;
  activeProfile: UserProfile | null;
  clients: Client[];
  invoices: Invoice[];
  userDataPath: string;
};

export type SaveInvoicePayload = {
  profileId: string;
  invoice: Invoice;
  clientSaveMode?: "regular" | "onetime";
  client?: ClientDraft;
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

function getProfileDataPath(profileId: string, fileName: "clients.json" | "invoices.json" | "profile.json") {
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

async function readClients(profileId: string) {
  const clients = await readJson<Client[]>(getProfileDataPath(profileId, "clients.json"), []);
  return clients.map(hydrateClient);
}

async function writeClients(profileId: string, clients: Client[]) {
  await writeJson(getProfileDataPath(profileId, "clients.json"), clients.map(hydrateClient));
}

async function readInvoices(profileId: string) {
  const invoices = await readJson<Invoice[]>(getProfileDataPath(profileId, "invoices.json"), []);
  return invoices.map(hydrateInvoice);
}

async function writeInvoices(profileId: string, invoices: Invoice[]) {
  await writeJson(getProfileDataPath(profileId, "invoices.json"), invoices.map(hydrateInvoice));
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

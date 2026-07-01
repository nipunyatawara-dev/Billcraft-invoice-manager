import {
  changeProfilePassword,
  createProfile,
  deleteAllProfiles,
  deleteCatalogItem,
  deleteExpense,
  deleteInvoices,
  deleteProfile,
  emptyTrash,
  markProfileBackedUp,
  restoreInvoices,
  saveAnalyticsPreferences,
  saveCatalogItem,
  saveClient,
  saveExpense,
  saveInvoice,
  saveOutsourcingInvoice,
  saveTodoTasks,
  saveVendor,
  updateInvoicesStatus,
  updateProfile,
  updateProfilePasswordHint,
  verifyProfilePassword,
  type SaveInvoicePayload,
  type SaveOutsourcingInvoicePayload,
} from "@/lib/user-data-store";
import type { InvoiceStatus, InvoiceWorkflowStatus } from "@/data/invoices";

export type UserDataAction =
  | { action: "createProfile"; profile: Parameters<typeof createProfile>[0] }
  | { action: "updateProfile"; profileId: string; profile: Parameters<typeof updateProfile>[1] }
  | { action: "verifyProfilePassword"; profileId: string; password: string }
  | { action: "changeProfilePassword"; profileId: string; password: Parameters<typeof changeProfilePassword>[1] }
  | { action: "updateProfilePasswordHint"; profileId: string; hint: Parameters<typeof updateProfilePasswordHint>[1] }
  | { action: "saveClient"; profileId: string; originalClientId: string | null; client: Parameters<typeof saveClient>[2] }
  | ({ action: "saveInvoice" } & SaveInvoicePayload)
  | { action: "saveAnalyticsPreferences"; profileId: string; preferences: Parameters<typeof saveAnalyticsPreferences>[1] }
  | { action: "markProfileBackedUp"; profileId: string }
  | { action: "saveVendor"; profileId: string; originalVendorId: string | null; vendor: Parameters<typeof saveVendor>[2] }
  | ({ action: "saveOutsourcingInvoice" } & SaveOutsourcingInvoicePayload)
  | { action: "saveTodoTasks"; profileId: string; tasks: Parameters<typeof saveTodoTasks>[1] }
  | { action: "saveExpense"; profileId: string; expense: Parameters<typeof saveExpense>[1] }
  | { action: "deleteExpense"; profileId: string; expenseId: string }
  | { action: "saveCatalogItem"; profileId: string; item: Parameters<typeof saveCatalogItem>[1] }
  | { action: "deleteCatalogItem"; profileId: string; itemId: string }
  | { action: "deleteProfile"; profileId: string }
  | { action: "deleteAllProfiles" }
  | { action: "deleteInvoices"; profileId: string; invoiceIds: string[] }
  | { action: "updateInvoicesStatus"; profileId: string; invoiceIds: string[]; status: InvoiceStatus; workflowStatus?: InvoiceWorkflowStatus }
  | { action: "restoreInvoices"; profileId: string; invoiceIds: string[] }
  | { action: "emptyTrash"; profileId: string };

type ActionHandler<K extends UserDataAction["action"]> = (
  body: Extract<UserDataAction, { action: K }>,
) => Promise<string | null>;

const userDataActionHandlers: {
  [K in UserDataAction["action"]]: ActionHandler<K>;
} = {
  createProfile: async (body) => (await createProfile(body.profile)).id,
  updateProfile: async (body) => (await updateProfile(body.profileId, body.profile)).id,
  verifyProfilePassword: async (body) => {
    await verifyProfilePassword(body.profileId, body.password);
    return body.profileId;
  },
  changeProfilePassword: async (body) => {
    await changeProfilePassword(body.profileId, body.password);
    return body.profileId;
  },
  updateProfilePasswordHint: async (body) => {
    await updateProfilePasswordHint(body.profileId, body.hint);
    return body.profileId;
  },
  saveClient: async (body) => {
    const client = await saveClient(body.profileId, body.originalClientId, body.client);
    return body.profileId || client.id;
  },
  saveInvoice: async (body) => {
    const invoice = await saveInvoice(body);
    return body.profileId || invoice.clientId || null;
  },
  saveAnalyticsPreferences: async (body) => {
    await saveAnalyticsPreferences(body.profileId, body.preferences);
    return body.profileId;
  },
  markProfileBackedUp: async (body) => {
    await markProfileBackedUp(body.profileId);
    return body.profileId;
  },
  saveVendor: async (body) => {
    const vendor = await saveVendor(body.profileId, body.originalVendorId, body.vendor);
    return body.profileId || vendor.id;
  },
  saveOutsourcingInvoice: async (body) => {
    const invoice = await saveOutsourcingInvoice(body);
    return body.profileId || invoice.vendorId || null;
  },
  saveTodoTasks: async (body) => {
    await saveTodoTasks(body.profileId, body.tasks);
    return body.profileId;
  },
  saveExpense: async (body) => {
    await saveExpense(body.profileId, body.expense);
    return body.profileId;
  },
  deleteExpense: async (body) => {
    await deleteExpense(body.profileId, body.expenseId);
    return body.profileId;
  },
  saveCatalogItem: async (body) => {
    await saveCatalogItem(body.profileId, body.item);
    return body.profileId;
  },
  deleteCatalogItem: async (body) => {
    await deleteCatalogItem(body.profileId, body.itemId);
    return body.profileId;
  },
  deleteProfile: async (body) => {
    await deleteProfile(body.profileId);
    return null;
  },
  deleteAllProfiles: async () => {
    await deleteAllProfiles();
    return null;
  },
  deleteInvoices: async (body) => {
    await deleteInvoices(body.profileId, body.invoiceIds);
    return body.profileId;
  },
  updateInvoicesStatus: async (body) => {
    await updateInvoicesStatus(body.profileId, body.invoiceIds, body.status, body.workflowStatus);
    return body.profileId;
  },
  restoreInvoices: async (body) => {
    await restoreInvoices(body.profileId, body.invoiceIds);
    return body.profileId;
  },
  emptyTrash: async (body) => {
    await emptyTrash(body.profileId);
    return body.profileId;
  },
};

export async function dispatchUserDataAction(body: UserDataAction): Promise<string | null> {
  const action = body.action;

  if (!action || typeof action !== "string" || !(action in userDataActionHandlers)) {
    throw new Error(`Unknown action: ${String(action)}`);
  }

  const handler = userDataActionHandlers[action] as ActionHandler<typeof action>;
  return handler(body as Extract<UserDataAction, { action: typeof action }>);
}

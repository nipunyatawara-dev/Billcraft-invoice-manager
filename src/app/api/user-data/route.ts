import { NextRequest, NextResponse } from "next/server";
import {
  changeProfilePassword,
  createProfile,
  loadLocalDataSnapshot,
  markProfileBackedUp,
  saveClient,
  saveInvoice,
  saveAnalyticsPreferences,
  saveOutsourcingInvoice,
  saveTodoTasks,
  saveVendor,
  updateProfile,
  updateProfilePasswordHint,
  verifyProfilePassword,
  deleteProfile,
  deleteAllProfiles,
  deleteInvoices,
  updateInvoicesStatus,
  restoreInvoices,
  emptyTrash,
  saveExpense,
  deleteExpense,
  saveCatalogItem,
  deleteCatalogItem,
  type SaveInvoicePayload,
  type SaveOutsourcingInvoicePayload,
} from "@/lib/user-data-store";
import type { InvoiceStatus, InvoiceWorkflowStatus } from "@/data/invoices";

export const runtime = "nodejs";

type UserDataAction =
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

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to update local user data.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const profileId = request.nextUrl.searchParams.get("profileId");
    const snapshot = await loadLocalDataSnapshot(profileId);

    return NextResponse.json(snapshot);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UserDataAction;
    let activeProfileId: string | null = null;

    if (body.action === "createProfile") {
      const profile = await createProfile(body.profile);
      activeProfileId = profile.id;
    }

    if (body.action === "updateProfile") {
      const profile = await updateProfile(body.profileId, body.profile);
      activeProfileId = profile.id;
    }

    if (body.action === "verifyProfilePassword") {
      await verifyProfilePassword(body.profileId, body.password);
      activeProfileId = body.profileId;
    }

    if (body.action === "changeProfilePassword") {
      await changeProfilePassword(body.profileId, body.password);
      activeProfileId = body.profileId;
    }

    if (body.action === "updateProfilePasswordHint") {
      await updateProfilePasswordHint(body.profileId, body.hint);
      activeProfileId = body.profileId;
    }

    if (body.action === "saveClient") {
      const client = await saveClient(body.profileId, body.originalClientId, body.client);
      activeProfileId = body.profileId || client.id;
    }

    if (body.action === "saveInvoice") {
      const invoice = await saveInvoice(body);
      activeProfileId = body.profileId || invoice.clientId || null;
    }

    if (body.action === "saveAnalyticsPreferences") {
      await saveAnalyticsPreferences(body.profileId, body.preferences);
      activeProfileId = body.profileId;
    }

    if (body.action === "markProfileBackedUp") {
      await markProfileBackedUp(body.profileId);
      activeProfileId = body.profileId;
    }

    if (body.action === "saveVendor") {
      const vendor = await saveVendor(body.profileId, body.originalVendorId, body.vendor);
      activeProfileId = body.profileId || vendor.id;
    }

    if (body.action === "saveOutsourcingInvoice") {
      const invoice = await saveOutsourcingInvoice(body);
      activeProfileId = body.profileId || invoice.vendorId || null;
    }

    if (body.action === "saveTodoTasks") {
      await saveTodoTasks(body.profileId, body.tasks);
      activeProfileId = body.profileId;
    }

    if (body.action === "saveExpense") {
      await saveExpense(body.profileId, body.expense);
      activeProfileId = body.profileId;
    }

    if (body.action === "deleteExpense") {
      await deleteExpense(body.profileId, body.expenseId);
      activeProfileId = body.profileId;
    }

    if (body.action === "saveCatalogItem") {
      await saveCatalogItem(body.profileId, body.item);
      activeProfileId = body.profileId;
    }

    if (body.action === "deleteCatalogItem") {
      await deleteCatalogItem(body.profileId, body.itemId);
      activeProfileId = body.profileId;
    }

    if (body.action === "deleteProfile") {
      await deleteProfile(body.profileId);
      activeProfileId = null;
    }

    if (body.action === "deleteAllProfiles") {
      await deleteAllProfiles();
      activeProfileId = null;
    }

    if (body.action === "deleteInvoices") {
      await deleteInvoices(body.profileId, body.invoiceIds);
      activeProfileId = body.profileId;
    }

    if (body.action === "updateInvoicesStatus") {
      await updateInvoicesStatus(body.profileId, body.invoiceIds, body.status, body.workflowStatus);
      activeProfileId = body.profileId;
    }

    if (body.action === "restoreInvoices") {
      await restoreInvoices(body.profileId, body.invoiceIds);
      activeProfileId = body.profileId;
    }

    if (body.action === "emptyTrash") {
      await emptyTrash(body.profileId);
      activeProfileId = body.profileId;
    }

    const snapshot = await loadLocalDataSnapshot(activeProfileId);

    return NextResponse.json(snapshot);
  } catch (error) {
    return errorResponse(error);
  }
}

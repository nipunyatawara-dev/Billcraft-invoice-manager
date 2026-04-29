import { NextRequest, NextResponse } from "next/server";
import {
  createProfile,
  loadLocalDataSnapshot,
  saveClient,
  saveInvoice,
  saveOutsourcingInvoice,
  saveVendor,
  updateProfile,
  deleteProfile,
  deleteAllProfiles,
  type SaveInvoicePayload,
  type SaveOutsourcingInvoicePayload,
} from "@/lib/user-data-store";

export const runtime = "nodejs";

type UserDataAction =
  | { action: "createProfile"; profile: Parameters<typeof createProfile>[0] }
  | { action: "updateProfile"; profileId: string; profile: Parameters<typeof updateProfile>[1] }
  | { action: "saveClient"; profileId: string; originalClientId: string | null; client: Parameters<typeof saveClient>[2] }
  | ({ action: "saveInvoice" } & SaveInvoicePayload)
  | { action: "saveVendor"; profileId: string; originalVendorId: string | null; vendor: Parameters<typeof saveVendor>[2] }
  | ({ action: "saveOutsourcingInvoice" } & SaveOutsourcingInvoicePayload)
  | { action: "deleteProfile"; profileId: string }
  | { action: "deleteAllProfiles" };

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

    if (body.action === "saveClient") {
      const client = await saveClient(body.profileId, body.originalClientId, body.client);
      activeProfileId = body.profileId || client.id;
    }

    if (body.action === "saveInvoice") {
      const invoice = await saveInvoice(body);
      activeProfileId = body.profileId || invoice.clientId || null;
    }

    if (body.action === "saveVendor") {
      const vendor = await saveVendor(body.profileId, body.originalVendorId, body.vendor);
      activeProfileId = body.profileId || vendor.id;
    }

    if (body.action === "saveOutsourcingInvoice") {
      const invoice = await saveOutsourcingInvoice(body);
      activeProfileId = body.profileId || invoice.vendorId || null;
    }

    if (body.action === "deleteProfile") {
      await deleteProfile(body.profileId);
      activeProfileId = null;
    }

    if (body.action === "deleteAllProfiles") {
      await deleteAllProfiles();
      activeProfileId = null;
    }

    const snapshot = await loadLocalDataSnapshot(activeProfileId);

    return NextResponse.json(snapshot);
  } catch (error) {
    return errorResponse(error);
  }
}

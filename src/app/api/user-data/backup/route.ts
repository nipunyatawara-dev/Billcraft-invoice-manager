import { NextRequest, NextResponse } from "next/server";
import { parseBackupFile, type BillCraftBackup, type ImportMode } from "@/lib/backup-restore";
import { withUserDataLock } from "@/lib/file-lock";
import { exportProfileBackup, getSnapshotEtag, importProfileBackup, loadLocalDataSnapshot } from "@/lib/user-data-store";

export const runtime = "nodejs";

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unable to process backup.";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json({ error: "Profile id is required." }, { status: 400 });
    }

    const backup = await exportProfileBackup(profileId);
    return NextResponse.json(backup);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      profileId?: string;
      backup?: unknown;
      mode?: ImportMode;
    };

    if (!body.profileId) {
      return NextResponse.json({ error: "Profile id is required." }, { status: 400 });
    }

    const backup = parseBackupFile(body.backup) as BillCraftBackup;
    const mode = body.mode === "merge" ? "merge" : "replace";

    const activeProfileId = await withUserDataLock(async () => {
      await importProfileBackup(body.profileId!, backup, mode);
      return body.profileId!;
    });

    const snapshot = await loadLocalDataSnapshot(activeProfileId);
    const etag = await getSnapshotEtag(activeProfileId);

    return NextResponse.json(snapshot, {
      headers: {
        ETag: etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

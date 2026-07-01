import { NextRequest, NextResponse } from "next/server";
import { dispatchUserDataAction, type UserDataAction } from "@/lib/user-data-actions";
import { withUserDataLock } from "@/lib/file-lock";
import { getSnapshotEtag, loadLocalDataSnapshot } from "@/lib/user-data-store";

export const runtime = "nodejs";

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unable to update local user data.";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const profileId = request.nextUrl.searchParams.get("profileId");
    const etag = await getSnapshotEtag(profileId);
    const ifNoneMatch = request.headers.get("if-none-match");

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    const snapshot = await loadLocalDataSnapshot(profileId);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UserDataAction;

    const activeProfileId = await withUserDataLock(async () => dispatchUserDataAction(body));
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

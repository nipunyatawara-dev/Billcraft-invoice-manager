import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getAssetFilePath } from "@/lib/user-data-store";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  const fileName = request.nextUrl.searchParams.get("file");

  if (!profileId || !fileName) {
    return NextResponse.json({ error: "Missing asset parameters." }, { status: 400 });
  }

  try {
    const assetPath = getAssetFilePath(profileId, fileName);
    const file = await fs.readFile(assetPath);
    const contentType = MIME_TYPES[path.extname(assetPath).toLowerCase()] || "application/octet-stream";

    return new Response(file, {
      headers: {
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}

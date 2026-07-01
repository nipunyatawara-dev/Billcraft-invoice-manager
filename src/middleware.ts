import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";

  if (!LOCAL_HOSTS.has(host)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export const config = {
  matcher: "/api/:path*",
};

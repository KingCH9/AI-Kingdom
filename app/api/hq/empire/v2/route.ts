import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Legacy V2 API path — use GET /api/hq/empire (Phase 4D). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/v2\/?$/, "");
  return NextResponse.redirect(url, { status: 308 });
}

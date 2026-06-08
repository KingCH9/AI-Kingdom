import { NextResponse } from "next/server";

/**
 * @deprecated Use POST /api/opportunities/generate instead.
 * GET no longer creates opportunities (side-effect removed in Phase 2).
 */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      deprecated: true,
      message:
        "GET /api/empire is deprecated. Use POST /api/opportunities/generate to create opportunities.",
      migrateTo: "/api/opportunities/generate",
    },
    { status: 410 }
  );
}

import { NextResponse } from "next/server";
import { getHqSnapshot } from "@/lib/hq/queries/hq-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getHqSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("[hq] snapshot failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to load HQ snapshot",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCaePayload } from "@/lib/hq/capital";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getCaePayload();
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error("[hq/capital] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load capital allocation data",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getRaeVenturesPayload } from "@/lib/hq/revenue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getRaeVenturesPayload();
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error("[hq/revenue/ventures] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load venture revenue data",
      },
      { status: 500 }
    );
  }
}

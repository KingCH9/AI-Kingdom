import { NextResponse } from "next/server";
import { getVsePayload } from "@/lib/hq/ventures";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getVsePayload();
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error("[hq/ventures] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load venture scaling data",
      },
      { status: 500 }
    );
  }
}

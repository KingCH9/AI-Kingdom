import { NextResponse } from "next/server";
import { getRaeDepartmentsPayload } from "@/lib/hq/revenue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getRaeDepartmentsPayload();
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error("[hq/revenue/departments] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load department revenue data",
      },
      { status: 500 }
    );
  }
}

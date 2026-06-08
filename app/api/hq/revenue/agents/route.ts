import { NextResponse } from "next/server";
import { getRaeAgentsPayload } from "@/lib/hq/revenue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getRaeAgentsPayload();
    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    console.error("[hq/revenue/agents] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load agent revenue contributions",
      },
      { status: 500 }
    );
  }
}

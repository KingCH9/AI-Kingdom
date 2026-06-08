import { NextResponse } from "next/server";
import { getCommandCenterSnapshot } from "@/lib/hq/orchestration";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getCommandCenterSnapshot();
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error) {
    console.error("[hq/command] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load command center snapshot",
      },
      { status: 500 }
    );
  }
}

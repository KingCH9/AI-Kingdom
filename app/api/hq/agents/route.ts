import { NextResponse } from "next/server";
import { getAgentWorkstationSnapshot } from "@/lib/hq/workstations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getAgentWorkstationSnapshot();
    return NextResponse.json({
      success: true,
      agents: snapshot.agents,
      rankings: snapshot.rankings,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/agents] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load agent workstations",
      },
      { status: 500 }
    );
  }
}

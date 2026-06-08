import { NextResponse } from "next/server";
import { getPerformanceSnapshot } from "@/lib/hq/performance/performance-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getPerformanceSnapshot();
    return NextResponse.json({
      success: true,
      agents: snapshot.agents,
      scouts: snapshot.scouts,
      topAgents: snapshot.topAgents,
      topScouts: snapshot.topScouts,
      summary: snapshot.summary,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/performance] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load performance snapshots",
      },
      { status: 500 }
    );
  }
}

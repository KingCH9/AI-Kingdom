import { NextResponse } from "next/server";
import { getNovaGrowthSnapshot } from "@/lib/hq/nova/growth-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getNovaGrowthSnapshot();
    return NextResponse.json({
      success: true,
      agents: snapshot.agents.map((a) => ({
        agentKey: a.agentKey,
        name: a.name,
        level: a.level,
        xp: a.xp,
        nextLevelXp: a.nextLevelXp,
        score: a.score,
        launchedMissions: a.launchedMissions,
        growingMissions: a.growingMissions,
        profitableMissions: a.profitableMissions,
        contentMissions: a.contentMissions,
        trackedMissions: a.trackedMissions,
        revenueGenerated: a.revenueGenerated,
        ventureDiversity: a.ventureDiversity,
      })),
      rankings: snapshot.rankings,
      campaignPerformance: snapshot.campaignPerformance,
      summary: snapshot.summary,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/nova] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Nova growth metrics",
      },
      { status: 500 }
    );
  }
}

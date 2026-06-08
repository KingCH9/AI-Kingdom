import { NextResponse } from "next/server";
import { getMercurySnapshot } from "@/lib/hq/mercury/profitability-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getMercurySnapshot();
    return NextResponse.json({
      success: true,
      agents: snapshot.agents.map((a) => ({
        agentKey: a.agentKey,
        name: a.name,
        level: a.level,
        xp: a.xp,
        nextLevelXp: a.nextLevelXp,
        score: a.score,
        profitableMissions: a.profitableMissions,
        costTrackedMissions: a.costTrackedMissions,
        spendEvents: a.spendEvents,
        profitableVentures: a.profitableVentures,
        fundRecommendations: a.fundRecommendations,
        totalProfitGbp: a.totalProfitGbp,
      })),
      portfolioHealth: snapshot.portfolioHealth,
      recommendations: snapshot.recommendations,
      rankings: snapshot.rankings,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/mercury] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Mercury profitability metrics",
      },
      { status: 500 }
    );
  }
}

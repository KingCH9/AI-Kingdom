import { NextResponse } from "next/server";
import { getAthenaIntelligenceSnapshot } from "@/lib/hq/athena/intelligence-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getAthenaIntelligenceSnapshot();
    return NextResponse.json({
      success: true,
      scouts: snapshot.scouts.map((s) => ({
        scoutKey: s.scoutKey,
        name: s.name,
        level: s.level,
        xp: s.xp,
        nextLevelXp: s.nextLevelXp,
        score: s.score,
        opportunitiesFound: s.opportunitiesFound,
        opportunitiesApproved: s.opportunitiesApproved,
        missionsCreated: s.missionsCreated,
        missionsLaunched: s.missionsLaunched,
        revenueGenerated: s.revenueGenerated,
        successRate: s.successRate,
      })),
      topScouts: snapshot.topScouts.map((s) => ({
        scoutKey: s.scoutKey,
        name: s.name,
        score: s.score,
        level: s.level,
        xp: s.xp,
      })),
      scoutRankings: snapshot.scoutRankings,
      summary: snapshot.summary,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/scouts] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load scout intelligence",
      },
      { status: 500 }
    );
  }
}

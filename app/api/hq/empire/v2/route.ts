import { NextResponse } from "next/server";
import { getEmpireScoreV2Snapshot } from "@/lib/hq/empire/score-v2-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getEmpireScoreV2Snapshot();
    return NextResponse.json({
      success: true,
      empireScoreV2: snapshot.empireScoreV2,
      empireScoreV1: snapshot.empireScoreV1,
      componentScores: snapshot.componentScores,
      componentWeights: snapshot.componentWeights,
      departmentScores: snapshot.departmentScores,
      topAgents: snapshot.rankings.topAgents,
      topScouts: snapshot.rankings.topScouts,
      portfolioHealth: snapshot.portfolioHealth,
      ventureDiversification: snapshot.ventureDiversification,
      strengths: snapshot.strengths,
      weaknesses: snapshot.weaknesses,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/empire/v2] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Empire Score V2",
      },
      { status: 500 }
    );
  }
}

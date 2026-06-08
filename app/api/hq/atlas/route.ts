import { NextResponse } from "next/server";
import { getAtlasDashboardSnapshot } from "@/lib/hq/atlas/ceo-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getAtlasDashboardSnapshot();
    return NextResponse.json({
      success: true,
      empireScore: snapshot.empireScore,
      priorityMissions: snapshot.priorityMissions,
      recommendations: snapshot.recommendations,
      recommendationCounts: snapshot.recommendationCounts,
      departmentWorkloads: snapshot.departmentWorkloads,
      workloadSummary: snapshot.workloadSummary,
      portfolioSummary: snapshot.portfolioSummary,
      scoutRankings: snapshot.scoutRankings,
      executiveSummary: snapshot.executiveSummary,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/atlas] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Atlas CEO dashboard",
      },
      { status: 500 }
    );
  }
}

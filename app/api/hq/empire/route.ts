import { NextResponse } from "next/server";
import { getEmpireScoreSnapshot } from "@/lib/hq/empire/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getEmpireScoreSnapshot();
    return NextResponse.json({
      success: true,
      empireScore: snapshot.empireScore,
      metrics: snapshot.metrics,
      departmentScores: snapshot.departmentScores,
      revenueByVentureType: snapshot.revenueByVentureType,
      venturesByType: snapshot.venturesByType,
      missionStatistics: snapshot.missionStatistics,
      scouts: snapshot.scouts,
      periodMonth: snapshot.periodMonth,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/empire] snapshot failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to load empire snapshot",
      },
      { status: 500 }
    );
  }
}

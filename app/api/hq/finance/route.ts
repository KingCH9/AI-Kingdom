import { NextResponse } from "next/server";
import { getFinanceSnapshot } from "@/lib/hq/finance/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getFinanceSnapshot();
    return NextResponse.json({
      success: true,
      budgets: snapshot.budgets,
      departmentSpend: snapshot.departmentSpend,
      missionSpend: snapshot.missionSpend,
      monthlySpend: snapshot.monthlySpend,
      roi: snapshot.roi,
      topCostlyMissions: snapshot.topCostlyMissions,
      totals: snapshot.totals,
      periodMonth: snapshot.periodMonth,
      generatedAt: snapshot.generatedAt,
      recentSpendingEvents: snapshot.recentSpendingEvents,
    });
  } catch (error) {
    console.error("[hq/finance] snapshot failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to load finance snapshot",
      },
      { status: 500 }
    );
  }
}

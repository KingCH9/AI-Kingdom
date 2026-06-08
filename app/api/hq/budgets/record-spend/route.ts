import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import { recordDepartmentSpend } from "@/lib/hq/finance/spend-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const departmentId = Number(body.departmentId);
    const amount = Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason : "";
    const missionId = body.missionId ? Number(body.missionId) : null;

    if (!departmentId || Number.isNaN(departmentId)) {
      return NextResponse.json(
        { success: false, message: "departmentId is required" },
        { status: 400 }
      );
    }

    const result = await recordDepartmentSpend({
      departmentId,
      amount,
      reason,
      missionId,
      agentPersona: body.agentPersona ?? "mercury",
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      budget: result.budget,
      event: result.event,
    });
  } catch (error) {
    console.error("[hq/budgets/record-spend] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to record spend",
      },
      { status: 500 }
    );
  }
}

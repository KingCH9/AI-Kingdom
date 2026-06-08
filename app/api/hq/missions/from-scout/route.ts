import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import { createMissionFromScout } from "@/lib/hq/missions/mission-from-scout";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const scoutKey = typeof body.scoutKey === "string" ? body.scoutKey.trim() : "";

    if (!scoutKey) {
      return NextResponse.json(
        { success: false, message: "scoutKey is required" },
        { status: 400 }
      );
    }

    const result = await createMissionFromScout({
      scoutKey,
      opportunityId: body.opportunityId ? Number(body.opportunityId) : undefined,
      title: body.title,
      agentPersona: body.agentPersona ?? "athena",
      estimatedCostGbp: body.estimatedCostGbp
        ? Number(body.estimatedCostGbp)
        : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        mission: result.mission,
        opportunityId: result.opportunityId,
        scout: result.scout,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[hq/missions/from-scout] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create mission from scout",
      },
      { status: 500 }
    );
  }
}

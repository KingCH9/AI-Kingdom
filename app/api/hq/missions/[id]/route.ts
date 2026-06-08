import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import {
  getMissionById,
  updateMission,
} from "@/lib/hq/missions/mission-service";
import type { MissionStatus } from "@/lib/hq/constants";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const missionId = Number(id);

    if (Number.isNaN(missionId)) {
      return NextResponse.json(
        { success: false, message: "Invalid mission id" },
        { status: 400 }
      );
    }

    const mission = await getMissionById(missionId);
    if (!mission) {
      return NextResponse.json(
        { success: false, message: "Mission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, mission });
  } catch (error) {
    console.error("[hq/missions/[id]] get failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to load mission",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const missionId = Number(id);

    if (Number.isNaN(missionId)) {
      return NextResponse.json(
        { success: false, message: "Invalid mission id" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const result = await updateMission(missionId, {
      status: body.status as MissionStatus | undefined,
      humanOverride:
        typeof body.humanOverride === "boolean"
          ? body.humanOverride
          : undefined,
      overrideReason:
        body.overrideReason !== undefined ? body.overrideReason : undefined,
      agentPersona: body.agentPersona ?? "operator",
    });

    if (!result.success) {
      const status = result.message === "Mission not found" ? 404 : 400;
      return NextResponse.json(
        { success: false, message: result.message },
        { status }
      );
    }

    return NextResponse.json({ success: true, mission: result.mission });
  } catch (error) {
    console.error("[hq/missions/[id]] patch failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update mission",
      },
      { status: 500 }
    );
  }
}

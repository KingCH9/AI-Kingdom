import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import { createMission, listMissions } from "@/lib/hq/missions/mission-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const department = searchParams.get("department") ?? undefined;

    const missions = await listMissions({ status, department });

    return NextResponse.json({
      success: true,
      count: missions.length,
      missions,
    });
  } catch (error) {
    console.error("[hq/missions] list failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to list missions",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const departmentId = Number(body.departmentId);
    const ownerPersona =
      typeof body.ownerPersona === "string" ? body.ownerPersona.trim() : "";

    if (!title) {
      return NextResponse.json(
        { success: false, message: "title is required" },
        { status: 400 }
      );
    }
    if (!departmentId || Number.isNaN(departmentId)) {
      return NextResponse.json(
        { success: false, message: "departmentId is required" },
        { status: 400 }
      );
    }
    if (!ownerPersona) {
      return NextResponse.json(
        { success: false, message: "ownerPersona is required" },
        { status: 400 }
      );
    }

    const result = await createMission({
      title,
      description: body.description ?? null,
      departmentId,
      ownerPersona,
      revenueStream: body.revenueStream,
      opportunityId: body.opportunityId ? Number(body.opportunityId) : null,
      agentPersona: body.agentPersona ?? ownerPersona,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, mission: result.mission }, { status: 201 });
  } catch (error) {
    console.error("[hq/missions] create failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to create mission",
      },
      { status: 500 }
    );
  }
}

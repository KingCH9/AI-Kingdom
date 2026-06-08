import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import { completeMissionTask } from "@/lib/hq/missions/mission-service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const { id, taskId } = await context.params;
    const missionId = Number(id);
    const missionTaskId = Number(taskId);

    if (Number.isNaN(missionId) || Number.isNaN(missionTaskId)) {
      return NextResponse.json(
        { success: false, message: "Invalid mission or task id" },
        { status: 400 }
      );
    }

    let agentPersona: string | undefined;
    try {
      const body = await request.json();
      agentPersona = body.agentPersona;
    } catch {
      // empty body is fine
    }

    const result = await completeMissionTask(
      missionId,
      missionTaskId,
      agentPersona
    );

    if (!result.success) {
      const status = result.message === "Mission task not found" ? 404 : 400;
      return NextResponse.json(
        { success: false, message: result.message },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      task: result.task,
      mission: result.mission,
    });
  } catch (error) {
    console.error("[hq/missions/task/complete] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to complete task",
      },
      { status: 500 }
    );
  }
}

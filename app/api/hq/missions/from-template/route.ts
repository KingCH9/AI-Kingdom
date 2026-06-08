import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import { createMissionFromTemplate } from "@/lib/hq/missions/create-from-template";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    const result = await createMissionFromTemplate({
      templateId: body.templateId ? Number(body.templateId) : undefined,
      templateKey: body.templateKey,
      title: body.title,
      description: body.description,
      departmentId: body.departmentId ? Number(body.departmentId) : undefined,
      agentPersona: body.agentPersona ?? "operator",
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
      { success: true, mission: result.mission },
      { status: 201 }
    );
  } catch (error) {
    console.error("[hq/missions/from-template] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create mission from template",
      },
      { status: 500 }
    );
  }
}

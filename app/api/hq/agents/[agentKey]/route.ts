import { NextResponse } from "next/server";
import { getAgentProfile } from "@/lib/hq/workstations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ agentKey: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { agentKey } = await context.params;
    const { profile, rankings } = await getAgentProfile(agentKey);

    if (!profile) {
      return NextResponse.json(
        { success: false, message: `Agent not found: ${agentKey}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
      rankings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[hq/agents/agentKey] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load agent profile",
      },
      { status: 500 }
    );
  }
}

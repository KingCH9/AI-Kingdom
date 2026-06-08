import { NextResponse } from "next/server";
import { getForgeWorkstationSnapshot } from "@/lib/hq/forge/workstation-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getForgeWorkstationSnapshot();
    return NextResponse.json({
      success: true,
      agents: snapshot.agents.map((a) => ({
        agentKey: a.agentKey,
        name: a.name,
        level: a.level,
        xp: a.xp,
        nextLevelXp: a.nextLevelXp,
        score: a.score,
        buildsStarted: a.buildsStarted,
        buildsCompleted: a.buildsCompleted,
        missionsBuilt: a.missionsBuilt,
        storesLaunched: a.storesLaunched,
        missionsLaunched: a.missionsLaunched,
        revenueGenerated: a.revenueGenerated,
        successRate: a.successRate,
      })),
      topAgents: snapshot.topAgents.map((a) => ({
        agentKey: a.agentKey,
        name: a.name,
        score: a.score,
        level: a.level,
        xp: a.xp,
      })),
      templates: snapshot.templates,
      topTemplates: snapshot.topTemplates,
      missionBuilds: snapshot.missionBuilds,
      summary: snapshot.summary,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error) {
    console.error("[hq/forge] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load Forge workstation metrics",
      },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";
import {
  buildAgentProfiles,
  getAgentProfileDefinition,
  type AgentProfile,
  type PerformanceRow,
  type RecentActivity,
} from "./agent-profiles";
import {
  buildScoutAggregate,
  buildScoutProfiles,
  getScoutProfileDefinition,
  type ScoutPerformanceRow,
  type ScoutProfile,
} from "./scout-profiles";
import {
  buildTopPerformersSummary,
  buildWorkstationRankings,
  type TopPerformersSummary,
  type WorkstationRankings,
} from "./workstation-rankings";

export type AgentWorkstationSnapshot = {
  generatedAt: string;
  agents: AgentProfile[];
  teams: {
    executive: AgentProfile[];
    builder: AgentProfile[];
    growth: AgentProfile[];
    finance: AgentProfile[];
  };
  rankings: WorkstationRankings;
  topPerformers: TopPerformersSummary;
};

export type ScoutWorkstationSnapshot = {
  generatedAt: string;
  scouts: ScoutProfile[];
  rankings: WorkstationRankings["scouts"];
  topPerformers: Pick<
    TopPerformersSummary,
    "topScout" | "highestXpScout" | "highestRevenueScout"
  >;
};

async function loadRecentActivity(): Promise<Map<string, RecentActivity[]>> {
  const events = await prisma.missionEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      mission: { select: { title: true } },
    },
  });

  const byPersona = new Map<string, RecentActivity[]>();

  for (const event of events) {
    const persona = event.agentPersona ?? "hq";
    const list = byPersona.get(persona) ?? [];
    if (list.length >= 5) continue;

    list.push({
      action: event.action,
      detail: event.detail,
      missionTitle: event.mission.title,
      createdAt: event.createdAt.toISOString(),
    });
    byPersona.set(persona, list);
  }

  return byPersona;
}

async function loadPerformanceData(): Promise<{
  agentRows: PerformanceRow[];
  scoutRows: ScoutPerformanceRow[];
}> {
  const [agents, scouts] = await Promise.all([
    prisma.agentPerformance.findMany(),
    prisma.scoutPerformance.findMany(),
  ]);

  return {
    agentRows: agents.map((a) => ({
      agentKey: a.agentKey,
      department: a.department,
      xp: a.xp,
      level: a.level,
      score: a.score,
      missionsWorked: a.missionsWorked,
      missionsCompleted: a.missionsCompleted,
      revenueInfluenced: a.revenueInfluenced,
      lastCalculatedAt: a.lastCalculatedAt,
    })),
    scoutRows: scouts.map((s) => ({
      scoutKey: s.scoutKey,
      xp: s.xp,
      level: s.level,
      score: s.score,
      opportunitiesFound: s.opportunitiesFound,
      opportunitiesApproved: s.opportunitiesApproved,
      missionsCreated: s.missionsCreated,
      missionsLaunched: s.missionsLaunched,
      revenueGenerated: s.revenueGenerated,
      successRate: s.successRate,
      lastCalculatedAt: s.lastCalculatedAt,
    })),
  };
}

/** Full agent workstation snapshot — read-only. */
export async function getAgentWorkstationSnapshot(): Promise<AgentWorkstationSnapshot> {
  const [{ agentRows, scoutRows }, recentActivity] = await Promise.all([
    loadPerformanceData(),
    loadRecentActivity(),
  ]);

  const scoutProfiles = buildScoutProfiles(scoutRows);
  const scoutAggregate = buildScoutAggregate(scoutProfiles);

  const agents = buildAgentProfiles({
    performanceRows: agentRows,
    scoutAggregate,
    recentActivityByPersona: recentActivity,
  });

  const rankings = buildWorkstationRankings(agents, scoutProfiles);

  return {
    generatedAt: new Date().toISOString(),
    agents,
    teams: {
      executive: agents.filter((a) => a.team === "executive"),
      builder: agents.filter((a) => a.team === "builder"),
      growth: agents.filter((a) => a.team === "growth"),
      finance: agents.filter((a) => a.team === "finance"),
    },
    rankings,
    topPerformers: buildTopPerformersSummary(agents, scoutProfiles),
  };
}

/** Full scout workstation snapshot — read-only. */
export async function getScoutWorkstationSnapshot(): Promise<ScoutWorkstationSnapshot> {
  const { scoutRows } = await loadPerformanceData();
  const scouts = buildScoutProfiles(scoutRows);
  const rankings = buildWorkstationRankings([], scouts);

  return {
    generatedAt: new Date().toISOString(),
    scouts,
    rankings: rankings.scouts,
    topPerformers: {
      topScout: rankings.scouts.topScouts[0] ?? null,
      highestXpScout: rankings.scouts.highestXp[0] ?? null,
      highestRevenueScout: rankings.scouts.highestRevenue[0] ?? null,
    },
  };
}

export async function getAgentProfile(agentKey: string): Promise<{
  profile: AgentProfile | null;
  rankings: WorkstationRankings;
}> {
  const snapshot = await getAgentWorkstationSnapshot();
  const profile =
    snapshot.agents.find((a) => a.agentKey === agentKey) ?? null;

  return { profile, rankings: snapshot.rankings };
}

export async function getScoutProfile(scoutKey: string): Promise<{
  profile: ScoutProfile | null;
  rankings: WorkstationRankings["scouts"];
}> {
  const snapshot = await getScoutWorkstationSnapshot();
  const profile =
    snapshot.scouts.find((s) => s.scoutKey === scoutKey) ?? null;

  return { profile, rankings: snapshot.rankings };
}

/** Compact summary for HQ Top Performers widget. */
export async function getTopPerformersSummary(): Promise<TopPerformersSummary> {
  const snapshot = await getAgentWorkstationSnapshot();
  return snapshot.topPerformers;
}

export {
  getAgentProfileDefinition,
  getScoutProfileDefinition,
};

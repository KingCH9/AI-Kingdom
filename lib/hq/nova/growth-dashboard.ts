import { prisma } from "@/lib/prisma";
import {
  computeNovaAgentMetrics,
  computePortfolioGrowthStats,
  isNovaGrowthPhase,
  isNovaGrowthMission,
  NOVA_GROWTH_AGENTS,
  resolveMissionVentureTypeKey,
  type NovaAgentMetrics,
  type NovaRawMission,
} from "./growth-engine";
import {
  computeGrowthScore,
  computeNovaLevel,
  computeNovaXp,
  type NovaXpBreakdown,
} from "./agent-xp";
import {
  analyzeCampaignPerformance,
  type CampaignPerformance,
} from "./campaign-analysis";

export type NovaAgentRecord = {
  agentKey: string;
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
  score: number;
  launchedMissions: number;
  growingMissions: number;
  profitableMissions: number;
  contentMissions: number;
  trackedMissions: number;
  revenueGenerated: number;
  ventureDiversity: number;
  xpBreakdown: NovaXpBreakdown;
};

export type NovaGrowthSnapshot = {
  generatedAt: string;
  agents: NovaAgentRecord[];
  topAgent: NovaAgentRecord | null;
  rankings: {
    topAgents: NovaAgentRecord[];
    byRevenue: NovaAgentRecord[];
    byGrowthScore: NovaAgentRecord[];
  };
  totalRevenue: number;
  launchedMissions: number;
  growingMissions: number;
  profitableMissions: number;
  growthScore: number;
  campaignPerformance: CampaignPerformance[];
  summary: {
    totalRevenue: number;
    launchedMissions: number;
    growingMissions: number;
    profitableMissions: number;
    growthScore: number;
    trackedMissions: number;
    ventureDiversity: number;
    averageAgentScore: number;
    averageLevel: number;
    topAgent: NovaAgentRecord | null;
  };
};

async function loadNovaRawData(): Promise<NovaRawMission[]> {
  const [missions, revenueByStore] = await Promise.all([
    prisma.mission.findMany({
      include: {
        ventureType: { select: { key: true } },
        ventureTemplate: { select: { key: true } },
        store: { select: { id: true, revenue: true } },
        missionTasks: {
          select: {
            phase: true,
            title: true,
            status: true,
            ownerPersona: true,
          },
        },
      },
    }),
    prisma.revenue.groupBy({
      by: ["storeId"],
      _sum: { amount: true },
    }),
  ]);

  const revenueMap = new Map(
    revenueByStore.map((r) => [r.storeId, r._sum.amount ?? 0])
  );

  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    storeId: m.storeId,
    templateKey: m.ventureTemplate?.key ?? null,
    ventureTypeKey: resolveMissionVentureTypeKey({
      ventureTypeKey: m.ventureType?.key ?? null,
      revenueStream: m.revenueStream,
    }),
    revenueGbp:
      (m.storeId ? revenueMap.get(m.storeId) : undefined) ??
      m.store?.revenue ??
      0,
    novaTasks: m.missionTasks.filter(
      (t) => t.ownerPersona === "nova" || isNovaGrowthPhase(t.phase)
    ),
  }));
}

function buildAgentRecord(metrics: NovaAgentMetrics): NovaAgentRecord {
  const xpBreakdown = computeNovaXp(metrics);
  const levelInfo = computeNovaLevel(xpBreakdown.total);

  return {
    agentKey: metrics.agentKey,
    name: metrics.name,
    level: levelInfo.level,
    xp: levelInfo.xp,
    nextLevelXp: levelInfo.nextLevelXp,
    xpToNextLevel: levelInfo.xpToNextLevel,
    score: computeGrowthScore(metrics),
    launchedMissions: metrics.launchedMissions,
    growingMissions: metrics.growingMissions,
    profitableMissions: metrics.profitableMissions,
    contentMissions: metrics.contentMissions,
    trackedMissions: metrics.trackedMissions,
    revenueGenerated: metrics.revenueGenerated,
    ventureDiversity: metrics.ventureDiversity,
    xpBreakdown,
  };
}

/** Full Nova growth snapshot — computed from existing HQ data. */
export async function getNovaGrowthSnapshot(): Promise<NovaGrowthSnapshot> {
  const missions = await loadNovaRawData();
  const portfolio = computePortfolioGrowthStats(missions);
  const portfolioSize = Math.max(portfolio.ventureDiversity, 1);

  const agents = NOVA_GROWTH_AGENTS.map((agent) =>
    buildAgentRecord(computeNovaAgentMetrics(agent, missions, portfolioSize))
  ).sort((a, b) => b.score - a.score);

  const campaignPerformance = analyzeCampaignPerformance(missions);
  const topAgent = agents[0] ?? null;

  const portfolioGrowthScore =
    agents.length > 0
      ? Math.round(
          (agents.reduce((sum, a) => sum + a.score, 0) / agents.length) * 10
        ) / 10
      : 0;

  const summary = {
    totalRevenue: portfolio.totalRevenue,
    launchedMissions: portfolio.launchedMissions,
    growingMissions: portfolio.growingMissions,
    profitableMissions: portfolio.profitableMissions,
    growthScore: portfolioGrowthScore,
    trackedMissions: portfolio.trackedMissions,
    ventureDiversity: portfolio.ventureDiversity,
    averageAgentScore: portfolioGrowthScore,
    averageLevel:
      agents.length > 0
        ? Math.round(
            (agents.reduce((sum, a) => sum + a.level, 0) / agents.length) * 10
          ) / 10
        : 0,
    topAgent,
  };

  return {
    generatedAt: new Date().toISOString(),
    agents,
    topAgent,
    rankings: {
      topAgents: agents.slice(0, 3),
      byRevenue: [...agents].sort(
        (a, b) => b.revenueGenerated - a.revenueGenerated
      ),
      byGrowthScore: agents,
    },
    totalRevenue: portfolio.totalRevenue,
    launchedMissions: portfolio.launchedMissions,
    growingMissions: portfolio.growingMissions,
    profitableMissions: portfolio.profitableMissions,
    growthScore: portfolioGrowthScore,
    campaignPerformance,
    summary,
  };
}

/** Compact summary for HQ dashboard widget. */
export async function getNovaGrowthSummary() {
  const snapshot = await getNovaGrowthSnapshot();
  return snapshot.summary;
}

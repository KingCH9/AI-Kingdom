import { prisma } from "@/lib/prisma";
import { getMissionCostTotals } from "../finance/cost-aggregation";
import {
  countRecommendationsByAction,
  generateCapitalRecommendations,
  type CapitalRecommendation,
} from "./capital-allocation";
import { computePortfolioHealth, type PortfolioHealth } from "./portfolio-health";
import {
  computeMercuryAgentMetrics,
  computeMercuryAgentScore,
  computeMercuryLevel,
  computeMercuryXp,
  computeMissionProfitability,
  MERCURY_AGENTS,
  type MercuryAgentKey,
  type MercuryXpBreakdown,
  type MissionProfitability,
} from "./profitability-engine";
import { computeAverageRoi, rankByProfit, rankByRoi } from "./roi-analysis";

export type MercuryAgentRecord = {
  agentKey: MercuryAgentKey;
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
  score: number;
  profitableMissions: number;
  costTrackedMissions: number;
  spendEvents: number;
  profitableVentures: number;
  fundRecommendations: number;
  totalProfitGbp: number;
  missionsAnalyzed: number;
  xpBreakdown: MercuryXpBreakdown;
};

export type MercurySnapshot = {
  generatedAt: string;
  agents: MercuryAgentRecord[];
  topAgent: MercuryAgentRecord | null;
  portfolioHealth: PortfolioHealth;
  profitabilityMetrics: MissionProfitability[];
  recommendations: CapitalRecommendation[];
  topProfitableMissions: MissionProfitability[];
  highestRoiMissions: MissionProfitability[];
  rankings: {
    topAgents: MercuryAgentRecord[];
    topProfitableMissions: MissionProfitability[];
    highestRoiMissions: MissionProfitability[];
  };
  summary: {
    portfolioHealthScore: number;
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
    averageRoi: number | null;
    profitableMissions: number;
    unprofitableMissions: number;
    fundRecommendations: number;
    averageAgentScore: number;
    averageLevel: number;
    topAgent: MercuryAgentRecord | null;
  };
};

async function loadMercuryProfitability(): Promise<{
  missions: MissionProfitability[];
  spendEventCount: number;
}> {
  const [allMissions, missionCosts, revenueByStore, spendEventCount] =
    await Promise.all([
      prisma.mission.findMany({
        include: {
          ventureType: { select: { key: true } },
        },
      }),
      getMissionCostTotals(),
      prisma.revenue.groupBy({
        by: ["storeId"],
        _sum: { amount: true },
      }),
      prisma.missionEvent.count({
        where: { estimatedCostGbp: { gt: 0 } },
      }),
    ]);

  const costByMission = new Map(
    missionCosts.map((m) => [m.missionId, m.totalCostGbp])
  );
  const revenueMap = new Map(
    revenueByStore.map((r) => [r.storeId, r._sum.amount ?? 0])
  );

  const missions = allMissions.map((mission) =>
    computeMissionProfitability({
      missionId: mission.id,
      title: mission.title,
      status: mission.status,
      storeId: mission.storeId,
      ventureTypeKey: mission.ventureType?.key ?? null,
      revenueGbp: mission.storeId
        ? revenueMap.get(mission.storeId) ?? 0
        : 0,
      costGbp:
        costByMission.get(mission.id) ?? mission.actualCostGbp ?? 0,
    })
  );

  return { missions, spendEventCount };
}

function buildAgentRecord(
  agentKey: MercuryAgentKey,
  missions: MissionProfitability[],
  spendEventCount: number,
  fundRecommendationCount: number,
  avgRoi: number | null
): MercuryAgentRecord {
  const metrics = computeMercuryAgentMetrics(
    agentKey,
    missions,
    spendEventCount,
    fundRecommendationCount
  );
  const xpBreakdown = computeMercuryXp(metrics);
  const levelInfo = computeMercuryLevel(xpBreakdown.total);

  return {
    agentKey: metrics.agentKey,
    name: metrics.name,
    level: levelInfo.level,
    xp: levelInfo.xp,
    nextLevelXp: levelInfo.nextLevelXp,
    xpToNextLevel: levelInfo.xpToNextLevel,
    score: computeMercuryAgentScore(metrics, avgRoi),
    profitableMissions: metrics.profitableMissions,
    costTrackedMissions: metrics.costTrackedMissions,
    spendEvents: metrics.spendEvents,
    profitableVentures: metrics.profitableVentures,
    fundRecommendations: metrics.fundRecommendations,
    totalProfitGbp: metrics.totalProfitGbp,
    missionsAnalyzed: metrics.missionsAnalyzed,
    xpBreakdown,
  };
}

/** Full Mercury profitability snapshot — read-only analytics. */
export async function getMercurySnapshot(): Promise<MercurySnapshot> {
  const { missions, spendEventCount } = await loadMercuryProfitability();
  const portfolioHealth = computePortfolioHealth(missions);
  const recommendations = generateCapitalRecommendations(missions);
  const recCounts = countRecommendationsByAction(recommendations);
  const avgRoi = portfolioHealth.averageRoi;

  const agents = MERCURY_AGENTS.map((agent) =>
    buildAgentRecord(
      agent.key,
      missions,
      spendEventCount,
      recCounts.fund,
      avgRoi
    )
  ).sort((a, b) => b.score - a.score);

  const topProfitableMissions = rankByProfit(missions, 10);
  const highestRoiMissions = rankByRoi(missions, 10);
  const topAgent = agents[0] ?? null;

  const averageAgentScore =
    agents.length > 0
      ? Math.round(
          (agents.reduce((sum, a) => sum + a.score, 0) / agents.length) * 10
        ) / 10
      : 0;

  const averageLevel =
    agents.length > 0
      ? Math.round(
          (agents.reduce((sum, a) => sum + a.level, 0) / agents.length) * 10
        ) / 10
      : 0;

  const summary = {
    portfolioHealthScore: portfolioHealth.portfolioHealthScore,
    totalRevenue: portfolioHealth.totalRevenue,
    totalCosts: portfolioHealth.totalCosts,
    netProfit: portfolioHealth.netProfit,
    averageRoi: portfolioHealth.averageRoi,
    profitableMissions: portfolioHealth.profitableMissions,
    unprofitableMissions: portfolioHealth.unprofitableMissions,
    fundRecommendations: recCounts.fund,
    averageAgentScore,
    averageLevel,
    topAgent,
  };

  return {
    generatedAt: new Date().toISOString(),
    agents,
    topAgent,
    portfolioHealth,
    profitabilityMetrics: missions,
    recommendations,
    topProfitableMissions,
    highestRoiMissions,
    rankings: {
      topAgents: agents.slice(0, 3),
      topProfitableMissions,
      highestRoiMissions,
    },
    summary,
  };
}

/** Compact summary for HQ dashboard widget. */
export async function getMercurySummary() {
  const snapshot = await getMercurySnapshot();
  return snapshot.summary;
}

export { computeAverageRoi, rankByProfit, rankByRoi };

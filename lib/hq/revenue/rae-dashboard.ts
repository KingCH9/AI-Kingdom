import { prisma } from "@/lib/prisma";
import { SHOP_EVENT_TYPES } from "@/lib/commerce/shop-analytics";
import { getMissionCostTotals } from "../finance/cost-aggregation";
import { MISSION_STATUSES } from "../constants";
import { isForgeBuildPhase, type ForgeRawMission } from "../forge/build-engine";
import { computePortfolioGrowthStats, type NovaRawMission } from "../nova/growth-engine";
import {
  computeMissionProfitability,
  type MissionProfitability,
} from "../mercury/profitability-engine";
import { countRecommendationsByAction, generateCapitalRecommendations } from "../mercury/capital-allocation";
import { computeAverageRoi } from "../mercury/roi-analysis";
import {
  buildAgentRevenueContributions,
  topAgentContributors,
  type AgentRevenueContribution,
} from "./agent-contributions";
import { buildDepartmentRevenueRecords, type DepartmentRevenueRecord } from "./department-metrics";
import { buildRaeEngineInsights, type RaeEngineInsight } from "./rae-engine";
import {
  buildVentureRecord,
  getFlaggedVentures,
  rankVenturesByRevenue,
  rankVenturesByRoi,
  type RawVentureInput,
  type VentureRecord,
} from "./venture-metrics";

export type RaeSnapshot = {
  generatedAt: string;
  periodMonth: string;
  ventures: VentureRecord[];
  topVenturesByRevenue: VentureRecord[];
  topVenturesByRoi: VentureRecord[];
  flaggedVentures: VentureRecord[];
  departments: DepartmentRevenueRecord[];
  agents: AgentRevenueContribution[];
  topAgentContributors: AgentRevenueContribution[];
  engineInsights: RaeEngineInsight[];
  summary: {
    totalRevenueGbp: number;
    monthlyRevenueGbp: number;
    netProfitGbp: number;
    averageRoi: number | null;
    activeVentures: number;
    flaggedCount: number;
    scaleRecommendations: number;
    topVentureRevenue: number;
    topAgentContributor: string | null;
  };
};

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function periodMonthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function computeBuildDays(
  tasks: Array<{ phase: string; startedAt: Date | null; completedAt: Date | null }>
): number | null {
  const buildTasks = tasks.filter((t) => isForgeBuildPhase(t.phase));
  if (buildTasks.length === 0) return null;

  const starts = buildTasks
    .map((t) => t.startedAt)
    .filter((d): d is Date => d != null);
  const ends = buildTasks
    .map((t) => t.completedAt)
    .filter((d): d is Date => d != null);

  if (starts.length === 0 || ends.length === 0) return null;

  const start = starts.sort((a, b) => a.getTime() - b.getTime())[0];
  const end = ends.sort((a, b) => b.getTime() - a.getTime())[0];
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function computeLaunchDays(
  createdAt: Date,
  firstRevenueAt: Date | null,
  status: string
): number | null {
  if (firstRevenueAt) {
    return Math.max(
      0,
      Math.round(
        (firstRevenueAt.getTime() - createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }
  if (
    status === MISSION_STATUSES.LAUNCHING ||
    status === MISSION_STATUSES.GROWING ||
    status === MISSION_STATUSES.PROFITABLE
  ) {
    return null;
  }
  return null;
}

async function loadRaeData() {
  const monthStartDate = monthStart();

  const [
    missions,
    missionCosts,
    revenueByStore,
    monthlyRevenueByStore,
    firstRevenueByStore,
    analyticsRows,
    ordersByStore,
    opportunities,
    spendEventCount,
  ] = await Promise.all([
    prisma.mission.findMany({
      include: {
        department: { select: { key: true, name: true } },
        ventureType: { select: { key: true, name: true } },
        ventureTemplate: { select: { key: true, name: true } },
        store: { select: { id: true, revenue: true } },
        missionTasks: {
          select: {
            phase: true,
            status: true,
            ownerPersona: true,
            startedAt: true,
            completedAt: true,
            title: true,
          },
        },
      },
    }),
    getMissionCostTotals(),
    prisma.revenue.groupBy({
      by: ["storeId"],
      _sum: { amount: true },
    }),
    prisma.revenue.groupBy({
      by: ["storeId"],
      where: { createdAt: { gte: monthStartDate } },
      _sum: { amount: true },
    }),
    prisma.revenue.groupBy({
      by: ["storeId"],
      _min: { createdAt: true },
    }),
    prisma.shopAnalyticsEvent.groupBy({
      by: ["storeId", "eventType"],
      _count: { eventType: true },
    }),
    prisma.order.groupBy({
      by: ["storeId"],
      _count: { id: true },
    }),
    prisma.opportunity.count(),
    prisma.missionEvent.count({ where: { estimatedCostGbp: { gt: 0 } } }),
  ]);

  const costByMission = new Map(
    missionCosts.map((m) => [m.missionId, m.totalCostGbp])
  );
  const revenueMap = new Map(
    revenueByStore.map((r) => [r.storeId, r._sum.amount ?? 0])
  );
  const monthlyRevenueMap = new Map(
    monthlyRevenueByStore.map((r) => [r.storeId, r._sum.amount ?? 0])
  );
  const firstRevenueMap = new Map(
    firstRevenueByStore.map((r) => [r.storeId, r._min.createdAt])
  );
  const ordersMap = new Map(
    ordersByStore.map((r) => [r.storeId, r._count.id])
  );

  const pageViewsByStore = new Map<number, number>();
  for (const row of analyticsRows) {
    if (row.eventType === SHOP_EVENT_TYPES.PAGE_VIEW) {
      pageViewsByStore.set(row.storeId, row._count.eventType);
    }
  }

  const scoutRevenue = [...revenueMap.values()].reduce((a, b) => a + b, 0);

  const rawVentures: RawVentureInput[] = missions.map((m) => {
    const storeId = m.storeId;
    const revenueGbp =
      (storeId ? revenueMap.get(storeId) : undefined) ??
      m.store?.revenue ??
      0;

    return {
      missionId: m.id,
      title: m.title,
      status: m.status,
      storeId,
      ventureTypeKey: m.ventureType?.key ?? null,
      ventureTypeName: m.ventureType?.name ?? null,
      departmentKey: m.department.key,
      departmentName: m.department.name,
      targetRoi: m.targetRoi,
      revenueGbp,
      revenueMonthlyGbp: storeId ? monthlyRevenueMap.get(storeId) ?? 0 : 0,
      costGbp: costByMission.get(m.id) ?? m.actualCostGbp ?? 0,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      buildDays: computeBuildDays(m.missionTasks),
      launchDays: computeLaunchDays(
        m.createdAt,
        storeId ? firstRevenueMap.get(storeId) ?? null : null,
        m.status
      ),
      pageViews: storeId ? pageViewsByStore.get(storeId) ?? 0 : 0,
      orders: storeId ? ordersMap.get(storeId) ?? 0 : 0,
    };
  });

  const ventures = rawVentures.map((v) => buildVentureRecord(v));

  const profitability: MissionProfitability[] = missions.map((m) =>
    computeMissionProfitability({
      missionId: m.id,
      title: m.title,
      status: m.status,
      storeId: m.storeId,
      ventureTypeKey: m.ventureType?.key ?? null,
      revenueGbp:
        (m.storeId ? revenueMap.get(m.storeId) : undefined) ??
        m.store?.revenue ??
        0,
      costGbp: costByMission.get(m.id) ?? m.actualCostGbp ?? 0,
    })
  );

  const recommendations = generateCapitalRecommendations(profitability);
  const fundCount = countRecommendationsByAction(recommendations).fund;

  const forgeMissions: ForgeRawMission[] = missions.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    storeId: m.storeId,
    templateKey: m.ventureTemplate?.key ?? null,
    templateName: m.ventureTemplate?.name ?? null,
    revenueGbp:
      (m.storeId ? revenueMap.get(m.storeId) : undefined) ??
      m.store?.revenue ??
      0,
    forgeTasks: m.missionTasks
      .filter(
        (t) => t.ownerPersona === "forge" || isForgeBuildPhase(t.phase)
      )
      .map((t, index) => ({
        id: index,
        missionId: m.id,
        phase: t.phase,
        title: t.title,
        status: t.status,
        ownerPersona: t.ownerPersona,
        completedAt: t.completedAt,
      })),
    buildCompletedEvents: 0,
  }));

  const novaMissions: NovaRawMission[] = missions.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    storeId: m.storeId,
    templateKey: m.ventureTemplate?.key ?? null,
    ventureTypeKey: m.ventureType?.key ?? null,
    revenueGbp:
      (m.storeId ? revenueMap.get(m.storeId) : undefined) ??
      m.store?.revenue ??
      0,
    novaTasks: m.missionTasks.map((t) => ({
      phase: t.phase,
      title: t.title,
      status: t.status,
      ownerPersona: t.ownerPersona,
    })),
  }));

  const scaleCount = ventures.filter((v) => v.atlasAction === "scale").length;
  const killCount = ventures.filter((v) => v.atlasAction === "kill").length;

  const agents = buildAgentRevenueContributions({
    forgeMissions,
    novaMissions,
    profitability,
    spendEventCount,
    fundRecommendationCount: fundCount,
    scoutRevenue,
    opportunitiesFound: opportunities,
    scaleCount,
    killCount,
  });

  const departments = buildDepartmentRevenueRecords(ventures);
  const portfolioGrowth = computePortfolioGrowthStats(novaMissions);
  const growthAgents = agents.filter(
    (a) => a.department === "growth" && a.agentKey !== "nova"
  );
  const portfolioGrowthScore =
    growthAgents.length > 0
      ? Math.round(
          (growthAgents.reduce((s, a) => s + a.score, 0) / growthAgents.length) *
            10
        ) / 10
      : 0;

  const buildDaysList = ventures
    .map((v) => v.buildDays)
    .filter((d): d is number => d != null);
  const avgBuildDays =
    buildDaysList.length > 0
      ? Math.round(
          buildDaysList.reduce((a, b) => a + b, 0) / buildDaysList.length
        )
      : null;

  const engineInsights = buildRaeEngineInsights({
    ventures,
    departments,
    agents,
    opportunitiesFound: opportunities,
    avgBuildDays,
    portfolioGrowthScore,
    averageRoi: computeAverageRoi(profitability),
  });

  return {
    ventures,
    departments,
    agents,
    engineInsights,
    portfolioGrowth,
  };
}

/** Full RAE snapshot — read-only, advisory only. */
export async function getRaeSnapshot(): Promise<RaeSnapshot> {
  const data = await loadRaeData();
  const { ventures, departments, agents, engineInsights } = data;

  const topVenturesByRevenue = rankVenturesByRevenue(ventures).slice(0, 10);
  const topVenturesByRoi = rankVenturesByRoi(ventures).slice(0, 10);
  const flaggedVentures = getFlaggedVentures(ventures);
  const topAgents = topAgentContributors(agents, 10);

  const totalRevenueGbp = ventures.reduce((s, v) => s + v.revenueGbp, 0);
  const monthlyRevenueGbp = ventures.reduce(
    (s, v) => s + v.revenueMonthlyGbp,
    0
  );
  const netProfitGbp = ventures.reduce((s, v) => s + v.netProfitGbp, 0);

  return {
    generatedAt: new Date().toISOString(),
    periodMonth: periodMonthLabel(),
    ventures,
    topVenturesByRevenue,
    topVenturesByRoi,
    flaggedVentures,
    departments,
    agents,
    topAgentContributors: topAgents,
    engineInsights,
    summary: {
      totalRevenueGbp: round(totalRevenueGbp),
      monthlyRevenueGbp: round(monthlyRevenueGbp),
      netProfitGbp: round(netProfitGbp),
      averageRoi: computeAverageRoi(
        ventures.map((v) => ({
          missionId: v.missionId,
          title: v.title,
          status: v.status,
          storeId: v.storeId,
          ventureTypeKey: v.ventureTypeKey,
          revenueGbp: v.revenueGbp,
          costGbp: v.costGbp,
          netProfitGbp: v.netProfitGbp,
          roi: v.roi,
          revenueMultiple: null,
          capitalEfficiency: 0,
          profitabilityClass: v.profitabilityClass,
        }))
      ),
      activeVentures: ventures.filter((v) => v.status !== MISSION_STATUSES.KILLED)
        .length,
      flaggedCount: flaggedVentures.length,
      scaleRecommendations: ventures.filter((v) => v.atlasAction === "scale")
        .length,
      topVentureRevenue: topVenturesByRevenue[0]?.revenueGbp ?? 0,
      topAgentContributor: topAgents[0]?.name ?? null,
    },
  };
}

/** Compact summary for HQ widget integration. */
export async function getRaeSummary() {
  const snapshot = await getRaeSnapshot();
  return {
    periodMonth: snapshot.periodMonth,
    totalRevenueGbp: snapshot.summary.totalRevenueGbp,
    monthlyRevenueGbp: snapshot.summary.monthlyRevenueGbp,
    averageRoi: snapshot.summary.averageRoi,
    flaggedCount: snapshot.summary.flaggedCount,
    scaleRecommendations: snapshot.summary.scaleRecommendations,
    topVenture: snapshot.topVenturesByRevenue[0]
      ? {
          missionId: snapshot.topVenturesByRevenue[0].missionId,
          title: snapshot.topVenturesByRevenue[0].title,
          revenueGbp: snapshot.topVenturesByRevenue[0].revenueGbp,
          roi: snapshot.topVenturesByRevenue[0].roi,
        }
      : null,
    topAgentContributor: snapshot.topAgentContributors[0]
      ? {
          agentKey: snapshot.topAgentContributors[0].agentKey,
          name: snapshot.topAgentContributors[0].name,
          revenueContributed:
            snapshot.topAgentContributors[0].revenueContributed,
        }
      : null,
  };
}

export async function getRaeVenturesPayload() {
  const snapshot = await getRaeSnapshot();
  return {
    topVentures: snapshot.topVenturesByRevenue,
    topVenturesByRoi: snapshot.topVenturesByRoi,
    flaggedVentures: snapshot.flaggedVentures,
    generatedAt: snapshot.generatedAt,
  };
}

export async function getRaeDepartmentsPayload() {
  const snapshot = await getRaeSnapshot();
  return {
    departments: snapshot.departments,
    summary: {
      totalRevenueGbp: snapshot.summary.totalRevenueGbp,
      monthlyRevenueGbp: snapshot.summary.monthlyRevenueGbp,
      averageRoi: snapshot.summary.averageRoi,
    },
    generatedAt: snapshot.generatedAt,
  };
}

export async function getRaeAgentsPayload() {
  const snapshot = await getRaeSnapshot();
  return {
    agents: snapshot.agents,
    topContributors: snapshot.topAgentContributors,
    generatedAt: snapshot.generatedAt,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

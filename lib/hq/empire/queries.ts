import { prisma } from "@/lib/prisma";
import { computeEmpireQueueStats } from "@/lib/opportunity/compute-queue-stats";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import { getDepartmentBudgetSummary } from "../finance/queries";
import { currentBudgetPeriodMonth, MISSION_STATUSES } from "../constants";
import { buildScoutSnapshots, getScoutByKey } from "../scouts";
import { SCOUT_CATEGORY_PREFIX } from "../scouts/opportunity-generator";
import { revenueStreamToVentureTypeKey } from "../seed/venture-engine";

export type DepartmentScore = {
  departmentKey: string;
  departmentName: string;
  score: number;
  missions: number;
  activeMissions: number;
  budgetUsagePercent: number;
};

export type EmpireScoreSnapshot = {
  generatedAt: string;
  periodMonth: string;
  empireScore: number;
  metrics: {
    totalMissions: number;
    activeVentures: number;
    monthlyRevenue: number;
    monthlyCosts: number;
    netProfit: number;
    roi: number | null;
    launchReadyCount: number;
  };
  departmentScores: DepartmentScore[];
  revenueByVentureType: Array<{
    ventureTypeKey: string;
    ventureTypeName: string;
    missionCount: number;
    revenueGbp: number;
  }>;
  venturesByType: Array<{
    ventureTypeKey: string;
    ventureTypeName: string;
    count: number;
  }>;
  missionStatistics: {
    byStatus: Record<string, number>;
    successRate: number;
    profitableCount: number;
    killedCount: number;
  };
  scouts: ReturnType<typeof buildScoutSnapshots>;
};

function computeEmpireScore(metrics: {
  totalMissions: number;
  activeVentures: number;
  netProfit: number;
  roi: number | null;
  launchReadyCount: number;
  successRate: number;
}): number {
  let score = 0;
  score += Math.min(metrics.totalMissions * 2, 40);
  score += Math.min(metrics.activeVentures * 3, 30);
  score += Math.min(metrics.launchReadyCount * 5, 25);
  score += Math.min(metrics.successRate * 0.2, 20);
  if (metrics.netProfit > 0) score += 15;
  if (metrics.roi != null && metrics.roi > 0) score += Math.min(metrics.roi * 0.1, 15);
  return Math.round(Math.min(score, 100));
}

function computeDepartmentScore(input: {
  missions: number;
  activeMissions: number;
  budgetUsagePercent: number;
  profitableMissions: number;
}): number {
  let score = 0;
  score += Math.min(input.missions * 3, 30);
  score += Math.min(input.activeMissions * 5, 25);
  score += Math.min(input.profitableMissions * 10, 30);
  if (input.budgetUsagePercent <= 80) score += 15;
  return Math.round(Math.min(score, 100));
}

export async function getEmpireScoreSnapshot(): Promise<EmpireScoreSnapshot> {
  const periodMonth = currentBudgetPeriodMonth();
  const monthStart = new Date(`${periodMonth}-01T00:00:00.000Z`);

  const [
    missions,
    opportunities,
    taskCounts,
    monthlyRevenue,
    monthlyCosts,
    ventureTypes,
    budgets,
    departments,
  ] = await Promise.all([
    prisma.mission.findMany({
      include: {
        ventureType: true,
        store: { select: { id: true, revenue: true } },
      },
    }),
    prisma.opportunity.findMany(),
    prisma.task.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.revenue.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.missionEvent.aggregate({
      where: {
        estimatedCostGbp: { gt: 0 },
        createdAt: { gte: monthStart },
      },
      _sum: { estimatedCostGbp: true },
    }),
    prisma.ventureType.findMany({ where: { active: true } }),
    getDepartmentBudgetSummary(periodMonth),
    prisma.department.findMany(),
  ]);

  const pending =
    taskCounts.find((r) => r.status === TASK_STATUSES.PENDING)?._count.status ?? 0;
  const inProgress =
    taskCounts.find((r) => r.status === TASK_STATUSES.IN_PROGRESS)?._count
      .status ?? 0;

  const queueStats = computeEmpireQueueStats(opportunities, {
    pending,
    inProgress,
  });

  const activeVentures = missions.filter(
    (m) =>
      m.status !== MISSION_STATUSES.KILLED &&
      m.status !== MISSION_STATUSES.PROFITABLE
  ).length;

  const monthlyRevenueGbp = monthlyRevenue._sum.amount ?? 0;
  const monthlyCostsGbp = monthlyCosts._sum.estimatedCostGbp ?? 0;
  const netProfit = monthlyRevenueGbp - monthlyCostsGbp;
  const roi =
    monthlyCostsGbp > 0
      ? Math.round(((netProfit / monthlyCostsGbp) * 100) * 10) / 10
      : null;

  const byStatus: Record<string, number> = {};
  for (const m of missions) {
    byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
  }

  const profitableCount = byStatus[MISSION_STATUSES.PROFITABLE] ?? 0;
  const killedCount = byStatus[MISSION_STATUSES.KILLED] ?? 0;
  const terminal = profitableCount + killedCount;
  const successRate =
    terminal > 0 ? Math.round((profitableCount / terminal) * 1000) / 10 : 0;

  const venturesByTypeMap = new Map<
    string,
    { ventureTypeKey: string; ventureTypeName: string; count: number }
  >();
  for (const vt of ventureTypes) {
    venturesByTypeMap.set(vt.key, {
      ventureTypeKey: vt.key,
      ventureTypeName: vt.name,
      count: 0,
    });
  }
  for (const m of missions) {
    const key =
      m.ventureType?.key ?? revenueStreamToVentureTypeKey(m.revenueStream);
    const row = venturesByTypeMap.get(key);
    if (row) row.count += 1;
    else
      venturesByTypeMap.set(key, {
        ventureTypeKey: key,
        ventureTypeName: m.ventureType?.name ?? key,
        count: 1,
      });
  }

  const storeIds = missions
    .map((m) => m.storeId)
    .filter((id): id is number => id != null);

  const revenueByStore = new Map<number, number>();
  if (storeIds.length > 0) {
    const rows = await prisma.revenue.groupBy({
      by: ["storeId"],
      where: { storeId: { in: storeIds } },
      _sum: { amount: true },
    });
    for (const row of rows) {
      revenueByStore.set(row.storeId, row._sum.amount ?? 0);
    }
  }

  const revenueByVentureType = [...venturesByTypeMap.values()].map((vt) => {
    const revenueGbp = missions
      .filter(
        (m) =>
          (m.ventureType?.key ?? revenueStreamToVentureTypeKey(m.revenueStream)) ===
          vt.ventureTypeKey
      )
      .reduce((sum, m) => {
        if (!m.storeId) return sum;
        return sum + (revenueByStore.get(m.storeId) ?? 0);
      }, 0);

    return {
      ventureTypeKey: vt.ventureTypeKey,
      ventureTypeName: vt.ventureTypeName,
      missionCount: vt.count,
      revenueGbp,
    };
  });

  const missionsByVentureType = new Map<string, number>();
  for (const m of missions) {
    const key =
      m.ventureType?.key ?? revenueStreamToVentureTypeKey(m.revenueStream);
    missionsByVentureType.set(key, (missionsByVentureType.get(key) ?? 0) + 1);
  }

  const opportunitiesByVentureType = new Map<string, number>();
  for (const m of missions) {
    if (!m.opportunityId) continue;
    const key =
      m.ventureType?.key ?? revenueStreamToVentureTypeKey(m.revenueStream);
    opportunitiesByVentureType.set(
      key,
      (opportunitiesByVentureType.get(key) ?? 0) + 1
    );
  }

  const scoutOpportunities = await prisma.opportunity.findMany({
    where: { category: { startsWith: SCOUT_CATEGORY_PREFIX } },
    select: { category: true },
  });
  const scoutOpportunitiesByVentureType = new Map<string, number>();
  for (const opp of scoutOpportunities) {
    const scoutKey = opp.category?.slice(SCOUT_CATEGORY_PREFIX.length) ?? "";
    const scout = getScoutByKey(scoutKey);
    if (!scout) continue;
    scoutOpportunitiesByVentureType.set(
      scout.ventureTypeKey,
      (scoutOpportunitiesByVentureType.get(scout.ventureTypeKey) ?? 0) + 1
    );
    opportunitiesByVentureType.set(
      scout.ventureTypeKey,
      Math.max(
        opportunitiesByVentureType.get(scout.ventureTypeKey) ?? 0,
        scoutOpportunitiesByVentureType.get(scout.ventureTypeKey) ?? 0
      )
    );
  }

  const departmentScores: DepartmentScore[] = departments.map((dept) => {
    const deptMissions = missions.filter((m) => m.departmentId === dept.id);
    const active = deptMissions.filter(
      (m) =>
        m.status !== MISSION_STATUSES.KILLED &&
        m.status !== MISSION_STATUSES.PROFITABLE
    ).length;
    const profitable = deptMissions.filter(
      (m) => m.status === MISSION_STATUSES.PROFITABLE
    ).length;
    const budget = budgets.find((b) => b.departmentId === dept.id);

    return {
      departmentKey: dept.key,
      departmentName: dept.name,
      score: computeDepartmentScore({
        missions: deptMissions.length,
        activeMissions: active,
        budgetUsagePercent: budget?.usagePercent ?? 0,
        profitableMissions: profitable,
      }),
      missions: deptMissions.length,
      activeMissions: active,
      budgetUsagePercent: budget?.usagePercent ?? 0,
    };
  });

  departmentScores.sort((a, b) => b.score - a.score);

  const metrics = {
    totalMissions: missions.length,
    activeVentures,
    monthlyRevenue: monthlyRevenueGbp,
    monthlyCosts: monthlyCostsGbp,
    netProfit,
    roi,
    launchReadyCount: queueStats.launchReady,
  };

  return {
    generatedAt: new Date().toISOString(),
    periodMonth,
    empireScore: computeEmpireScore({ ...metrics, successRate }),
    metrics,
    departmentScores,
    revenueByVentureType,
    venturesByType: [...venturesByTypeMap.values()]
      .filter((v) => v.count > 0 || ventureTypes.some((t) => t.key === v.ventureTypeKey))
      .sort((a, b) => b.count - a.count),
    missionStatistics: {
      byStatus,
      successRate,
      profitableCount,
      killedCount,
    },
    scouts: buildScoutSnapshots({
      missionsByVentureType,
      opportunitiesByVentureType,
    }),
  };
}

export async function getVentureDistribution() {
  const snapshot = await getEmpireScoreSnapshot();
  return snapshot.venturesByType;
}

/** Atlas executive metrics for empire/HQ integration — advisory only. */
export async function getAtlasEmpireSummary() {
  const { getAtlasMissionMetrics } = await import("../atlas/ceo-dashboard");
  const metrics = await getAtlasMissionMetrics();
  return {
    topPriorityScore: metrics.topPriorityScore,
    fundRecommendations: metrics.fundCount,
    killRecommendations: metrics.killCount,
    activeMissionsTracked: metrics.activeMissions,
  };
}

import { prisma } from "@/lib/prisma";
import { currentBudgetPeriodMonth } from "../constants";
import {
  getDepartmentCostTotals,
  getMissionCostTotals,
  getMonthlyCostTotals,
  type DepartmentCostRow,
  type MissionCostRow,
  type MonthlyCostRow,
} from "./cost-aggregation";

export type DepartmentBudgetSummary = {
  departmentId: number;
  departmentKey: string;
  departmentName: string;
  periodMonth: string;
  allocatedGbp: number;
  spentGbp: number;
  remainingGbp: number;
  usagePercent: number;
  missionCostGbp: number;
};

export type MissionRoiRow = {
  missionId: number;
  missionTitle: string;
  storeId: number | null;
  storeName: string | null;
  costGbp: number;
  revenueGbp: number;
  roi: number | null;
  roiLabel: "positive" | "negative" | "unknown";
};

export type FinanceSnapshot = {
  generatedAt: string;
  periodMonth: string;
  budgets: DepartmentBudgetSummary[];
  totals: {
    allocatedGbp: number;
    spentGbp: number;
    remainingGbp: number;
    usagePercent: number;
    missionCostGbp: number;
    revenueGbp: number;
  };
  departmentSpend: DepartmentCostRow[];
  missionSpend: MissionCostRow[];
  monthlySpend: MonthlyCostRow[];
  roi: MissionRoiRow[];
  topCostlyMissions: MissionCostRow[];
  recentSpendingEvents: Array<{
    id: number;
    missionId: number;
    missionTitle: string;
    action: string;
    detail: string | null;
    estimatedCostGbp: number;
    agentPersona: string | null;
    createdAt: string;
  }>;
};

function usagePercent(spent: number, allocated: number): number {
  if (allocated <= 0) return 0;
  return Math.round((spent / allocated) * 1000) / 10;
}

function computeRoi(
  revenue: number,
  cost: number
): { roi: number | null; roiLabel: "positive" | "negative" | "unknown" } {
  if (cost <= 0) {
    return { roi: null, roiLabel: "unknown" };
  }
  const roi = ((revenue - cost) / cost) * 100;
  return {
    roi: Math.round(roi * 10) / 10,
    roiLabel: roi >= 0 ? "positive" : "negative",
  };
}

export async function getDepartmentBudgetSummary(
  periodMonth = currentBudgetPeriodMonth()
): Promise<DepartmentBudgetSummary[]> {
  const [departments, deptCosts] = await Promise.all([
    prisma.department.findMany({
      include: {
        budgets: { where: { periodMonth }, take: 1 },
      },
      orderBy: { id: "asc" },
    }),
    getDepartmentCostTotals(),
  ]);

  const costByDept = new Map(deptCosts.map((d) => [d.departmentId, d.totalCostGbp]));

  return departments.map((dept) => {
    const budgetRow = dept.budgets[0];
    const allocated = budgetRow?.allocatedGbp ?? dept.monthlyBudgetGbp;
    const spent = budgetRow?.spentGbp ?? 0;
    const remaining = Math.max(allocated - spent, 0);

    return {
      departmentId: dept.id,
      departmentKey: dept.key,
      departmentName: dept.name,
      periodMonth,
      allocatedGbp: allocated,
      spentGbp: spent,
      remainingGbp: remaining,
      usagePercent: usagePercent(spent, allocated),
      missionCostGbp: costByDept.get(dept.id) ?? 0,
    };
  });
}

export async function getMissionCostSummary(): Promise<MissionCostRow[]> {
  return getMissionCostTotals();
}

export async function getMissionRoiSummary(): Promise<MissionRoiRow[]> {
  const missionCosts = await getMissionCostTotals();
  const missionsWithStores = await prisma.mission.findMany({
    where: { storeId: { not: null } },
    include: {
      store: { select: { id: true, name: true } },
    },
  });

  const storeIds = missionsWithStores
    .map((m) => m.storeId)
    .filter((id): id is number => id != null);

  const revenueByStore = new Map<number, number>();
  if (storeIds.length > 0) {
    const revenueRows = await prisma.revenue.groupBy({
      by: ["storeId"],
      where: { storeId: { in: storeIds } },
      _sum: { amount: true },
    });
    for (const row of revenueRows) {
      revenueByStore.set(row.storeId, row._sum.amount ?? 0);
    }
  }

  const costByMission = new Map(
    missionCosts.map((m) => [m.missionId, m.totalCostGbp])
  );

  return missionsWithStores.map((mission) => {
    const cost = costByMission.get(mission.id) ?? mission.actualCostGbp;
    const revenue = mission.storeId
      ? revenueByStore.get(mission.storeId) ?? 0
      : 0;
    const { roi, roiLabel } = computeRoi(revenue, cost);

    return {
      missionId: mission.id,
      missionTitle: mission.title,
      storeId: mission.storeId,
      storeName: mission.store?.name ?? null,
      costGbp: cost,
      revenueGbp: revenue,
      roi,
      roiLabel,
    };
  });
}

export async function getFinanceSnapshot(): Promise<FinanceSnapshot> {
  const periodMonth = currentBudgetPeriodMonth();

  const [
    budgets,
    departmentSpend,
    missionSpend,
    monthlySpend,
    roi,
    recentSpendingEvents,
    revenueAgg,
  ] = await Promise.all([
    getDepartmentBudgetSummary(periodMonth),
    getDepartmentCostTotals(),
    getMissionCostTotals(),
    getMonthlyCostTotals(),
    getMissionRoiSummary(),
    prisma.missionEvent.findMany({
      where: { estimatedCostGbp: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        mission: { select: { id: true, title: true } },
      },
    }),
    prisma.revenue.aggregate({ _sum: { amount: true } }),
  ]);

  const totalAllocated = budgets.reduce((s, b) => s + b.allocatedGbp, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spentGbp, 0);
  const totalMissionCost = missionSpend.reduce((s, m) => s + m.totalCostGbp, 0);

  return {
    generatedAt: new Date().toISOString(),
    periodMonth,
    budgets,
    totals: {
      allocatedGbp: totalAllocated,
      spentGbp: totalSpent,
      remainingGbp: Math.max(totalAllocated - totalSpent, 0),
      usagePercent: usagePercent(totalSpent, totalAllocated),
      missionCostGbp: totalMissionCost,
      revenueGbp: revenueAgg._sum.amount ?? 0,
    },
    departmentSpend,
    missionSpend,
    monthlySpend,
    roi,
    topCostlyMissions: missionSpend.slice(0, 10),
    recentSpendingEvents: recentSpendingEvents.map((e) => ({
      id: e.id,
      missionId: e.missionId,
      missionTitle: e.mission.title,
      action: e.action,
      detail: e.detail,
      estimatedCostGbp: e.estimatedCostGbp,
      agentPersona: e.agentPersona,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

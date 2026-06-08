import { prisma } from "@/lib/prisma";
import { currentBudgetPeriodMonth } from "../constants";

export type MissionCostRow = {
  missionId: number;
  missionTitle: string;
  departmentId: number;
  departmentKey: string;
  totalCostGbp: number;
  eventCount: number;
};

export type DepartmentCostRow = {
  departmentId: number;
  departmentKey: string;
  departmentName: string;
  totalCostGbp: number;
  missionCount: number;
};

export type MonthlyCostRow = {
  periodMonth: string;
  totalCostGbp: number;
  eventCount: number;
};

function periodMonthFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Sum MissionEvent.estimatedCostGbp per mission. */
export async function getMissionCostTotals(): Promise<MissionCostRow[]> {
  const events = await prisma.missionEvent.findMany({
    where: { estimatedCostGbp: { gt: 0 } },
    include: {
      mission: {
        select: {
          id: true,
          title: true,
          departmentId: true,
          department: { select: { key: true } },
        },
      },
    },
  });

  const byMission = new Map<number, MissionCostRow>();

  for (const event of events) {
    const existing = byMission.get(event.missionId);
    if (existing) {
      existing.totalCostGbp += event.estimatedCostGbp;
      existing.eventCount += 1;
    } else {
      byMission.set(event.missionId, {
        missionId: event.mission.id,
        missionTitle: event.mission.title,
        departmentId: event.mission.departmentId,
        departmentKey: event.mission.department.key,
        totalCostGbp: event.estimatedCostGbp,
        eventCount: 1,
      });
    }
  }

  return [...byMission.values()].sort(
    (a, b) => b.totalCostGbp - a.totalCostGbp
  );
}

/** Sum mission event costs grouped by department. */
export async function getDepartmentCostTotals(): Promise<DepartmentCostRow[]> {
  const missionCosts = await getMissionCostTotals();
  const departments = await prisma.department.findMany();
  const deptMeta = new Map(departments.map((d) => [d.id, d]));

  const byDept = new Map<number, DepartmentCostRow>();

  for (const row of missionCosts) {
    const meta = deptMeta.get(row.departmentId);
    const existing = byDept.get(row.departmentId);
    if (existing) {
      existing.totalCostGbp += row.totalCostGbp;
      existing.missionCount += 1;
    } else {
      byDept.set(row.departmentId, {
        departmentId: row.departmentId,
        departmentKey: row.departmentKey,
        departmentName: meta?.name ?? row.departmentKey,
        totalCostGbp: row.totalCostGbp,
        missionCount: 1,
      });
    }
  }

  for (const dept of departments) {
    if (!byDept.has(dept.id)) {
      byDept.set(dept.id, {
        departmentId: dept.id,
        departmentKey: dept.key,
        departmentName: dept.name,
        totalCostGbp: 0,
        missionCount: 0,
      });
    }
  }

  return [...byDept.values()].sort((a, b) => a.departmentId - b.departmentId);
}

/** Sum MissionEvent costs by calendar month (UTC). */
export async function getMonthlyCostTotals(
  monthsBack = 6
): Promise<MonthlyCostRow[]> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - monthsBack);

  const events = await prisma.missionEvent.findMany({
    where: {
      estimatedCostGbp: { gt: 0 },
      createdAt: { gte: since },
    },
    select: { estimatedCostGbp: true, createdAt: true },
  });

  const byMonth = new Map<string, MonthlyCostRow>();

  for (const event of events) {
    const periodMonth = periodMonthFromDate(event.createdAt);
    const existing = byMonth.get(periodMonth);
    if (existing) {
      existing.totalCostGbp += event.estimatedCostGbp;
      existing.eventCount += 1;
    } else {
      byMonth.set(periodMonth, {
        periodMonth,
        totalCostGbp: event.estimatedCostGbp,
        eventCount: 1,
      });
    }
  }

  return [...byMonth.values()].sort((a, b) =>
    a.periodMonth.localeCompare(b.periodMonth)
  );
}

export async function getMissionCostById(missionId: number): Promise<number> {
  const agg = await prisma.missionEvent.aggregate({
    where: { missionId },
    _sum: { estimatedCostGbp: true },
  });
  return agg._sum.estimatedCostGbp ?? 0;
}

/** Sync mission.actualCostGbp from event totals (observation only). */
export async function syncMissionActualCost(missionId: number): Promise<number> {
  const total = await getMissionCostById(missionId);
  await prisma.mission.update({
    where: { id: missionId },
    data: { actualCostGbp: total },
  });
  return total;
}

export function currentPeriodMonth(): string {
  return currentBudgetPeriodMonth();
}

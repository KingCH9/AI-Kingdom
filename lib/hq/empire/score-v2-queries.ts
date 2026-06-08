import { prisma } from "@/lib/prisma";
import { DEPARTMENT_KEYS, MISSION_STATUSES } from "../constants";

export type EmpireScoreV2RawInput = {
  agents: Array<{
    agentKey: string;
    department: string;
    xp: number;
    level: number;
    score: number;
    missionsWorked: number;
    missionsCompleted: number;
    revenueInfluenced: number;
  }>;
  scouts: Array<{
    scoutKey: string;
    xp: number;
    level: number;
    score: number;
    opportunitiesFound: number;
    opportunitiesApproved: number;
    missionsCreated: number;
    missionsLaunched: number;
    revenueGenerated: number;
    successRate: number;
  }>;
  missions: Array<{
    id: number;
    status: string;
    ventureTypeKey: string | null;
    revenueGbp: number;
    costGbp: number;
  }>;
  taskCounts: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  empireScoreV1: number;
};

const ACTIVE_VENTURE_STATUSES = new Set<string>([
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

const CORE_VENTURE_TYPES = [
  "shopify",
  "etsy",
  "affiliate",
  "content",
  "saas",
  "amazon",
] as const;

export { ACTIVE_VENTURE_STATUSES, CORE_VENTURE_TYPES };

/** Load read-only inputs for Empire Score V2 from existing tables. */
export async function loadEmpireScoreV2Inputs(): Promise<EmpireScoreV2RawInput> {
  const [
    agents,
    scouts,
    missions,
    missionCosts,
    revenueByStore,
    taskGroups,
  ] = await Promise.all([
    prisma.agentPerformance.findMany(),
    prisma.scoutPerformance.findMany(),
    prisma.mission.findMany({
      include: {
        ventureType: { select: { key: true } },
      },
    }),
    prisma.missionEvent.groupBy({
      by: ["missionId"],
      where: { estimatedCostGbp: { gt: 0 } },
      _sum: { estimatedCostGbp: true },
    }),
    prisma.revenue.groupBy({
      by: ["storeId"],
      _sum: { amount: true },
    }),
    prisma.task.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const costByMission = new Map(
    missionCosts.map((row) => [row.missionId, row._sum.estimatedCostGbp ?? 0])
  );
  const revenueMap = new Map(
    revenueByStore.map((row) => [row.storeId, row._sum.amount ?? 0])
  );

  const missionRows = missions.map((mission) => {
    const revenueGbp = mission.storeId
      ? revenueMap.get(mission.storeId) ?? 0
      : 0;
    const costGbp =
      costByMission.get(mission.id) ?? mission.actualCostGbp ?? 0;

    return {
      id: mission.id,
      status: mission.status,
      ventureTypeKey: mission.ventureType?.key ?? null,
      revenueGbp,
      costGbp,
    };
  });

  const totalRevenue = missionRows.reduce((sum, m) => sum + m.revenueGbp, 0);
  const totalCosts = missionRows.reduce((sum, m) => sum + m.costGbp, 0);
  const netProfit = totalRevenue - totalCosts;

  const taskCounts = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
  };
  for (const group of taskGroups) {
    if (group.status === "pending") taskCounts.pending = group._count.status;
    else if (group.status === "in_progress")
      taskCounts.inProgress = group._count.status;
    else if (group.status === "completed")
      taskCounts.completed = group._count.status;
    else if (group.status === "failed") taskCounts.failed = group._count.status;
  }

  const { getEmpireScoreSnapshot } = await import("./queries");
  const empireV1 = await getEmpireScoreSnapshot();

  return {
    agents: agents.map((a) => ({
      agentKey: a.agentKey,
      department: a.department,
      xp: a.xp,
      level: a.level,
      score: a.score,
      missionsWorked: a.missionsWorked,
      missionsCompleted: a.missionsCompleted,
      revenueInfluenced: a.revenueInfluenced,
    })),
    scouts: scouts.map((s) => ({
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
    })),
    missions: missionRows,
    taskCounts,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCosts: Math.round(totalCosts * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    empireScoreV1: empireV1.empireScore,
  };
}

export function agentsByDepartment(
  agents: EmpireScoreV2RawInput["agents"],
  department: string
) {
  return agents.filter((a) => a.department === department);
}

export function averageAgentScore(
  agents: EmpireScoreV2RawInput["agents"]
): number {
  if (agents.length === 0) return 0;
  return (
    Math.round(
      (agents.reduce((sum, a) => sum + a.score, 0) / agents.length) * 10
    ) / 10
  );
}

export function averageAgentLevel(
  agents: EmpireScoreV2RawInput["agents"]
): number {
  if (agents.length === 0) return 0;
  return (
    Math.round(
      (agents.reduce((sum, a) => sum + a.level, 0) / agents.length) * 10
    ) / 10
  );
}

export function averageScoutScore(
  scouts: EmpireScoreV2RawInput["scouts"]
): number {
  if (scouts.length === 0) return 0;
  return (
    Math.round(
      (scouts.reduce((sum, s) => sum + s.score, 0) / scouts.length) * 10
    ) / 10
  );
}

export function averageScoutLevel(
  scouts: EmpireScoreV2RawInput["scouts"]
): number {
  if (scouts.length === 0) return 0;
  return (
    Math.round(
      (scouts.reduce((sum, s) => sum + s.level, 0) / scouts.length) * 10
    ) / 10
  );
}

export { DEPARTMENT_KEYS };

import { prisma } from "@/lib/prisma";
import { DEPARTMENT_KEYS, MISSION_STATUSES } from "../constants";

export const PERFORMANCE_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000,
] as const;

export type AgentPerformanceInput = {
  agentKey: string;
  department: string;
  xp: number;
  level: number;
  score: number;
  missionsWorked: number;
  missionsCompleted: number;
  revenueInfluenced: number;
};

export type ScoutPerformanceInput = {
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
};

export type PerformanceSyncResult = {
  agentsUpserted: number;
  scoutsUpserted: number;
};

const COMPLETED_MISSION_STATUSES = new Set<string>([
  MISSION_STATUSES.APPROVED,
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = PERFORMANCE_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= PERFORMANCE_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

/** Upsert a single agent performance snapshot — computed metrics remain authoritative. */
export async function upsertAgentPerformance(
  input: AgentPerformanceInput
): Promise<void> {
  const now = new Date();
  await prisma.agentPerformance.upsert({
    where: { agentKey: input.agentKey },
    create: {
      ...input,
      lastCalculatedAt: now,
    },
    update: {
      ...input,
      lastCalculatedAt: now,
    },
  });
}

/** Upsert a single scout performance snapshot. */
export async function upsertScoutPerformance(
  input: ScoutPerformanceInput
): Promise<void> {
  const now = new Date();
  await prisma.scoutPerformance.upsert({
    where: { scoutKey: input.scoutKey },
    create: {
      ...input,
      lastCalculatedAt: now,
    },
    update: {
      ...input,
      lastCalculatedAt: now,
    },
  });
}

export async function persistAtlasPerformance(input: {
  empireScore: number;
  totalMissions: number;
  activeMissions: number;
  fundCount: number;
  revenueInfluenced: number;
  completedMissions: number;
}): Promise<void> {
  const xp =
    Math.floor(input.empireScore) +
    input.activeMissions * 10 +
    input.fundCount * 25;

  await upsertAgentPerformance({
    agentKey: "atlas",
    department: DEPARTMENT_KEYS.CEO_OFFICE,
    xp,
    level: levelFromXp(xp),
    score: input.empireScore,
    missionsWorked: input.totalMissions,
    missionsCompleted: input.completedMissions,
    revenueInfluenced: input.revenueInfluenced,
  });
}

export async function persistForgeAgentPerformance(
  agents: Array<{
    agentKey: string;
    level: number;
    xp: number;
    score: number;
    buildsStarted: number;
    buildsCompleted: number;
    missionsBuilt: number;
    missionsLaunched: number;
    revenueGenerated: number;
  }>
): Promise<number> {
  for (const agent of agents) {
    await upsertAgentPerformance({
      agentKey: agent.agentKey,
      department: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
      xp: agent.xp,
      level: agent.level,
      score: agent.score,
      missionsWorked: agent.buildsStarted + agent.missionsBuilt,
      missionsCompleted: agent.buildsCompleted + agent.missionsLaunched,
      revenueInfluenced: agent.revenueGenerated,
    });
  }
  return agents.length;
}

export async function persistNovaAgentPerformance(
  agents: Array<{
    agentKey: string;
    level: number;
    xp: number;
    score: number;
    launchedMissions: number;
    growingMissions: number;
    profitableMissions: number;
    trackedMissions: number;
    revenueGenerated: number;
  }>
): Promise<number> {
  for (const agent of agents) {
    await upsertAgentPerformance({
      agentKey: agent.agentKey,
      department: DEPARTMENT_KEYS.GROWTH,
      xp: agent.xp,
      level: agent.level,
      score: agent.score,
      missionsWorked: agent.trackedMissions,
      missionsCompleted:
        agent.launchedMissions + agent.growingMissions + agent.profitableMissions,
      revenueInfluenced: agent.revenueGenerated,
    });
  }
  return agents.length;
}

export async function persistMercuryAgentPerformance(
  agents: Array<{
    agentKey: string;
    level: number;
    xp: number;
    score: number;
    profitableMissions: number;
    costTrackedMissions: number;
    missionsAnalyzed: number;
    totalProfitGbp: number;
  }>
): Promise<number> {
  for (const agent of agents) {
    await upsertAgentPerformance({
      agentKey: agent.agentKey,
      department: DEPARTMENT_KEYS.FINANCE,
      xp: agent.xp,
      level: agent.level,
      score: agent.score,
      missionsWorked: agent.missionsAnalyzed,
      missionsCompleted: agent.profitableMissions,
      revenueInfluenced: agent.totalProfitGbp,
    });
  }
  return agents.length;
}

export async function persistScoutPerformanceBatch(
  scouts: Array<{
    scoutKey: string;
    level: number;
    xp: number;
    score: number;
    opportunitiesFound: number;
    opportunitiesApproved: number;
    missionsCreated: number;
    missionsLaunched: number;
    revenueGenerated: number;
    successRate: number;
  }>
): Promise<number> {
  for (const scout of scouts) {
    await upsertScoutPerformance({
      scoutKey: scout.scoutKey,
      xp: scout.xp,
      level: scout.level,
      score: scout.score,
      opportunitiesFound: scout.opportunitiesFound,
      opportunitiesApproved: scout.opportunitiesApproved,
      missionsCreated: scout.missionsCreated,
      missionsLaunched: scout.missionsLaunched,
      revenueGenerated: scout.revenueGenerated,
      successRate: scout.successRate,
    });
  }
  return scouts.length;
}

export function countCompletedMissions(statuses: string[]): number {
  return statuses.filter((status) => COMPLETED_MISSION_STATUSES.has(status)).length;
}

/** Sync all performance snapshots by loading computed dashboard metrics. */
export async function syncAllPerformance(): Promise<PerformanceSyncResult> {
  const [
    { getAtlasDashboardSnapshot },
    { getAthenaIntelligenceSnapshot },
    { getForgeWorkstationSnapshot },
    { getNovaGrowthSnapshot },
    { getMercurySnapshot },
  ] = await Promise.all([
    import("../atlas/ceo-dashboard"),
    import("../athena/intelligence-dashboard"),
    import("../forge/workstation-dashboard"),
    import("../nova/growth-dashboard"),
    import("../mercury/profitability-dashboard"),
  ]);

  await getAtlasDashboardSnapshot();
  await getAthenaIntelligenceSnapshot();
  await getForgeWorkstationSnapshot();
  await getNovaGrowthSnapshot();
  await getMercurySnapshot();

  const [agentCount, scoutCount] = await Promise.all([
    prisma.agentPerformance.count(),
    prisma.scoutPerformance.count(),
  ]);

  return {
    agentsUpserted: agentCount,
    scoutsUpserted: scoutCount,
  };
}

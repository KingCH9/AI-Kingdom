import { prisma } from "@/lib/prisma";

export type AgentPerformanceRecord = {
  agentKey: string;
  department: string;
  xp: number;
  level: number;
  score: number;
  missionsWorked: number;
  missionsCompleted: number;
  revenueInfluenced: number;
  lastCalculatedAt: string;
};

export type ScoutPerformanceRecord = {
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
  lastCalculatedAt: string;
};

export type PerformanceSnapshot = {
  generatedAt: string;
  agents: AgentPerformanceRecord[];
  scouts: ScoutPerformanceRecord[];
  topAgents: AgentPerformanceRecord[];
  topScouts: ScoutPerformanceRecord[];
  summary: {
    topAgent: AgentPerformanceRecord | null;
    topScout: ScoutPerformanceRecord | null;
    highestLevel: number;
    highestLevelAgent: AgentPerformanceRecord | null;
    highestLevelScout: ScoutPerformanceRecord | null;
    totalAgents: number;
    totalScouts: number;
  };
};

function mapAgent(row: {
  agentKey: string;
  department: string;
  xp: number;
  level: number;
  score: number;
  missionsWorked: number;
  missionsCompleted: number;
  revenueInfluenced: number;
  lastCalculatedAt: Date;
}): AgentPerformanceRecord {
  return {
    agentKey: row.agentKey,
    department: row.department,
    xp: row.xp,
    level: row.level,
    score: row.score,
    missionsWorked: row.missionsWorked,
    missionsCompleted: row.missionsCompleted,
    revenueInfluenced: row.revenueInfluenced,
    lastCalculatedAt: row.lastCalculatedAt.toISOString(),
  };
}

function mapScout(row: {
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
  lastCalculatedAt: Date;
}): ScoutPerformanceRecord {
  return {
    scoutKey: row.scoutKey,
    xp: row.xp,
    level: row.level,
    score: row.score,
    opportunitiesFound: row.opportunitiesFound,
    opportunitiesApproved: row.opportunitiesApproved,
    missionsCreated: row.missionsCreated,
    missionsLaunched: row.missionsLaunched,
    revenueGenerated: row.revenueGenerated,
    successRate: row.successRate,
    lastCalculatedAt: row.lastCalculatedAt.toISOString(),
  };
}

/** Read persisted performance snapshots — advisory rankings from DB. */
export async function getPerformanceSnapshot(): Promise<PerformanceSnapshot> {
  const [agents, scouts] = await Promise.all([
    prisma.agentPerformance.findMany({ orderBy: [{ score: "desc" }, { xp: "desc" }] }),
    prisma.scoutPerformance.findMany({ orderBy: [{ score: "desc" }, { xp: "desc" }] }),
  ]);

  const agentRecords = agents.map(mapAgent);
  const scoutRecords = scouts.map(mapScout);

  const topAgents = [...agentRecords]
    .sort((a, b) => b.score - a.score || b.xp - a.xp)
    .slice(0, 5);

  const topScouts = [...scoutRecords]
    .sort((a, b) => b.score - a.score || b.xp - a.xp)
    .slice(0, 5);

  const highestLevelAgent =
    [...agentRecords].sort((a, b) => b.level - a.level || b.xp - a.xp)[0] ?? null;
  const highestLevelScout =
    [...scoutRecords].sort((a, b) => b.level - a.level || b.xp - a.xp)[0] ?? null;

  const highestLevel = Math.max(
    highestLevelAgent?.level ?? 0,
    highestLevelScout?.level ?? 0
  );

  return {
    generatedAt: new Date().toISOString(),
    agents: agentRecords,
    scouts: scoutRecords,
    topAgents,
    topScouts,
    summary: {
      topAgent: topAgents[0] ?? null,
      topScout: topScouts[0] ?? null,
      highestLevel,
      highestLevelAgent,
      highestLevelScout,
      totalAgents: agentRecords.length,
      totalScouts: scoutRecords.length,
    },
  };
}

/** Compact summary for HQ dashboard widget. */
export async function getPerformanceSummary() {
  let snapshot = await getPerformanceSnapshot();

  if (snapshot.agents.length === 0 && snapshot.scouts.length === 0) {
    const { syncAllPerformance } = await import("./performance-sync");
    await syncAllPerformance();
    snapshot = await getPerformanceSnapshot();
  }

  return {
    topAgent: snapshot.summary.topAgent,
    topScout: snapshot.summary.topScout,
    highestLevel: snapshot.summary.highestLevel,
    highestLevelAgent: snapshot.summary.highestLevelAgent,
    highestLevelScout: snapshot.summary.highestLevelScout,
    highestXpAgent:
      [...snapshot.agents].sort((a, b) => b.xp - a.xp || b.level - a.level)[0] ??
      null,
    highestRevenueAgent:
      [...snapshot.agents].sort(
        (a, b) => b.revenueInfluenced - a.revenueInfluenced
      )[0] ?? null,
    topAgents: snapshot.topAgents.slice(0, 3),
    topScouts: snapshot.topScouts.slice(0, 3),
    totalAgents: snapshot.summary.totalAgents,
    totalScouts: snapshot.summary.totalScouts,
  };
}

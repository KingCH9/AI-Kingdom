import { prisma } from "@/lib/prisma";
import { SCOUT_REGISTRY } from "../scouts";
import { resolveMissionVentureTypeKey } from "./scout-attribution";
import { computeScoutScoreWithFactors, type ScoutScoreFactors } from "./scout-score";
import {
  computeScoutMetrics,
  missionBelongsToScout,
  type ScoutMetrics,
  type ScoutRawMission,
  type ScoutRawOpportunity,
} from "./scout-metrics";
import {
  computeScoutLevel,
  computeScoutXpFromMissions,
  type ScoutXpBreakdown,
} from "./scout-xp";

export type ScoutIntelligenceRecord = {
  scoutKey: string;
  name: string;
  ventureTypeKey: string;
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
  score: number;
  opportunitiesFound: number;
  opportunitiesApproved: number;
  missionsCreated: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
  xpBreakdown: ScoutXpBreakdown;
  scoreFactors: ScoutScoreFactors;
};

export type ScoutRankings = {
  topScouts: ScoutIntelligenceRecord[];
  worstScouts: ScoutIntelligenceRecord[];
  highestRevenueScouts: ScoutIntelligenceRecord[];
  highestSuccessRateScouts: ScoutIntelligenceRecord[];
};

export type AthenaIntelligenceSnapshot = {
  generatedAt: string;
  scouts: ScoutIntelligenceRecord[];
  topScouts: ScoutIntelligenceRecord[];
  scoutRankings: ScoutRankings;
  summary: {
    topScout: ScoutIntelligenceRecord | null;
    averageScoutScore: number;
    totalScoutRevenue: number;
    highestRevenueScout: ScoutIntelligenceRecord | null;
    totalXp: number;
    averageLevel: number;
  };
};

async function loadScoutRawData(): Promise<{
  opportunities: ScoutRawOpportunity[];
  missions: ScoutRawMission[];
}> {
  const [opportunities, missions, revenueByStore] = await Promise.all([
    prisma.opportunity.findMany({
      select: { id: true, category: true, status: true },
    }),
    prisma.mission.findMany({
      include: {
        ventureType: { select: { key: true } },
        store: { select: { id: true, revenue: true } },
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

  return {
    opportunities,
    missions: missions.map((m) => ({
      id: m.id,
      status: m.status,
      opportunityId: m.opportunityId,
      ventureTypeKey: resolveMissionVentureTypeKey({
        ventureTypeKey: m.ventureType?.key ?? null,
        revenueStream: m.revenueStream,
      }),
      revenueGbp:
        (m.storeId ? revenueMap.get(m.storeId) : undefined) ??
        m.store?.revenue ??
        0,
    })),
  };
}

function buildScoutRecord(
  metrics: ScoutMetrics,
  missions: ScoutRawMission[],
  scoutMissions: ScoutRawMission[]
): ScoutIntelligenceRecord {
  const xpBreakdown = computeScoutXpFromMissions(metrics, scoutMissions);
  const levelInfo = computeScoutLevel(xpBreakdown.total);
  const scoreFactors = computeScoutScoreWithFactors(metrics);

  return {
    scoutKey: metrics.scoutKey,
    name: metrics.name,
    ventureTypeKey: metrics.ventureTypeKey,
    level: levelInfo.level,
    xp: levelInfo.xp,
    nextLevelXp: levelInfo.nextLevelXp,
    xpToNextLevel: levelInfo.xpToNextLevel,
    score: scoreFactors.score,
    opportunitiesFound: metrics.opportunitiesFound,
    opportunitiesApproved: metrics.opportunitiesApproved,
    missionsCreated: metrics.missionsCreated,
    missionsLaunched: metrics.missionsLaunched,
    revenueGenerated: metrics.revenueGenerated,
    successRate: metrics.successRate,
    xpBreakdown,
    scoreFactors,
  };
}

function filterScoutMissions(
  scoutKey: string,
  ventureTypeKey: string,
  missions: ScoutRawMission[],
  opportunities: ScoutRawOpportunity[]
): ScoutRawMission[] {
  const scout = SCOUT_REGISTRY.find((s) => s.key === scoutKey)!;
  return missions.filter((m) => {
    const opp = m.opportunityId
      ? opportunities.find((o) => o.id === m.opportunityId)
      : undefined;
    return missionBelongsToScout(m, scout, opp);
  });
}

export function buildScoutRankings(
  scouts: ScoutIntelligenceRecord[]
): ScoutRankings {
  const byScore = [...scouts].sort((a, b) => b.score - a.score);
  const byRevenue = [...scouts].sort(
    (a, b) => b.revenueGenerated - a.revenueGenerated
  );
  const bySuccess = [...scouts].sort((a, b) => b.successRate - a.successRate);

  return {
    topScouts: byScore.slice(0, 3),
    worstScouts: [...byScore].reverse().slice(0, 3),
    highestRevenueScouts: byRevenue.slice(0, 3),
    highestSuccessRateScouts: bySuccess.filter((s) => s.missionsCreated > 0).slice(0, 3),
  };
}

/** Full Athena intelligence snapshot — computed from existing HQ data. */
export async function getAthenaIntelligenceSnapshot(): Promise<AthenaIntelligenceSnapshot> {
  const { opportunities, missions } = await loadScoutRawData();

  const scouts = SCOUT_REGISTRY.map((scout) => {
    const metrics = computeScoutMetrics(scout, opportunities, missions);
    const scoutMissions = filterScoutMissions(
      scout.key,
      scout.ventureTypeKey,
      missions,
      opportunities
    );
    return buildScoutRecord(metrics, missions, scoutMissions);
  }).sort((a, b) => b.score - a.score);

  const scoutRankings = buildScoutRankings(scouts);
  const totalScoutRevenue = scouts.reduce(
    (sum, s) => sum + s.revenueGenerated,
    0
  );
  const averageScoutScore =
    scouts.length > 0
      ? Math.round(
          (scouts.reduce((sum, s) => sum + s.score, 0) / scouts.length) * 10
        ) / 10
      : 0;
  const highestRevenueScout =
    [...scouts].sort((a, b) => b.revenueGenerated - a.revenueGenerated)[0] ??
    null;

  return {
    generatedAt: new Date().toISOString(),
    scouts,
    topScouts: scoutRankings.topScouts,
    scoutRankings,
    summary: {
      topScout: scouts[0] ?? null,
      averageScoutScore,
      totalScoutRevenue: Math.round(totalScoutRevenue * 100) / 100,
      highestRevenueScout,
      totalXp: scouts.reduce((sum, s) => sum + s.xp, 0),
      averageLevel:
        scouts.length > 0
          ? Math.round(
              (scouts.reduce((sum, s) => sum + s.level, 0) / scouts.length) * 10
            ) / 10
          : 0,
    },
  };
}

/** Compact summary for HQ dashboard widget. */
export async function getAthenaIntelligenceSummary() {
  const snapshot = await getAthenaIntelligenceSnapshot();
  return snapshot.summary;
}

/** Scout rankings for Atlas CEO integration. */
export async function getScoutRankingsForAtlas(): Promise<ScoutRankings> {
  const snapshot = await getAthenaIntelligenceSnapshot();
  return snapshot.scoutRankings;
}

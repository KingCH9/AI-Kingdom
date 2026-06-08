import type { ScoutMetrics } from "./scout-metrics";
import { countApprovedMissions, type ScoutRawMission } from "./scout-metrics";

export const SCOUT_XP_REWARDS = {
  OPPORTUNITY_CREATED: 5,
  MISSION_CREATED: 10,
  MISSION_APPROVED: 15,
  MISSION_LAUNCHED: 25,
  REVENUE_PER_GBP: 1,
} as const;

/** Scout level thresholds — cumulative XP required to reach each level. */
export const SCOUT_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000,
] as const;

export const SCOUT_MAX_LEVEL = SCOUT_LEVEL_THRESHOLDS.length;

export type ScoutXpBreakdown = {
  fromOpportunities: number;
  fromMissionsCreated: number;
  fromMissionsApproved: number;
  fromMissionsLaunched: number;
  fromRevenue: number;
  total: number;
};

export type ScoutLevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
};

/** Deterministic scout XP from computed metrics. */
export function computeScoutXp(
  metrics: ScoutMetrics,
  approvedMissionCount: number
): ScoutXpBreakdown {
  const fromOpportunities =
    metrics.opportunitiesFound * SCOUT_XP_REWARDS.OPPORTUNITY_CREATED;
  const fromMissionsCreated =
    metrics.missionsCreated * SCOUT_XP_REWARDS.MISSION_CREATED;
  const fromMissionsApproved =
    approvedMissionCount * SCOUT_XP_REWARDS.MISSION_APPROVED;
  const fromMissionsLaunched =
    metrics.missionsLaunched * SCOUT_XP_REWARDS.MISSION_LAUNCHED;
  const fromRevenue = Math.floor(
    metrics.revenueGenerated * SCOUT_XP_REWARDS.REVENUE_PER_GBP
  );

  return {
    fromOpportunities,
    fromMissionsCreated,
    fromMissionsApproved,
    fromMissionsLaunched,
    fromRevenue,
    total:
      fromOpportunities +
      fromMissionsCreated +
      fromMissionsApproved +
      fromMissionsLaunched +
      fromRevenue,
  };
}

export function computeScoutXpFromMissions(
  metrics: ScoutMetrics,
  missions: ScoutRawMission[]
): ScoutXpBreakdown {
  return computeScoutXp(metrics, countApprovedMissions(missions));
}

/** Map total XP to scout level (1–8). */
export function computeScoutLevel(xp: number): ScoutLevelInfo {
  let level = 1;
  for (let i = SCOUT_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= SCOUT_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const nextThreshold =
    level < SCOUT_MAX_LEVEL ? SCOUT_LEVEL_THRESHOLDS[level] : null;

  return {
    level,
    xp,
    nextLevelXp: nextThreshold,
    xpToNextLevel:
      nextThreshold != null ? Math.max(nextThreshold - xp, 0) : null,
  };
}

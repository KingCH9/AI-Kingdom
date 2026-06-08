import type { ForgeBuildMetrics } from "./build-engine";

export const FORGE_XP_REWARDS = {
  BUILD_STARTED: 10,
  BUILD_COMPLETED: 15,
  BUILD_TASK_COMPLETED: 10,
  MISSION_BUILT: 20,
  STORE_LAUNCHED: 25,
  MISSION_LAUNCHED: 30,
  REVENUE_PER_GBP: 1,
  QA_PASS: 10,
} as const;

export const FORGE_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000,
] as const;

export const FORGE_MAX_LEVEL = FORGE_LEVEL_THRESHOLDS.length;

export type ForgeXpBreakdown = {
  fromBuildsStarted: number;
  fromBuildsCompleted: number;
  fromMissionsBuilt: number;
  fromStoresLaunched: number;
  fromMissionsLaunched: number;
  fromRevenue: number;
  fromQaPass: number;
  total: number;
};

export type ForgeLevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
};

/** Deterministic Forge agent XP from build metrics. */
export function computeForgeXp(metrics: ForgeBuildMetrics): ForgeXpBreakdown {
  const fromBuildsStarted =
    metrics.buildsStarted * FORGE_XP_REWARDS.BUILD_STARTED;
  const fromBuildsCompleted =
    metrics.buildsCompleted * FORGE_XP_REWARDS.BUILD_COMPLETED;
  const fromMissionsBuilt =
    metrics.missionsBuilt * FORGE_XP_REWARDS.MISSION_BUILT;
  const fromStoresLaunched =
    metrics.storesLaunched * FORGE_XP_REWARDS.STORE_LAUNCHED;
  const fromMissionsLaunched =
    metrics.missionsLaunched * FORGE_XP_REWARDS.MISSION_LAUNCHED;
  const fromRevenue = Math.floor(
    metrics.revenueGenerated * FORGE_XP_REWARDS.REVENUE_PER_GBP
  );
  const fromQaPass =
    metrics.agentKey === "qa_inspector"
      ? metrics.buildsCompleted * FORGE_XP_REWARDS.QA_PASS
      : 0;

  return {
    fromBuildsStarted,
    fromBuildsCompleted,
    fromMissionsBuilt,
    fromStoresLaunched,
    fromMissionsLaunched,
    fromRevenue,
    fromQaPass,
    total:
      fromBuildsStarted +
      fromBuildsCompleted +
      fromMissionsBuilt +
      fromStoresLaunched +
      fromMissionsLaunched +
      fromRevenue +
      fromQaPass,
  };
}

/** Map total XP to Forge agent level (1–8). */
export function computeForgeLevel(xp: number): ForgeLevelInfo {
  let level = 1;
  for (let i = FORGE_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= FORGE_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const nextThreshold =
    level < FORGE_MAX_LEVEL ? FORGE_LEVEL_THRESHOLDS[level] : null;

  return {
    level,
    xp,
    nextLevelXp: nextThreshold,
    xpToNextLevel:
      nextThreshold != null ? Math.max(nextThreshold - xp, 0) : null,
  };
}

/** Compute Forge agent score (0–100) from build performance. */
export function computeForgeAgentScore(metrics: ForgeBuildMetrics): number {
  const launchRate =
    metrics.missionsBuilt > 0
      ? (metrics.missionsLaunched / metrics.missionsBuilt) * 100
      : 0;
  const completionRate =
    metrics.buildsStarted > 0
      ? (metrics.buildsCompleted / metrics.buildsStarted) * 100
      : metrics.buildsCompleted > 0
        ? 100
        : 0;
  const revenueComponent = Math.min(metrics.revenueGenerated, 100);

  const raw =
    metrics.successRate * 0.4 +
    Math.min(launchRate, 100) * 0.3 +
    Math.min(completionRate, 100) * 0.2 +
    revenueComponent * 0.1;

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

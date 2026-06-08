import type { ScoutMetrics } from "./scout-metrics";

/** Compute scout intelligence score (0–100) from performance metrics. */
export function computeScoutScore(metrics: ScoutMetrics): number {
  const missionCreationRate =
    metrics.opportunitiesFound > 0
      ? (metrics.missionsCreated / metrics.opportunitiesFound) * 100
      : metrics.missionsCreated > 0
        ? 100
        : 0;

  const launchRate =
    metrics.missionsCreated > 0
      ? (metrics.missionsLaunched / metrics.missionsCreated) * 100
      : 0;

  const revenueComponent = Math.min(metrics.revenueGenerated, 100);

  const raw =
    metrics.successRate * 0.35 +
    Math.min(missionCreationRate, 100) * 0.25 +
    Math.min(launchRate, 100) * 0.25 +
    revenueComponent * 0.15;

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

export type ScoutScoreFactors = {
  successRate: number;
  missionCreationRate: number;
  launchRate: number;
  revenueComponent: number;
  score: number;
};

export function computeScoutScoreWithFactors(
  metrics: ScoutMetrics
): ScoutScoreFactors {
  const missionCreationRate =
    metrics.opportunitiesFound > 0
      ? Math.round(
          (metrics.missionsCreated / metrics.opportunitiesFound) * 1000
        ) / 10
      : metrics.missionsCreated > 0
        ? 100
        : 0;

  const launchRate =
    metrics.missionsCreated > 0
      ? Math.round(
          (metrics.missionsLaunched / metrics.missionsCreated) * 1000
        ) / 10
      : 0;

  const revenueComponent = Math.min(metrics.revenueGenerated, 100);
  const score = computeScoutScore(metrics);

  return {
    successRate: metrics.successRate,
    missionCreationRate,
    launchRate,
    revenueComponent,
    score,
  };
}

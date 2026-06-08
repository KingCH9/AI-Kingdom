import type { NovaAgentMetrics } from "./growth-engine";

export const NOVA_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000,
] as const;

export const NOVA_MAX_LEVEL = NOVA_LEVEL_THRESHOLDS.length;

export type NovaXpBreakdown = {
  fromLaunched: number;
  fromContent: number;
  fromGrowing: number;
  fromProfitable: number;
  fromTracked: number;
  fromRevenue: number;
  total: number;
};

export type NovaLevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
};

/** Deterministic Nova agent XP — per-agent reward rules. */
export function computeNovaXp(metrics: NovaAgentMetrics): NovaXpBreakdown {
  let fromLaunched = 0;
  let fromContent = 0;
  let fromGrowing = 0;
  let fromProfitable = 0;
  let fromTracked = 0;
  const fromRevenue = Math.floor(metrics.revenueGenerated);

  switch (metrics.agentKey) {
    case "seo_specialist":
      fromLaunched = metrics.launchedMissions * 10;
      break;
    case "content_marketer":
      fromContent = metrics.contentMissions * 10;
      break;
    case "social_media_manager":
      fromGrowing = metrics.growingMissions * 15;
      break;
    case "campaign_manager":
      fromProfitable = metrics.profitableMissions * 20;
      break;
    case "analytics_manager":
      fromTracked = metrics.trackedMissions * 5;
      fromProfitable = metrics.profitableMissions * 10;
      break;
  }

  if (metrics.agentKey !== "analytics_manager") {
    // +1 XP per £ revenue for revenue-focused agents
    // fromRevenue already set
  }

  return {
    fromLaunched,
    fromContent,
    fromGrowing,
    fromProfitable,
    fromTracked,
    fromRevenue:
      metrics.agentKey === "analytics_manager" ? 0 : fromRevenue,
    total:
      fromLaunched +
      fromContent +
      fromGrowing +
      fromProfitable +
      fromTracked +
      (metrics.agentKey === "analytics_manager" ? 0 : fromRevenue),
  };
}

export function computeNovaLevel(xp: number): NovaLevelInfo {
  let level = 1;
  for (let i = NOVA_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= NOVA_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const nextThreshold =
    level < NOVA_MAX_LEVEL ? NOVA_LEVEL_THRESHOLDS[level] : null;

  return {
    level,
    xp,
    nextLevelXp: nextThreshold,
    xpToNextLevel:
      nextThreshold != null ? Math.max(nextThreshold - xp, 0) : null,
  };
}

/** Growth score 0–100 from launch, grow, profit, revenue, diversity. */
export function computeGrowthScore(metrics: NovaAgentMetrics): number {
  const revenueComponent = Math.min(metrics.revenueGenerated, 100);
  const diversityComponent = Math.min(metrics.ventureDiversity, 100);

  const raw =
    Math.min(metrics.launchedMissions * 8, 40) +
    Math.min(metrics.growingMissions * 10, 25) +
    Math.min(metrics.profitableMissions * 15, 30) +
    revenueComponent * 0.15 +
    diversityComponent * 0.1;

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

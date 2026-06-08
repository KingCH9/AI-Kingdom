import { MISSION_STATUSES } from "../constants";

export const MERCURY_AGENTS = [
  { key: "roi_analyst", name: "ROI Analyst" },
  { key: "budget_controller", name: "Budget Controller" },
  { key: "cost_monitor", name: "Cost Monitor" },
  { key: "portfolio_manager", name: "Portfolio Manager" },
  { key: "capital_allocator", name: "Capital Allocator" },
] as const;

export type MercuryAgentKey = (typeof MERCURY_AGENTS)[number]["key"];

export type MissionProfitability = {
  missionId: number;
  title: string;
  status: string;
  storeId: number | null;
  ventureTypeKey: string | null;
  revenueGbp: number;
  costGbp: number;
  netProfitGbp: number;
  roi: number | null;
  revenueMultiple: number | null;
  capitalEfficiency: number;
  profitabilityClass: "profitable" | "unprofitable" | "break_even" | "unknown";
};

export type MercuryAgentMetrics = {
  agentKey: MercuryAgentKey;
  name: string;
  profitableMissions: number;
  costTrackedMissions: number;
  spendEvents: number;
  profitableVentures: number;
  fundRecommendations: number;
  totalProfitGbp: number;
  missionsAnalyzed: number;
};

export const MERCURY_LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 4000, 8000,
] as const;

export const MERCURY_MAX_LEVEL = MERCURY_LEVEL_THRESHOLDS.length;

export type MercuryXpBreakdown = {
  fromProfitable: number;
  fromProfit: number;
  fromCostTracked: number;
  fromSpendEvents: number;
  fromProfitableVentures: number;
  fromFundRecommendations: number;
  total: number;
};

export type MercuryLevelInfo = {
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
};

/** Per-mission profitability — computed at read time. */
export function computeMissionProfitability(input: {
  missionId: number;
  title: string;
  status: string;
  storeId: number | null;
  ventureTypeKey: string | null;
  revenueGbp: number;
  costGbp: number;
}): MissionProfitability {
  const revenueGbp = Math.round(input.revenueGbp * 100) / 100;
  const costGbp = Math.round(input.costGbp * 100) / 100;
  const netProfitGbp = Math.round((revenueGbp - costGbp) * 100) / 100;

  let roi: number | null = null;
  let revenueMultiple: number | null = null;
  if (costGbp > 0) {
    roi = Math.round(((revenueGbp - costGbp) / costGbp) * 1000) / 10;
    revenueMultiple = Math.round((revenueGbp / costGbp) * 100) / 100;
  }

  const capitalEfficiency =
    Math.round((revenueGbp / Math.max(costGbp, 1)) * 100) / 100;

  let profitabilityClass: MissionProfitability["profitabilityClass"] =
    "unknown";
  if (costGbp > 0 || revenueGbp > 0) {
    if (netProfitGbp > 0) profitabilityClass = "profitable";
    else if (netProfitGbp < 0) profitabilityClass = "unprofitable";
    else profitabilityClass = "break_even";
  }

  return {
    missionId: input.missionId,
    title: input.title,
    status: input.status,
    storeId: input.storeId,
    ventureTypeKey: input.ventureTypeKey,
    revenueGbp,
    costGbp,
    netProfitGbp,
    roi,
    revenueMultiple,
    capitalEfficiency,
    profitabilityClass,
  };
}

export function isProfitableMission(m: MissionProfitability): boolean {
  return (
    m.profitabilityClass === "profitable" ||
    m.status === MISSION_STATUSES.PROFITABLE
  );
}

export function computeMercuryAgentMetrics(
  agentKey: MercuryAgentKey,
  missions: MissionProfitability[],
  spendEventCount: number,
  fundRecommendationCount: number
): MercuryAgentMetrics {
  const profitableMissions = missions.filter(isProfitableMission).length;
  const costTrackedMissions = missions.filter((m) => m.costGbp > 0).length;
  const profitableVentures = missions.filter(
    (m) => isProfitableMission(m) && m.storeId != null
  ).length;
  const totalProfitGbp = Math.round(
    missions.reduce((sum, m) => sum + Math.max(m.netProfitGbp, 0), 0) * 100
  ) / 100;

  const base = {
    profitableMissions,
    costTrackedMissions,
    spendEvents: spendEventCount,
    profitableVentures,
    fundRecommendations: fundRecommendationCount,
    totalProfitGbp,
    missionsAnalyzed: missions.length,
  };

  switch (agentKey) {
    case "roi_analyst":
      return {
        agentKey,
        name: "ROI Analyst",
        ...base,
        profitableMissions,
      };
    case "budget_controller":
      return {
        agentKey,
        name: "Budget Controller",
        ...base,
        costTrackedMissions,
      };
    case "cost_monitor":
      return {
        agentKey,
        name: "Cost Monitor",
        ...base,
        spendEvents: spendEventCount,
      };
    case "portfolio_manager":
      return {
        agentKey,
        name: "Portfolio Manager",
        ...base,
        profitableVentures,
      };
    case "capital_allocator":
      return {
        agentKey,
        name: "Capital Allocator",
        ...base,
        fundRecommendations: fundRecommendationCount,
      };
  }
}

export function computeMercuryXp(metrics: MercuryAgentMetrics): MercuryXpBreakdown {
  let fromProfitable = 0;
  let fromProfit = 0;
  let fromCostTracked = 0;
  let fromSpendEvents = 0;
  let fromProfitableVentures = 0;
  let fromFundRecommendations = 0;

  switch (metrics.agentKey) {
    case "roi_analyst":
      fromProfitable = metrics.profitableMissions * 20;
      fromProfit = Math.floor(Math.max(metrics.totalProfitGbp, 0));
      break;
    case "budget_controller":
      fromCostTracked = metrics.costTrackedMissions * 10;
      break;
    case "cost_monitor":
      fromSpendEvents = metrics.spendEvents * 5;
      break;
    case "portfolio_manager":
      fromProfitableVentures = metrics.profitableVentures * 25;
      break;
    case "capital_allocator":
      fromFundRecommendations = metrics.fundRecommendations * 30;
      break;
  }

  return {
    fromProfitable,
    fromProfit,
    fromCostTracked,
    fromSpendEvents,
    fromProfitableVentures,
    fromFundRecommendations,
    total:
      fromProfitable +
      fromProfit +
      fromCostTracked +
      fromSpendEvents +
      fromProfitableVentures +
      fromFundRecommendations,
  };
}

export function computeMercuryLevel(xp: number): MercuryLevelInfo {
  let level = 1;
  for (let i = MERCURY_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= MERCURY_LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const nextThreshold =
    level < MERCURY_MAX_LEVEL ? MERCURY_LEVEL_THRESHOLDS[level] : null;

  return {
    level,
    xp,
    nextLevelXp: nextThreshold,
    xpToNextLevel:
      nextThreshold != null ? Math.max(nextThreshold - xp, 0) : null,
  };
}

export function computeMercuryAgentScore(
  metrics: MercuryAgentMetrics,
  avgRoi: number | null
): number {
  const roiComponent =
    avgRoi != null ? Math.min(Math.max(avgRoi, 0), 100) : 0;
  const profitComponent = Math.min(metrics.totalProfitGbp, 100);

  const raw =
    Math.min(metrics.profitableMissions * 10, 40) +
    Math.min(metrics.costTrackedMissions * 3, 20) +
    roiComponent * 0.25 +
    profitComponent * 0.15;

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

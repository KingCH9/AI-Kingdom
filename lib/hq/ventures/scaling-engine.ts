import { MISSION_STATUSES } from "../constants";
import type { VentureRecord } from "../revenue/venture-metrics";
import type { VentureFundingRecommendation } from "../capital/funding-recommendations";
import { computeScalingComponents } from "./scaling-model";
import {
  buildScalingRecommendation,
  rankByScalingScore,
  type VentureScalingRecommendation,
} from "./scaling-recommendations";
import {
  buildGrowthLeversForRecommendations,
  buildScalingPriorityQueue,
  type ScalingPriorityQueue,
  type VentureGrowthLevers,
} from "./growth-levers";

export type ScalingEngineInsight = {
  engine: string;
  title: string;
  summary: string;
  href: string;
};

function capitalScoreByMission(
  capitalRecs: VentureFundingRecommendation[]
): Map<number, number> {
  return new Map(
    capitalRecs.map((r) => [r.missionId, r.allocationScore])
  );
}

export function buildVentureScalingRecommendations(
  ventures: VentureRecord[],
  capitalRecs: VentureFundingRecommendation[]
): VentureScalingRecommendation[] {
  const capitalMap = capitalScoreByMission(capitalRecs);

  const recommendations = ventures.map((venture) => {
    const components = computeScalingComponents({
      venture,
      capitalAllocationScore: capitalMap.get(venture.missionId) ?? 30,
    });

    return buildScalingRecommendation({
      missionId: venture.missionId,
      title: venture.title,
      status: venture.status,
      revenueGbp: venture.revenueGbp,
      revenueMonthlyGbp: venture.revenueMonthlyGbp,
      growthScore: venture.growthScore,
      conversionRate: venture.traffic.conversionRate,
      components,
    });
  });

  return rankByScalingScore(recommendations);
}

export function computePortfolioScalingScore(
  recommendations: VentureScalingRecommendation[]
): number {
  const active = recommendations.filter(
    (r) => r.status !== MISSION_STATUSES.KILLED
  );
  if (active.length === 0) return 0;

  const avgScore =
    active.reduce((sum, r) => sum + r.scalingScore, 0) / active.length;
  const scaleRatio =
    active.filter(
      (r) =>
        r.recommendation === "scale_now" ||
        r.recommendation === "scale_cautiously"
    ).length / active.length;

  return Math.round(Math.min(avgScore * 0.65 + scaleRatio * 100 * 0.35, 100));
}

export function buildScalingEngineInsights(input: {
  scaleNowCount: number;
  optimizeCount: number;
  avgConversion: number;
  topLever: string | null;
}): ScalingEngineInsight[] {
  return [
    {
      engine: "nova",
      title: "Nova Growth Advisory",
      summary: `${input.scaleNowCount} ventures ready to scale now · ${input.optimizeCount} need optimization first`,
      href: "/hq/nova",
    },
    {
      engine: "rae",
      title: "Revenue Acceleration Engine",
      summary: `Portfolio avg conversion ${input.avgConversion}% — cross-check RAE venture metrics`,
      href: "/hq/revenue",
    },
    {
      engine: "capital",
      title: "Capital Allocation Engine",
      summary: "Align scaling actions with CAE fund recommendations before increasing spend",
      href: "/hq/capital",
    },
    {
      engine: "mercury",
      title: "Mercury Profitability",
      summary: "Verify ROI thresholds before Nova scales paid acquisition",
      href: "/hq/mercury",
    },
    {
      engine: "forge",
      title: "Forge Build Status",
      summary: "Ensure store assets are launch-ready before scaling traffic",
      href: "/hq/forge",
    },
  ];
}

export function runScalingEngine(input: {
  ventures: VentureRecord[];
  capitalRecs: VentureFundingRecommendation[];
}) {
  const recommendations = buildVentureScalingRecommendations(
    input.ventures,
    input.capitalRecs
  );
  const priorityQueue = buildScalingPriorityQueue(recommendations);
  const growthLevers = buildGrowthLeversForRecommendations(
    input.ventures,
    recommendations
  );
  const portfolioScalingScore = computePortfolioScalingScore(recommendations);

  const active = recommendations.filter(
    (r) => r.status !== MISSION_STATUSES.KILLED
  );
  const avgConversion =
    active.length > 0
      ? Math.round(
          (active.reduce((s, r) => s + r.conversionRate, 0) / active.length) * 10
        ) / 10
      : 0;

  const engineInsights = buildScalingEngineInsights({
    scaleNowCount: priorityQueue.scaleNow.length,
    optimizeCount: priorityQueue.optimizeFirst.length,
    avgConversion,
    topLever: growthLevers[0]?.primaryLever ?? null,
  });

  return {
    recommendations,
    priorityQueue,
    growthLevers,
    portfolioScalingScore,
    engineInsights,
  };
}

export type { ScalingPriorityQueue, VentureGrowthLevers };

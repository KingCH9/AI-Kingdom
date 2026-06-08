import { MISSION_STATUSES } from "../constants";
import type { ScalingScoreComponents } from "./scaling-model";
import { computeScalingScore, deriveScalingStage } from "./scaling-model";

export type NovaScalingAction =
  | "scale_now"
  | "scale_cautiously"
  | "optimize_first"
  | "hold"
  | "pause";

export type VentureScalingRecommendation = {
  missionId: number;
  title: string;
  status: string;
  scalingScore: number;
  scalingStage: ReturnType<typeof deriveScalingStage>;
  recommendation: NovaScalingAction;
  components: ScalingScoreComponents;
  revenueGbp: number;
  revenueMonthlyGbp: number;
  growthScore: number;
  conversionRate: number;
  rationale: string;
  priority: number;
};

export function deriveScalingRecommendation(
  scalingScore: number,
  status: string
): NovaScalingAction {
  if (status === MISSION_STATUSES.KILLED) return "pause";
  if (scalingScore >= 85) return "scale_now";
  if (scalingScore >= 70) return "scale_cautiously";
  if (scalingScore >= 50) return "optimize_first";
  if (scalingScore >= 30) return "hold";
  return "pause";
}

function buildRationale(
  action: NovaScalingAction,
  scalingScore: number,
  conversionRate: number
): string {
  switch (action) {
    case "scale_now":
      return `Score ${scalingScore}/100 — Nova recommends immediate scaling (traffic, ads, content).`;
    case "scale_cautiously":
      return `Score ${scalingScore}/100 — scale with measured budget increases; monitor conversion (${conversionRate}%).`;
    case "optimize_first":
      return `Score ${scalingScore}/100 — optimize conversion and unit economics before scaling spend.`;
    case "hold":
      return `Score ${scalingScore}/100 — maintain current growth pace; insufficient signals to scale.`;
    case "pause":
      return `Score ${scalingScore}/100 — pause scaling activity; review venture health.`;
  }
}

export function buildScalingRecommendation(input: {
  missionId: number;
  title: string;
  status: string;
  revenueGbp: number;
  revenueMonthlyGbp: number;
  growthScore: number;
  conversionRate: number;
  components: ScalingScoreComponents;
}): VentureScalingRecommendation {
  const scalingScore = computeScalingScore(input.components);
  const recommendation = deriveScalingRecommendation(
    scalingScore,
    input.status
  );
  const scalingStage = deriveScalingStage(scalingScore, input.status);

  return {
    missionId: input.missionId,
    title: input.title,
    status: input.status,
    scalingScore,
    scalingStage,
    recommendation,
    components: input.components,
    revenueGbp: input.revenueGbp,
    revenueMonthlyGbp: input.revenueMonthlyGbp,
    growthScore: input.growthScore,
    conversionRate: input.conversionRate,
    rationale: buildRationale(
      recommendation,
      scalingScore,
      input.conversionRate
    ),
    priority: scalingScore,
  };
}

export function countScalingByAction(
  recommendations: VentureScalingRecommendation[]
): Record<NovaScalingAction, number> {
  return recommendations.reduce(
    (acc, rec) => {
      acc[rec.recommendation] += 1;
      return acc;
    },
    {
      scale_now: 0,
      scale_cautiously: 0,
      optimize_first: 0,
      hold: 0,
      pause: 0,
    }
  );
}

export function rankByScalingScore(
  recommendations: VentureScalingRecommendation[]
): VentureScalingRecommendation[] {
  return [...recommendations].sort(
    (a, b) =>
      b.scalingScore - a.scalingScore || b.revenueGbp - a.revenueGbp
  );
}

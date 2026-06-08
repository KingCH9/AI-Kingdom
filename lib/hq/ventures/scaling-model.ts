import { MISSION_STATUSES } from "../constants";
import type { VentureRecord } from "../revenue/venture-metrics";

export type ScalingScoreComponents = {
  growthMomentum: number;
  revenueVelocity: number;
  conversionPerformance: number;
  scaleReadiness: number;
  capitalSupport: number;
  riskAdjustment: number;
};

export type VentureScalingInput = {
  venture: VentureRecord;
  capitalAllocationScore: number;
};

const WEIGHTS = {
  growthMomentum: 0.25,
  revenueVelocity: 0.2,
  conversionPerformance: 0.2,
  scaleReadiness: 0.15,
  capitalSupport: 0.1,
  riskAdjustment: 0.1,
} as const;

function clamp(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}

export function computeGrowthMomentum(venture: VentureRecord): number {
  return clamp(venture.growthScore);
}

export function computeRevenueVelocity(venture: VentureRecord): number {
  const monthly = venture.revenueMonthlyGbp;
  const total = venture.revenueGbp;
  const velocity = monthly > 0 ? monthly * 1.2 : total > 0 ? total * 0.5 : 0;
  return clamp(Math.min(velocity, 100));
}

export function computeConversionPerformance(venture: VentureRecord): number {
  const rate = venture.traffic.conversionRate;
  const views = venture.traffic.pageViews;
  if (views === 0) return venture.revenueGbp > 0 ? 40 : 10;
  return clamp(Math.min(rate * 8, 100));
}

export function computeScaleReadiness(venture: VentureRecord): number {
  let score = 0;

  switch (venture.status) {
    case MISSION_STATUSES.PROFITABLE:
      score += 40;
      break;
    case MISSION_STATUSES.GROWING:
      score += 32;
      break;
    case MISSION_STATUSES.LAUNCHING:
      score += 22;
      break;
    case MISSION_STATUSES.BUILDING:
      score += 8;
      break;
    default:
      score += 4;
  }

  if (venture.storeId != null) score += 20;
  if (venture.launchDays != null && venture.launchDays <= 21) score += 15;
  if (venture.atlasAction === "scale") score += 25;

  return clamp(score);
}

export function computeCapitalSupport(capitalAllocationScore: number): number {
  return clamp(capitalAllocationScore);
}

export function computeScalingRiskAdjustment(venture: VentureRecord): number {
  let score = 75;
  if (venture.flagged) score -= 30;
  if (venture.status === MISSION_STATUSES.KILLED) score -= 60;
  if (venture.atlasAction === "kill") score -= 40;
  if (venture.profitabilityClass === "profitable") score += 15;
  if (venture.traffic.orders > 0) score += 10;
  return clamp(score);
}

export function computeScalingComponents(
  input: VentureScalingInput
): ScalingScoreComponents {
  const { venture, capitalAllocationScore } = input;
  return {
    growthMomentum: computeGrowthMomentum(venture),
    revenueVelocity: computeRevenueVelocity(venture),
    conversionPerformance: computeConversionPerformance(venture),
    scaleReadiness: computeScaleReadiness(venture),
    capitalSupport: computeCapitalSupport(capitalAllocationScore),
    riskAdjustment: computeScalingRiskAdjustment(venture),
  };
}

export function computeScalingScore(components: ScalingScoreComponents): number {
  const raw =
    components.growthMomentum * WEIGHTS.growthMomentum +
    components.revenueVelocity * WEIGHTS.revenueVelocity +
    components.conversionPerformance * WEIGHTS.conversionPerformance +
    components.scaleReadiness * WEIGHTS.scaleReadiness +
    components.capitalSupport * WEIGHTS.capitalSupport +
    components.riskAdjustment * WEIGHTS.riskAdjustment;

  return clamp(raw);
}

export type ScalingStage =
  | "pre_scale"
  | "scale_ready"
  | "scaling"
  | "optimized"
  | "paused";

export function deriveScalingStage(
  score: number,
  status: string
): ScalingStage {
  if (status === MISSION_STATUSES.KILLED) return "paused";
  if (score >= 85) return "scaling";
  if (score >= 70) return "scale_ready";
  if (score >= 50) return "optimized";
  if (score >= 30) return "pre_scale";
  return "paused";
}

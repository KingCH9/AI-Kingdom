import { MISSION_STATUSES } from "../constants";
import type { VentureRecord } from "../revenue/venture-metrics";

export type AllocationScoreComponents = {
  revenuePerformance: number;
  roiPerformance: number;
  growthScore: number;
  empirePriority: number;
  missionExecution: number;
  riskAdjustment: number;
};

export type VentureAllocationInput = {
  venture: VentureRecord;
  empirePriorityScore: number;
};

const WEIGHTS = {
  revenuePerformance: 0.25,
  roiPerformance: 0.25,
  growthScore: 0.2,
  empirePriority: 0.1,
  missionExecution: 0.1,
  riskAdjustment: 0.1,
} as const;

function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}

/** Revenue performance 0–100 from absolute and monthly revenue. */
export function computeRevenuePerformance(venture: VentureRecord): number {
  const monthly = venture.revenueMonthlyGbp;
  const total = venture.revenueGbp;
  const velocity = monthly > 0 ? monthly : total;
  return clampScore(Math.min(velocity / 2, 100));
}

/** ROI performance 0–100 — null ROI treated as neutral 30. */
export function computeRoiPerformance(venture: VentureRecord): number {
  if (venture.roi == null) {
    return venture.revenueGbp > 0 ? 45 : 20;
  }
  if (venture.roi < 0) {
    return clampScore(Math.max(0, 30 + venture.roi));
  }
  return clampScore(Math.min(venture.roi, 100));
}

/** Mission execution 0–100 from build/launch progress and status. */
export function computeMissionExecution(venture: VentureRecord): number {
  let score = 0;
  if (venture.storeId != null) score += 25;
  if (venture.buildDays != null && venture.buildDays <= 14) score += 20;
  if (venture.launchDays != null && venture.launchDays <= 30) score += 20;

  switch (venture.status) {
    case MISSION_STATUSES.PROFITABLE:
      score += 35;
      break;
    case MISSION_STATUSES.GROWING:
      score += 28;
      break;
    case MISSION_STATUSES.LAUNCHING:
      score += 20;
      break;
    case MISSION_STATUSES.BUILDING:
      score += 12;
      break;
    default:
      score += 5;
  }

  return clampScore(score);
}

/** Risk adjustment 0–100 — higher is safer (lower risk). */
export function computeRiskAdjustment(venture: VentureRecord): number {
  let score = 70;

  if (venture.flagged) score -= 35;
  if (venture.status === MISSION_STATUSES.KILLED) score -= 50;
  if (venture.profitabilityClass === "unprofitable") score -= 25;
  if (venture.costGbp > venture.revenueGbp && venture.costGbp > 0) score -= 15;
  if (venture.atlasAction === "scale") score += 15;
  if (venture.profitabilityClass === "profitable") score += 10;

  return clampScore(score);
}

export function computeAllocationComponents(
  input: VentureAllocationInput
): AllocationScoreComponents {
  const { venture, empirePriorityScore } = input;

  return {
    revenuePerformance: computeRevenuePerformance(venture),
    roiPerformance: computeRoiPerformance(venture),
    growthScore: venture.growthScore,
    empirePriority: clampScore(empirePriorityScore),
    missionExecution: computeMissionExecution(venture),
    riskAdjustment: computeRiskAdjustment(venture),
  };
}

/** Capital Allocation Score 0–100 — weighted composite. */
export function computeAllocationScore(
  components: AllocationScoreComponents
): number {
  const raw =
    components.revenuePerformance * WEIGHTS.revenuePerformance +
    components.roiPerformance * WEIGHTS.roiPerformance +
    components.growthScore * WEIGHTS.growthScore +
    components.empirePriority * WEIGHTS.empirePriority +
    components.missionExecution * WEIGHTS.missionExecution +
    components.riskAdjustment * WEIGHTS.riskAdjustment;

  return clampScore(raw);
}

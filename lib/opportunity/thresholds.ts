/**
 * Single source of truth for opportunity scoring and status thresholds.
 * Do not duplicate these values elsewhere in the codebase.
 */
export const OPPORTUNITY_THRESHOLDS = {
  /** Minimum score to reach validated status. */
  VALIDATED_MIN_SCORE: 70,

  /** Minimum score required (with other gates) for launch_ready. */
  LAUNCH_READY_MIN_SCORE: 80,

  /** Maximum risk rating allowed for launch_ready. */
  LAUNCH_READY_MAX_RISK: 4,

  /** Maximum competition allowed for launch_ready. */
  LAUNCH_READY_MAX_COMPETITION: 40,

  /** Minimum profit margin % allowed for launch_ready. */
  LAUNCH_READY_MIN_PROFIT_MARGIN: 65,
} as const;

/** Weights used in the composite opportunityScore formula. */
export const OPPORTUNITY_SCORE_WEIGHTS = {
  DEMAND: 0.35,
  LOW_COMPETITION: 0.3,
  PROFIT_MARGIN: 0.2,
  LOW_RISK: 1.5,
} as const;

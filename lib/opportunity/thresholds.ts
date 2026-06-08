/**
 * Single source of truth for opportunity scoring and status thresholds.
 * Do not duplicate these values elsewhere in the codebase.
 */
export const OPPORTUNITY_THRESHOLDS = {
  /** Minimum score to reach validated status. */
  VALIDATED_MIN_SCORE: 70,

  /** Minimum score required (with other gates) for launch_ready. */
  LAUNCH_READY_MIN_SCORE: 79,

  /** Maximum risk rating allowed for launch_ready. */
  LAUNCH_READY_MAX_RISK: 4,

  /** Maximum competition allowed for launch_ready. */
  LAUNCH_READY_MAX_COMPETITION: 40,

  /** Minimum profit margin % allowed for launch_ready. */
  LAUNCH_READY_MIN_PROFIT_MARGIN: 65,
} as const;

/** Weights used in the composite opportunityScore formula. */
export const OPPORTUNITY_SCORE_WEIGHTS = {
  DEMAND: 0.38,
  LOW_COMPETITION: 0.32,
  PROFIT_MARGIN: 0.2,
  LOW_RISK: 1.55,
} as const;

/** Phase D2 — structured demand signal weights (must sum to 1). */
export const DEMAND_SIGNAL_WEIGHTS = {
  TREND_STRENGTH: 0.4,
  SEARCH_GROWTH: 0.3,
  SOURCING_EASE: 0.2,
  DEMAND_SIGNALS_COMPOSITE: 0.1,
} as const;

/** Phase D2 — competition blend between Claude estimate and derived inverse. */
export const COMPETITION_BLEND = {
  CLAUDE: 0.5,
  DERIVED: 0.5,
} as const;

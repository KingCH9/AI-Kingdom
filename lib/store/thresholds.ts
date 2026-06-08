/**
 * Revenue thresholds for automatic store lifecycle promotion.
 * Deterministic — no randomness.
 */
export const STORE_REVENUE_THRESHOLDS = {
  /** Total store revenue to promote launched → scaling. */
  SCALING_MIN_REVENUE: 1_000,

  /** Total store revenue to promote scaling → profitable. */
  PROFITABLE_MIN_REVENUE: 5_000,
} as const;

/**
 * Canonical opportunity lifecycle statuses for AI Empire.
 * All status transitions must go through lib/opportunity/status.ts.
 */
export type OpportunityStatus =
  | "researching"
  | "validated"
  | "launch_ready"
  | "sourcing"
  | "building"
  | "launched"
  | "scaling"
  | "profitable"
  | "killed";

/** Legacy status used by worker.ts and seed data — normalized at read time. */
export type LegacyOpportunityStatus = "approved";

export type AnyOpportunityStatus = OpportunityStatus | LegacyOpportunityStatus;

export interface OpportunityScores {
  demandScore: number;
  competition: number;
  riskRating: number;
  profitMargin: number;
  opportunityScore: number;
}

export interface OpportunityScoreInput {
  demandScore: number;
  competition: number;
  riskRating: number;
  /** Numeric profit margin percentage (0–100). */
  profitMargin: number;
}

/** Raw JSON shape returned by Claude opportunity generation. */
export interface ClaudeOpportunityResponse {
  productName?: string;
  productDescription?: string;
  whyTrending?: string;
  targetCustomer?: string;
  sellingPrice?: string;
  estimatedCostPerUnit?: string;
  profitMargin?: string;
  marketingAngles?: string[];
  tiktokIdeas?: string[];
  facebookAdIdeas?: string[];
  shopifyStoreNames?: string[];
  supplierSearch?: string;
  alibabaKeywords?: string[];
  launchPlan?: string[];
  category?: string;
  nicheDifferentiation?: string;
  demandRationale?: string;
  competitionRationale?: string;
  /** Phase D2 — overall market momentum (0–100). */
  trendStrength?: number;
  /** Phase D2 — search/social demand trajectory (0–100). */
  searchGrowth?: number;
  /** Phase D2 — supplier availability / ease (0–100). */
  sourcingEase?: number;
  /** Phase D2 — composite of ancillary demand signals (0–100). */
  demandSignalsComposite?: number;
  /** Phase D2 — Claude competition estimate (0–100, higher = more competitive). */
  competitionEstimate?: number;
  /** @deprecated Legacy nested signals — top-level fields preferred. */
  demandSignals?: {
    searchGrowth?: number;
    sourcingEase?: number;
    otherFactors?: Record<string, number>;
  };
  riskRating?: number;
  /** Claude self-reported score — cross-check/log only after Phase D2. */
  opportunityScore?: number;
}

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
  riskRating?: number;
  opportunityScore?: number;
}

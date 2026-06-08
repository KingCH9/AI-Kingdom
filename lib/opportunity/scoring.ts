import type { OpportunityScoreInput, OpportunityScores } from "@/lib/types";
import { OPPORTUNITY_SCORE_WEIGHTS } from "./thresholds";

/**
 * Computes the composite opportunity score (0–100) from input metrics.
 * This is the only place the scoring formula should live.
 */
export function computeOpportunityScore(input: OpportunityScoreInput): number {
  const { demandScore, competition, riskRating, profitMargin } = input;

  const raw =
    demandScore * OPPORTUNITY_SCORE_WEIGHTS.DEMAND +
    (100 - competition) * OPPORTUNITY_SCORE_WEIGHTS.LOW_COMPETITION +
    profitMargin * OPPORTUNITY_SCORE_WEIGHTS.PROFIT_MARGIN +
    (10 - riskRating) * OPPORTUNITY_SCORE_WEIGHTS.LOW_RISK;

  return Math.max(0, Math.min(100, Math.floor(raw)));
}

/** Builds a full scores object including the composite opportunityScore. */
export function buildOpportunityScores(
  input: OpportunityScoreInput
): OpportunityScores {
  return {
    ...input,
    opportunityScore: computeOpportunityScore(input),
  };
}

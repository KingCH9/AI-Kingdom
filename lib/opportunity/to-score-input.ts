import type { Opportunity } from "@prisma/client";
import type { OpportunityScoreInput } from "@/lib/types";
import { parseProfitMargin } from "./parse-margin";

/** Builds score input from a persisted opportunity record. */
export function opportunityToScoreInput(
  opportunity: Opportunity
): OpportunityScoreInput {
  return {
    demandScore: opportunity.demandScore ?? 0,
    competition: opportunity.competition ?? 0,
    riskRating: opportunity.riskRating ?? 10,
    profitMargin: parseProfitMargin(opportunity.profitMargin),
  };
}

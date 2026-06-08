import type { Opportunity } from "@prisma/client";
import { meetsValidatedCriteria } from "./status";
import { opportunityToScoreInput } from "./to-score-input";
import { updateOpportunityStatus } from "./update-status";

export type ValidationDecision = "approve" | "reject";

export type ValidateOpportunityInput = {
  opportunityId: number;
  decision: ValidationDecision;
};

export type ValidateOpportunityResult =
  | { success: true; opportunity: Opportunity; decision: ValidationDecision }
  | { success: false; message: string };

/**
 * Deterministic validation recommendation from existing score data.
 * Approve when opportunityScore gates pass (>= 70).
 */
export function evaluateValidationDecision(
  opportunity: Opportunity
): ValidationDecision {
  const input = opportunityToScoreInput(opportunity);
  return meetsValidatedCriteria(input) ? "approve" : "reject";
}

/**
 * Single entry point for Atlas (Validator) decisions.
 * researching → validated (approve) or researching → killed (reject).
 */
export async function validateOpportunity(
  input: ValidateOpportunityInput
): Promise<ValidateOpportunityResult> {
  const newStatus = input.decision === "approve" ? "validated" : "killed";

  const result = await updateOpportunityStatus({
    opportunityId: input.opportunityId,
    newStatus,
    actor: "validator",
  });

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    opportunity: result.opportunity,
    decision: input.decision,
  };
}

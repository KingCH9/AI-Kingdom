import type { Opportunity } from "@prisma/client";
import { meetsLaunchReadyCriteria } from "./status";
import { opportunityToScoreInput } from "./to-score-input";
import { updateOpportunityStatus } from "./update-status";

export type CeoDecision = "approve" | "reject";

export type ProcessCeoDecisionInput = {
  opportunityId: number;
  decision: CeoDecision;
};

export type ProcessCeoDecisionResult =
  | { success: true; opportunity: Opportunity; decision: CeoDecision }
  | { success: false; message: string };

/**
 * Deterministic CEO recommendation from existing score data.
 * Approve when launch_ready gates pass (score, risk, competition, margin).
 */
export function evaluateCeoDecision(opportunity: Opportunity): CeoDecision {
  const input = opportunityToScoreInput(opportunity);
  return meetsLaunchReadyCriteria(input) ? "approve" : "reject";
}

/**
 * Single entry point for Alpha (CEO) decisions.
 * validated → launch_ready (approve) or validated → killed (reject).
 */
export async function processCeoDecision(
  input: ProcessCeoDecisionInput
): Promise<ProcessCeoDecisionResult> {
  const newStatus = input.decision === "approve" ? "launch_ready" : "killed";

  const result = await updateOpportunityStatus({
    opportunityId: input.opportunityId,
    newStatus,
    actor: "ceo",
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

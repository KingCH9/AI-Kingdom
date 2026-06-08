import type { Opportunity } from "@prisma/client";
import { meetsLaunchReadyCriteria, meetsValidatedCriteria } from "./status";
import { opportunityToScoreInput } from "./to-score-input";
import { updateOpportunityStatus } from "./update-status";

export type CeoDecision = "approve" | "reject" | "hold";

export type ProcessCeoDecisionInput = {
  opportunityId: number;
  decision: Exclude<CeoDecision, "hold">;
};

export type ProcessCeoDecisionResult =
  | { success: true; opportunity: Opportunity; decision: Exclude<CeoDecision, "hold"> }
  | { success: false; message: string };

/**
 * Deterministic CEO recommendation from existing score data.
 * - approve → launch_ready when all launch gates pass
 * - reject → killed only when below validated threshold (Atlas should not have passed)
 * - hold → remain in validated queue for manual CEO review
 */
export function evaluateCeoDecision(opportunity: Opportunity): CeoDecision {
  const input = opportunityToScoreInput(opportunity);

  if (meetsLaunchReadyCriteria(input)) {
    return "approve";
  }

  if (!meetsValidatedCriteria(input)) {
    return "reject";
  }

  return "hold";
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

import { prisma } from "@/lib/prisma";
import { normalizeOpportunityStatus } from "./status";
import {
  evaluateValidationDecision,
  validateOpportunity,
} from "./validate-opportunity";

export type ValidatorCycleResult = {
  processed: number;
  approved: number;
  rejected: number;
  failed: number;
  results: Array<{
    opportunityId: number;
    decision: "approve" | "reject";
    success: boolean;
    message?: string;
  }>;
  startedAt: Date;
  finishedAt: Date;
};

export type ValidatorCycleOptions = {
  limit?: number;
};

/**
 * Runs Atlas validation on researching opportunities.
 * Deterministic — uses meetsValidatedCriteria on existing score data.
 */
export async function runValidatorCycle(
  options: ValidatorCycleOptions = {}
): Promise<ValidatorCycleResult> {
  const startedAt = new Date();
  const limit = options.limit ?? 10;

  const researching = await prisma.opportunity.findMany({
    where: { status: "researching" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const results: ValidatorCycleResult["results"] = [];
  let approved = 0;
  let rejected = 0;
  let failed = 0;

  for (const opportunity of researching) {
    if (normalizeOpportunityStatus(opportunity.status) !== "researching") {
      continue;
    }

    const decision = evaluateValidationDecision(opportunity);
    const outcome = await validateOpportunity({
      opportunityId: opportunity.id,
      decision,
    });

    if (outcome.success) {
      if (decision === "approve") {
        approved += 1;
      } else {
        rejected += 1;
      }

      results.push({
        opportunityId: opportunity.id,
        decision,
        success: true,
      });
    } else {
      failed += 1;
      results.push({
        opportunityId: opportunity.id,
        decision,
        success: false,
        message: outcome.message,
      });
    }
  }

  return {
    processed: results.length,
    approved,
    rejected,
    failed,
    results,
    startedAt,
    finishedAt: new Date(),
  };
}

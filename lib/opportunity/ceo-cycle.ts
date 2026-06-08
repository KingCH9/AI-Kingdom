import { prisma } from "@/lib/prisma";
import { normalizeOpportunityStatus } from "./status";
import {
  evaluateCeoDecision,
  processCeoDecision,
  type CeoDecision,
} from "./evaluate-ceo-decision";

export type CeoCycleResult = {
  processed: number;
  approved: number;
  rejected: number;
  held: number;
  failed: number;
  results: Array<{
    opportunityId: number;
    decision: CeoDecision;
    success: boolean;
    message?: string;
  }>;
  startedAt: Date;
  finishedAt: Date;
};

export type CeoCycleOptions = {
  limit?: number;
};

/**
 * Runs Alpha (CEO) approval on validated opportunities.
 * Deterministic — uses meetsLaunchReadyCriteria on existing score data.
 */
export async function runCeoCycle(
  options: CeoCycleOptions = {}
): Promise<CeoCycleResult> {
  const startedAt = new Date();
  const limit = options.limit ?? 10;

  const validated = await prisma.opportunity.findMany({
    where: { status: "validated" },
    orderBy: { opportunityScore: "desc" },
    take: limit,
  });

  console.log(
    `[pipeline:ceo] cycle start — ${validated.length} validated opportunity(ies) in batch`
  );

  const results: CeoCycleResult["results"] = [];
  let approved = 0;
  let rejected = 0;
  let held = 0;
  let failed = 0;

  for (const opportunity of validated) {
    if (normalizeOpportunityStatus(opportunity.status) !== "validated") {
      continue;
    }

    const decision = evaluateCeoDecision(opportunity);
    console.log(
      `[pipeline:ceo] opportunity #${opportunity.id} "${opportunity.productName}" ` +
        `score=${opportunity.opportunityScore ?? "n/a"} decision=${decision}`
    );

    if (decision === "hold") {
      held += 1;
      results.push({
        opportunityId: opportunity.id,
        decision,
        success: true,
      });
      continue;
    }

    const outcome = await processCeoDecision({
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
      console.warn(
        `[pipeline:ceo] opportunity #${opportunity.id} failed: ${outcome.message}`
      );
      results.push({
        opportunityId: opportunity.id,
        decision,
        success: false,
        message: outcome.message,
      });
    }
  }

  console.log(
    `[pipeline:ceo] cycle done — processed=${results.length} approved=${approved} ` +
      `held=${held} rejected=${rejected} failed=${failed}`
  );

  return {
    processed: results.length,
    approved,
    rejected,
    held,
    failed,
    results,
    startedAt,
    finishedAt: new Date(),
  };
}

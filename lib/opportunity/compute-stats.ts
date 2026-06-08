import type { Opportunity } from "@prisma/client";
import { normalizeOpportunityStatus } from "./status";

export interface OpportunityDashboardStats {
  total: number;
  launchReady: number;
  validated: number;
  averageScore: number;
  highestScore: number;
}

/** Computes aggregate stats for the opportunities dashboard. */
export function computeOpportunityStats(
  opportunities: Opportunity[]
): OpportunityDashboardStats {
  const scores = opportunities
    .map((item) => item.opportunityScore)
    .filter((score): score is number => score != null);

  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;

  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  return {
    total: opportunities.length,
    launchReady: opportunities.filter(
      (item) => normalizeOpportunityStatus(item.status) === "launch_ready"
    ).length,
    validated: opportunities.filter(
      (item) => normalizeOpportunityStatus(item.status) === "validated"
    ).length,
    averageScore,
    highestScore,
  };
}

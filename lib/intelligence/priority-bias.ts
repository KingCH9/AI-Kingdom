import type { Opportunity } from "@prisma/client";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import type { EmpirePerformanceAnalysis } from "@/lib/intelligence/types";

function resolveOpportunityCategory(opportunity: Opportunity): string {
  return opportunity.category?.trim() || "Uncategorized";
}

/** Boosts opportunity priority based on empire intelligence outcomes. */
export function scoreOpportunityWithIntelligence(
  opportunity: Opportunity,
  analysis: EmpirePerformanceAnalysis
): number {
  const baseScore = opportunity.opportunityScore ?? 0;
  let bias = 0;

  const category = resolveOpportunityCategory(opportunity);
  const categoryMetric = analysis.strongestCategories.find(
    (item) => item.label.toLowerCase() === category.toLowerCase()
  );

  if (categoryMetric && categoryMetric.profitabilityRate > 0) {
    bias += Math.min(categoryMetric.profitabilityRate / 10, 10);
  }

  const weakCategory = analysis.weakestCategories.find(
    (item) =>
      item.label.toLowerCase() === category.toLowerCase() && item.killedCount >= 2
  );

  if (weakCategory) {
    bias -= Math.min(weakCategory.killedCount * 2, 10);
  }

  const score = opportunity.opportunityScore ?? 0;
  const scoreBand = analysis.strongestScores.find((band) => {
    if (band.minScore === 0) {
      return score < 70;
    }
    const nextMin =
      analysis.strongestScores.find((item) => item.minScore > band.minScore)
        ?.minScore ?? 101;
    return score >= band.minScore && score < nextMin;
  });

  if (scoreBand && scoreBand.profitabilityRate > 0) {
    bias += Math.min(scoreBand.profitabilityRate / 15, 5);
  }

  return baseScore + bias;
}

/** Sorts validated opportunities by intelligence-weighted priority. */
export function sortOpportunitiesByIntelligence(
  opportunities: Opportunity[],
  analysis: EmpirePerformanceAnalysis
): Opportunity[] {
  return [...opportunities]
    .filter(
      (item) => normalizeOpportunityStatus(item.status) === "validated"
    )
    .sort(
      (a, b) =>
        scoreOpportunityWithIntelligence(b, analysis) -
        scoreOpportunityWithIntelligence(a, analysis)
    );
}

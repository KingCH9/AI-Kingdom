import { MISSION_STATUSES } from "../constants";
import type { AllocationScoreComponents } from "./allocation-model";
import { computeAllocationScore } from "./allocation-model";

export type AtlasCapitalRecommendation =
  | "fund_aggressively"
  | "fund"
  | "maintain"
  | "review"
  | "avoid";

export type VentureFundingRecommendation = {
  missionId: number;
  title: string;
  status: string;
  allocationScore: number;
  recommendation: AtlasCapitalRecommendation;
  components: AllocationScoreComponents;
  revenueGbp: number;
  roi: number | null;
  growthScore: number;
  rationale: string;
};

export function deriveAtlasRecommendation(
  allocationScore: number,
  status: string
): AtlasCapitalRecommendation {
  if (status === MISSION_STATUSES.KILLED) return "avoid";
  if (allocationScore >= 90) return "fund_aggressively";
  if (allocationScore >= 75) return "fund";
  if (allocationScore >= 50) return "maintain";
  if (allocationScore >= 25) return "review";
  return "avoid";
}

function buildRationale(
  recommendation: AtlasCapitalRecommendation,
  allocationScore: number
): string {
  switch (recommendation) {
    case "fund_aggressively":
      return `Score ${allocationScore}/100 — top-tier performer; Atlas recommends aggressive capital allocation.`;
    case "fund":
      return `Score ${allocationScore}/100 — strong metrics; additional capital warranted.`;
    case "maintain":
      return `Score ${allocationScore}/100 — hold current allocation; monitor performance.`;
    case "review":
      return `Score ${allocationScore}/100 — mixed signals; manual Atlas/Mercury review advised.`;
    case "avoid":
      return `Score ${allocationScore}/100 — poor risk/reward; avoid new capital.`;
  }
}

export function buildFundingRecommendation(input: {
  missionId: number;
  title: string;
  status: string;
  revenueGbp: number;
  roi: number | null;
  growthScore: number;
  components: AllocationScoreComponents;
}): VentureFundingRecommendation {
  const allocationScore = computeAllocationScore(input.components);
  const recommendation = deriveAtlasRecommendation(
    allocationScore,
    input.status
  );

  return {
    missionId: input.missionId,
    title: input.title,
    status: input.status,
    allocationScore,
    recommendation,
    components: input.components,
    revenueGbp: input.revenueGbp,
    roi: input.roi,
    growthScore: input.growthScore,
    rationale: buildRationale(recommendation, allocationScore),
  };
}

export function countRecommendationsByCategory(
  recommendations: VentureFundingRecommendation[]
): Record<AtlasCapitalRecommendation, number> {
  return recommendations.reduce(
    (acc, rec) => {
      acc[rec.recommendation] += 1;
      return acc;
    },
    {
      fund_aggressively: 0,
      fund: 0,
      maintain: 0,
      review: 0,
      avoid: 0,
    }
  );
}

export function rankByAllocationScore(
  recommendations: VentureFundingRecommendation[]
): VentureFundingRecommendation[] {
  return [...recommendations].sort(
    (a, b) =>
      b.allocationScore - a.allocationScore ||
      b.revenueGbp - a.revenueGbp
  );
}

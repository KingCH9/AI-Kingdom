import { MISSION_STATUSES } from "../constants";
import type { VentureFundingRecommendation } from "./funding-recommendations";

export type PortfolioOptimizationCategory = {
  category: string;
  description: string;
  ventures: VentureFundingRecommendation[];
};

export type PortfolioOptimization = {
  topOpportunities: VentureFundingRecommendation[];
  underfundedWinners: VentureFundingRecommendation[];
  overfundedRisks: VentureFundingRecommendation[];
  highestRoiVentures: VentureFundingRecommendation[];
  highestGrowthVentures: VentureFundingRecommendation[];
};

function topN(
  items: VentureFundingRecommendation[],
  n = 5
): VentureFundingRecommendation[] {
  return items.slice(0, n);
}

/** Portfolio optimization buckets — advisory only, top 5 each. */
export function buildPortfolioOptimization(
  recommendations: VentureFundingRecommendation[]
): PortfolioOptimization {
  const active = recommendations.filter(
    (r) => r.status !== MISSION_STATUSES.KILLED
  );

  const topOpportunities = topN(
    [...active]
      .filter(
        (r) =>
          r.recommendation === "fund_aggressively" ||
          r.recommendation === "fund"
      )
      .sort((a, b) => b.allocationScore - a.allocationScore)
  );

  const underfundedWinners = topN(
    [...active]
      .filter(
        (r) =>
          (r.recommendation === "fund" ||
            r.recommendation === "fund_aggressively") &&
          r.revenueGbp > 0 &&
          r.allocationScore >= 70
      )
      .sort((a, b) => b.growthScore - a.growthScore || b.allocationScore - a.allocationScore)
  );

  const overfundedRisks = topN(
    [...active]
      .filter(
        (r) =>
          r.recommendation === "avoid" ||
          r.recommendation === "review" ||
          (r.roi != null && r.roi < 0)
      )
      .sort((a, b) => a.allocationScore - b.allocationScore)
  );

  const highestRoiVentures = topN(
    [...active]
      .filter((r) => r.roi != null)
      .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
  );

  const highestGrowthVentures = topN(
    [...active].sort((a, b) => b.growthScore - a.growthScore)
  );

  return {
    topOpportunities,
    underfundedWinners,
    overfundedRisks,
    highestRoiVentures,
    highestGrowthVentures,
  };
}

export function portfolioOptimizationCategories(
  optimization: PortfolioOptimization
): PortfolioOptimizationCategory[] {
  return [
    {
      category: "Top Opportunities",
      description: "Highest allocation scores with fund recommendations",
      ventures: optimization.topOpportunities,
    },
    {
      category: "Underfunded Winners",
      description: "Revenue-positive ventures deserving more capital",
      ventures: optimization.underfundedWinners,
    },
    {
      category: "Overfunded Risks",
      description: "Ventures where capital exposure should be reduced",
      ventures: optimization.overfundedRisks,
    },
    {
      category: "Highest ROI Ventures",
      description: "Best return on invested capital",
      ventures: optimization.highestRoiVentures,
    },
    {
      category: "Highest Growth Ventures",
      description: "Strongest growth momentum signals",
      ventures: optimization.highestGrowthVentures,
    },
  ];
}

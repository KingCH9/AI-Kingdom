import { getRaeSnapshot } from "../revenue/rae-dashboard";
import { getEmpireScoreV2Summary } from "../empire/score-v2-dashboard";
import { computeAverageRoi } from "../mercury/roi-analysis";
import { computePortfolioHealth } from "../mercury/portfolio-health";
import { runCapitalEngine } from "./capital-engine";
import {
  countRecommendationsByCategory,
  rankByAllocationScore,
  type VentureFundingRecommendation,
} from "./funding-recommendations";
import {
  buildPortfolioOptimization,
  portfolioOptimizationCategories,
} from "./portfolio-optimizer";
import type {
  DepartmentCapitalAllocation,
  FundingSimulation,
} from "./capital-engine";
import type { PortfolioOptimization } from "./portfolio-optimizer";

export type CaeSnapshot = {
  generatedAt: string;
  periodMonth: string;
  summary: {
    totalVentures: number;
    activeVentures: number;
    totalRevenueGbp: number;
    averageRoi: number | null;
    portfolioCapitalScore: number;
    portfolioHealthScore: number;
    fundAggressivelyCount: number;
    fundCount: number;
    maintainCount: number;
    reviewCount: number;
    avoidCount: number;
    topRecommendation: VentureFundingRecommendation | null;
    topVenture: VentureFundingRecommendation | null;
  };
  recommendations: VentureFundingRecommendation[];
  portfolioOptimization: PortfolioOptimization;
  departmentAllocations: DepartmentCapitalAllocation[];
  fundingSimulations: FundingSimulation[];
};

function periodMonthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Full CAE snapshot — read-only, advisory only. */
export async function getCaeSnapshot(): Promise<CaeSnapshot> {
  const [rae, empireV2] = await Promise.all([
    getRaeSnapshot(),
    getEmpireScoreV2Summary(),
  ]);

  const profitability = rae.ventures.map((v) => ({
    missionId: v.missionId,
    title: v.title,
    status: v.status,
    storeId: v.storeId,
    ventureTypeKey: v.ventureTypeKey,
    revenueGbp: v.revenueGbp,
    costGbp: v.costGbp,
    netProfitGbp: v.netProfitGbp,
    roi: v.roi,
    revenueMultiple: v.revenueMultiple,
    capitalEfficiency: v.capitalEfficiency,
    profitabilityClass: v.profitabilityClass,
  }));

  const portfolioHealth = computePortfolioHealth(profitability);
  const engine = runCapitalEngine({
    ventures: rae.ventures,
    empireScoreV2: empireV2.empireScoreV2,
  });

  const counts = countRecommendationsByCategory(engine.recommendations);
  const ranked = rankByAllocationScore(engine.recommendations);
  const active = rae.ventures.filter((v) => v.status !== "killed");

  return {
    generatedAt: new Date().toISOString(),
    periodMonth: rae.periodMonth,
    summary: {
      totalVentures: rae.ventures.length,
      activeVentures: active.length,
      totalRevenueGbp: rae.summary.totalRevenueGbp,
      averageRoi: computeAverageRoi(profitability),
      portfolioCapitalScore: engine.portfolioCapitalScore,
      portfolioHealthScore: portfolioHealth.portfolioHealthScore,
      fundAggressivelyCount: counts.fund_aggressively,
      fundCount: counts.fund,
      maintainCount: counts.maintain,
      reviewCount: counts.review,
      avoidCount: counts.avoid,
      topRecommendation: ranked[0] ?? null,
      topVenture:
        ranked.find((r) => r.revenueGbp > 0) ?? ranked[0] ?? null,
    },
    recommendations: engine.recommendations,
    portfolioOptimization: engine.portfolioOptimization,
    departmentAllocations: engine.departmentAllocations,
    fundingSimulations: engine.fundingSimulations,
  };
}

/** Compact summary for HQ widget integration. */
export async function getCaeSummary() {
  const snapshot = await getCaeSnapshot();
  return {
    periodMonth: snapshot.periodMonth,
    portfolioCapitalScore: snapshot.summary.portfolioCapitalScore,
    fundAggressivelyCount: snapshot.summary.fundAggressivelyCount,
    fundCount: snapshot.summary.fundCount,
    topRecommendation: snapshot.summary.topRecommendation
      ? {
          missionId: snapshot.summary.topRecommendation.missionId,
          title: snapshot.summary.topRecommendation.title,
          allocationScore: snapshot.summary.topRecommendation.allocationScore,
          recommendation: snapshot.summary.topRecommendation.recommendation,
        }
      : null,
    topVenture: snapshot.summary.topVenture
      ? {
          missionId: snapshot.summary.topVenture.missionId,
          title: snapshot.summary.topVenture.title,
          recommendedAllocation:
            snapshot.fundingSimulations.find((s) => s.budget === 1000)
              ?.allocations[0]?.amount ?? 0,
        }
      : null,
  };
}

/** API payload for GET /api/hq/capital */
export async function getCaePayload() {
  const snapshot = await getCaeSnapshot();
  return {
    summary: snapshot.summary,
    recommendations: snapshot.recommendations,
    portfolioOptimization: portfolioOptimizationCategories(
      snapshot.portfolioOptimization
    ),
    departmentAllocations: snapshot.departmentAllocations,
    fundingSimulations: snapshot.fundingSimulations,
    generatedAt: snapshot.generatedAt,
  };
}

export { portfolioOptimizationCategories, buildPortfolioOptimization };

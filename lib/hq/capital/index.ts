export {
  computeAllocationScore,
  computeRevenuePerformance,
  computeRoiPerformance,
  computeMissionExecution,
  computeRiskAdjustment,
  computeAllocationComponents,
  type AllocationScoreComponents,
  type VentureAllocationInput,
} from "./allocation-model";

export {
  deriveAtlasRecommendation,
  buildFundingRecommendation,
  countRecommendationsByCategory,
  rankByAllocationScore,
  type AtlasCapitalRecommendation,
  type VentureFundingRecommendation,
} from "./funding-recommendations";

export {
  buildPortfolioOptimization,
  portfolioOptimizationCategories,
  type PortfolioOptimization,
  type PortfolioOptimizationCategory,
} from "./portfolio-optimizer";

export {
  runCapitalEngine,
  buildVentureRecommendations,
  simulateFundingAllocation,
  buildFundingSimulations,
  buildDepartmentCapitalAllocations,
  computePortfolioCapitalScore,
  type FundingSimulation,
  type FundingSimulationAllocation,
  type DepartmentCapitalAllocation,
  type EngineDepartmentKey,
} from "./capital-engine";

export {
  getCaeSnapshot,
  getCaeSummary,
  getCaePayload,
  type CaeSnapshot,
} from "./capital-dashboard";

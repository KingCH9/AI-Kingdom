export {
  computeScalingScore,
  computeScalingComponents,
  computeGrowthMomentum,
  computeRevenueVelocity,
  computeConversionPerformance,
  computeScaleReadiness,
  computeCapitalSupport,
  computeScalingRiskAdjustment,
  deriveScalingStage,
  type ScalingScoreComponents,
  type VentureScalingInput,
  type ScalingStage,
} from "./scaling-model";

export {
  deriveScalingRecommendation,
  buildScalingRecommendation,
  countScalingByAction,
  rankByScalingScore,
  type NovaScalingAction,
  type VentureScalingRecommendation,
} from "./scaling-recommendations";

export {
  deriveGrowthLevers,
  buildVentureGrowthLevers,
  buildGrowthLeversForRecommendations,
  buildScalingPriorityQueue,
  type GrowthLever,
  type GrowthLeverInsight,
  type VentureGrowthLevers,
  type ScalingPriorityQueue,
} from "./growth-levers";

export {
  runScalingEngine,
  buildVentureScalingRecommendations,
  computePortfolioScalingScore,
  buildScalingEngineInsights,
  type ScalingEngineInsight,
} from "./scaling-engine";

export {
  getVseSnapshot,
  getVseSummary,
  getVsePayload,
  type VseSnapshot,
} from "./scaling-dashboard";

export {
  getPhasesForTemplate,
  defaultMissionTitleForTemplate,
  TEMPLATE_PHASES,
  type TemplatePhaseSeed,
} from "./template-phases";

export {
  NOVA_GROWTH_STATUSES,
  NOVA_GROWTH_PHASES,
  NOVA_GROWTH_AGENTS,
  isNovaGrowthPhase,
  isNovaGrowthTask,
  isNovaGrowthMission,
  isContentMission,
  resolvePrimaryGrowthAgent,
  computeNovaAgentMetrics,
  computePortfolioGrowthStats,
  resolveMissionVentureTypeKey,
  type NovaGrowthAgent,
  type NovaRawTask,
  type NovaRawMission,
  type NovaAgentMetrics,
} from "./growth-engine";

export {
  computeNovaXp,
  computeNovaLevel,
  computeGrowthScore,
  NOVA_LEVEL_THRESHOLDS,
  type NovaXpBreakdown,
  type NovaLevelInfo,
} from "./agent-xp";

export {
  analyzeCampaignPerformance,
  type CampaignPerformance,
} from "./campaign-analysis";

export {
  getNovaGrowthSnapshot,
  getNovaGrowthSummary,
  type NovaAgentRecord,
  type NovaGrowthSnapshot,
} from "./growth-dashboard";

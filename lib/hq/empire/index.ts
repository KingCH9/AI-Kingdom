export {
  getEmpireScoreSnapshot,
  getAtlasEmpireSummary,
  getAthenaEmpireSummary,
  getForgeEmpireSummary,
  getNovaEmpireSummary,
  getMercuryEmpireSummary,
  getVentureDistribution,
  type EmpireScoreSnapshot,
  type DepartmentScore,
} from "./queries";

export {
  COMPONENT_WEIGHTS,
  COMPONENT_LABELS,
  computeComponentScores,
  computeEmpireScoreV2,
  computeDepartmentScoresV2,
  deriveStrengthsAndWeaknesses,
  type ComponentKey,
  type ComponentScores,
  type DepartmentScoreV2,
} from "./score-v2";

export {
  loadEmpireScoreV2Inputs,
  type EmpireScoreV2RawInput,
} from "./score-v2-queries";

export {
  getEmpireScoreV2Snapshot,
  getEmpireScoreV2Summary,
  type EmpireScoreV2Snapshot,
  type EmpireScoreV2AgentRanking,
  type EmpireScoreV2ScoutRanking,
} from "./score-v2-dashboard";

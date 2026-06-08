import { loadEmpireScoreV2Inputs } from "./score-v2-queries";
import {
  COMPONENT_LABELS,
  COMPONENT_WEIGHTS,
  computeComponentScores,
  computeDepartmentScoresV2,
  computeEmpireScoreV2,
  computeVentureDiversificationScore,
  deriveStrengthsAndWeaknesses,
  type ComponentKey,
  type ComponentScores,
  type DepartmentScoreV2,
} from "./score-v2";
import { CORE_VENTURE_TYPES, ACTIVE_VENTURE_STATUSES } from "./score-v2-queries";

export type EmpireScoreV2AgentRanking = {
  agentKey: string;
  department: string;
  xp: number;
  level: number;
  score: number;
  missionsCompleted: number;
  revenueInfluenced: number;
};

export type EmpireScoreV2ScoutRanking = {
  scoutKey: string;
  xp: number;
  level: number;
  score: number;
  missionsCreated: number;
  revenueGenerated: number;
  successRate: number;
};

export type VentureDiversificationDetail = {
  ventureTypeKey: string;
  active: boolean;
  missionCount: number;
};

export type EmpireScoreV2Snapshot = {
  generatedAt: string;
  empireScoreV2: number;
  empireScoreV1: number;
  componentScores: ComponentScores;
  componentWeights: typeof COMPONENT_WEIGHTS;
  departmentScores: DepartmentScoreV2[];
  rankings: {
    topAgents: EmpireScoreV2AgentRanking[];
    topScouts: EmpireScoreV2ScoutRanking[];
    topDepartments: DepartmentScoreV2[];
  };
  portfolioHealth: {
    score: number;
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
  };
  ventureDiversification: {
    score: number;
    activeTypes: number;
    totalTypes: number;
    details: VentureDiversificationDetail[];
  };
  strengths: string[];
  weaknesses: string[];
  summary: {
    empireScoreV2: number;
    empireScoreV1: number;
    topStrength: string | null;
    topWeakness: string | null;
    topAgent: EmpireScoreV2AgentRanking | null;
    topScout: EmpireScoreV2ScoutRanking | null;
    topDepartment: DepartmentScoreV2 | null;
  };
};

function buildVentureDiversificationDetails(
  missions: Awaited<ReturnType<typeof loadEmpireScoreV2Inputs>>["missions"]
): VentureDiversificationDetail[] {
  return CORE_VENTURE_TYPES.map((ventureTypeKey) => {
    const typed = missions.filter(
      (m) =>
        m.ventureTypeKey === ventureTypeKey &&
        ACTIVE_VENTURE_STATUSES.has(m.status)
    );
    return {
      ventureTypeKey,
      active: typed.length > 0,
      missionCount: typed.length,
    };
  });
}

/** Full Empire Score V2 snapshot — read-only analytics. */
export async function getEmpireScoreV2Snapshot(): Promise<EmpireScoreV2Snapshot> {
  const input = await loadEmpireScoreV2Inputs();
  const componentScores = computeComponentScores(input);
  const empireScoreV2 = computeEmpireScoreV2(componentScores);
  const departmentScores = computeDepartmentScoresV2(input, componentScores);
  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(componentScores);

  const topAgents = [...input.agents]
    .sort((a, b) => b.score - a.score || b.xp - a.xp)
    .slice(0, 5)
    .map((a) => ({
      agentKey: a.agentKey,
      department: a.department,
      xp: a.xp,
      level: a.level,
      score: a.score,
      missionsCompleted: a.missionsCompleted,
      revenueInfluenced: a.revenueInfluenced,
    }));

  const topScouts = [...input.scouts]
    .sort((a, b) => b.score - a.score || b.xp - a.xp)
    .slice(0, 5)
    .map((s) => ({
      scoutKey: s.scoutKey,
      xp: s.xp,
      level: s.level,
      score: s.score,
      missionsCreated: s.missionsCreated,
      revenueGenerated: s.revenueGenerated,
      successRate: s.successRate,
    }));

  const diversificationDetails = buildVentureDiversificationDetails(
    input.missions
  );
  const activeTypes = diversificationDetails.filter((d) => d.active).length;

  const summary = {
    empireScoreV2,
    empireScoreV1: input.empireScoreV1,
    topStrength: strengths[0] ?? null,
    topWeakness: weaknesses[0] ?? null,
    topAgent: topAgents[0] ?? null,
    topScout: topScouts[0] ?? null,
    topDepartment: departmentScores[0] ?? null,
  };

  return {
    generatedAt: new Date().toISOString(),
    empireScoreV2,
    empireScoreV1: input.empireScoreV1,
    componentScores,
    componentWeights: COMPONENT_WEIGHTS,
    departmentScores,
    rankings: {
      topAgents,
      topScouts,
      topDepartments: departmentScores.slice(0, 5),
    },
    portfolioHealth: {
      score: componentScores.portfolioHealth,
      totalRevenue: input.totalRevenue,
      totalCosts: input.totalCosts,
      netProfit: input.netProfit,
    },
    ventureDiversification: {
      score: computeVentureDiversificationScore(input.missions),
      activeTypes,
      totalTypes: CORE_VENTURE_TYPES.length,
      details: diversificationDetails,
    },
    strengths,
    weaknesses,
    summary,
  };
}

/** Compact summary for HQ dashboard widget. */
export async function getEmpireScoreV2Summary() {
  const snapshot = await getEmpireScoreV2Snapshot();
  return snapshot.summary;
}

export type { ComponentKey, ComponentScores, DepartmentScoreV2 };

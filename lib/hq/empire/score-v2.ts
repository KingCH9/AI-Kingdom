import {
  ACTIVE_VENTURE_STATUSES,
  averageAgentLevel,
  averageAgentScore,
  averageScoutLevel,
  averageScoutScore,
  agentsByDepartment,
  CORE_VENTURE_TYPES,
  DEPARTMENT_KEYS,
  type EmpireScoreV2RawInput,
} from "./score-v2-queries";
import { MISSION_STATUSES } from "../constants";

export const COMPONENT_WEIGHTS = {
  portfolioHealth: 0.2,
  revenuePerformance: 0.2,
  missionExecution: 0.15,
  atlasPerformance: 0.1,
  athenaPerformance: 0.1,
  forgePerformance: 0.1,
  novaPerformance: 0.05,
  mercuryPerformance: 0.05,
  ventureDiversification: 0.05,
} as const;

export type ComponentKey = keyof typeof COMPONENT_WEIGHTS;

export type ComponentScores = Record<ComponentKey, number>;

export type DepartmentScoreV2 = {
  departmentKey: string;
  departmentName: string;
  score: number;
  agentCount: number;
  averageLevel: number;
  averageXp: number;
  missionsWorked: number;
  missionsCompleted: number;
  revenueInfluenced: number;
};

const DEPARTMENT_NAMES: Record<string, string> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: "CEO Office (Atlas)",
  [DEPARTMENT_KEYS.RESEARCH_LAB]: "Research Lab (Athena)",
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: "Builder Workshop (Forge)",
  [DEPARTMENT_KEYS.GROWTH]: "Growth (Nova)",
  [DEPARTMENT_KEYS.FINANCE]: "Finance (Mercury)",
};

function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100) * 10) / 10;
}

function completionRate(completed: number, worked: number): number {
  if (worked <= 0) return 0;
  return Math.min((completed / worked) * 100, 100);
}

/** Portfolio health 0–100 from mission profitability mix. */
export function computePortfolioHealthScore(
  missions: EmpireScoreV2RawInput["missions"]
): number {
  const withData = missions.filter(
    (m) => m.revenueGbp > 0 || m.costGbp > 0
  );
  if (withData.length === 0) return 0;

  const profitable = withData.filter(
    (m) => m.revenueGbp - m.costGbp > 0
  ).length;
  const totalRevenue = withData.reduce((sum, m) => sum + m.revenueGbp, 0);
  const totalCosts = withData.reduce((sum, m) => sum + m.costGbp, 0);
  const netProfit = totalRevenue - totalCosts;

  const profitRatio = (profitable / withData.length) * 100;
  const marginRatio =
    totalRevenue > 0 ? Math.max((netProfit / totalRevenue) * 100, 0) : 0;

  return clampScore(profitRatio * 0.5 + marginRatio * 0.5);
}

/** Revenue performance 0–100 — tiered on empire revenue. */
export function computeRevenuePerformanceScore(
  totalRevenue: number,
  netProfit: number
): number {
  let score = Math.min(totalRevenue / 5, 70);
  if (netProfit > 0) score += Math.min(netProfit / 10, 30);
  return clampScore(score);
}

/** Mission execution 0–100 from task completion and mission progression. */
export function computeMissionExecutionScore(
  input: EmpireScoreV2RawInput
): number {
  const { taskCounts, missions } = input;
  const totalTasks =
    taskCounts.pending +
    taskCounts.inProgress +
    taskCounts.completed +
    taskCounts.failed;

  const taskScore =
    totalTasks > 0 ? (taskCounts.completed / totalTasks) * 100 : 0;

  const activeMissions = missions.filter((m) =>
    ACTIVE_VENTURE_STATUSES.has(m.status)
  ).length;
  const progressed = missions.filter(
    (m) =>
      m.status !== MISSION_STATUSES.RESEARCHING &&
      m.status !== MISSION_STATUSES.KILLED
  ).length;
  const missionScore =
    missions.length > 0 ? (progressed / missions.length) * 100 : 0;

  const launchScore =
    missions.length > 0
      ? (activeMissions / missions.length) * 100
      : 0;

  return clampScore(taskScore * 0.4 + missionScore * 0.35 + launchScore * 0.25);
}

/** Atlas department score from persisted agent + mission signals. */
export function computeAtlasPerformanceScore(
  input: EmpireScoreV2RawInput
): number {
  const atlasAgents = agentsByDepartment(
    input.agents,
    DEPARTMENT_KEYS.CEO_OFFICE
  );
  const atlas = atlasAgents.find((a) => a.agentKey === "atlas");
  const agentScore = atlas?.score ?? averageAgentScore(atlasAgents);
  const execRate = completionRate(
    atlas?.missionsCompleted ?? 0,
    atlas?.missionsWorked ?? 0
  );
  const revenueBonus = Math.min((atlas?.revenueInfluenced ?? 0) / 5, 20);
  const levelBonus = Math.min((atlas?.level ?? 1) * 5, 25);

  return clampScore(
    agentScore * 0.45 + execRate * 0.25 + revenueBonus + levelBonus * 0.3
  );
}

/** Athena department score from scout performance snapshots. */
export function computeAthenaPerformanceScore(
  input: EmpireScoreV2RawInput
): number {
  const { scouts } = input;
  if (scouts.length === 0) return 0;

  const avgScore = averageScoutScore(scouts);
  const totalOpportunities = scouts.reduce(
    (sum, s) => sum + s.opportunitiesFound,
    0
  );
  const totalMissions = scouts.reduce((sum, s) => sum + s.missionsCreated, 0);
  const avgSuccess =
    scouts.reduce((sum, s) => sum + s.successRate, 0) / scouts.length;
  const xpBonus = Math.min(averageScoutLevel(scouts) * 8, 24);

  const opportunityScore = Math.min(totalOpportunities * 3, 30);
  const missionScore = Math.min(totalMissions * 5, 25);

  return clampScore(
    avgScore * 0.35 +
      opportunityScore * 0.2 +
      missionScore * 0.2 +
      avgSuccess * 0.15 +
      xpBonus * 0.1
  );
}

/** Forge department score from builder agents. */
export function computeForgePerformanceScore(
  input: EmpireScoreV2RawInput
): number {
  const forgeAgents = agentsByDepartment(
    input.agents,
    DEPARTMENT_KEYS.BUILDER_WORKSHOP
  );
  if (forgeAgents.length === 0) return 0;

  const avgScore = averageAgentScore(forgeAgents);
  const buildsCompleted = forgeAgents.reduce(
    (sum, a) => sum + a.missionsCompleted,
    0
  );
  const revenue = forgeAgents.reduce(
    (sum, a) => sum + a.revenueInfluenced,
    0
  );
  const levelBonus = Math.min(averageAgentLevel(forgeAgents) * 6, 30);

  return clampScore(
    avgScore * 0.4 +
      Math.min(buildsCompleted * 5, 25) +
      Math.min(revenue / 10, 20) +
      Math.min(levelBonus, 15)
  );
}

/** Nova department score from growth agents. */
export function computeNovaPerformanceScore(
  input: EmpireScoreV2RawInput
): number {
  const novaAgents = agentsByDepartment(input.agents, DEPARTMENT_KEYS.GROWTH);
  if (novaAgents.length === 0) return 0;

  const avgScore = averageAgentScore(novaAgents);
  const launched = novaAgents.reduce((sum, a) => sum + a.missionsCompleted, 0);
  const revenue = novaAgents.reduce((sum, a) => sum + a.revenueInfluenced, 0);
  const xpBonus = Math.min(
    novaAgents.reduce((sum, a) => sum + a.xp, 0) / novaAgents.length / 20,
    25
  );

  return clampScore(
    avgScore * 0.45 + Math.min(launched * 10, 30) + Math.min(revenue / 5, 15) + xpBonus
  );
}

/** Mercury department score from finance agents + profitability. */
export function computeMercuryPerformanceScore(
  input: EmpireScoreV2RawInput
): number {
  const mercuryAgents = agentsByDepartment(
    input.agents,
    DEPARTMENT_KEYS.FINANCE
  );
  const portfolioHealth = computePortfolioHealthScore(input.missions);

  if (mercuryAgents.length === 0) {
    return clampScore(portfolioHealth * 0.6);
  }

  const avgScore = averageAgentScore(mercuryAgents);
  const profitable = mercuryAgents.reduce(
    (sum, a) => sum + a.missionsCompleted,
    0
  );
  const profitGbp = mercuryAgents.reduce(
    (sum, a) => sum + a.revenueInfluenced,
    0
  );

  return clampScore(
    avgScore * 0.35 +
      portfolioHealth * 0.25 +
      Math.min(profitable * 15, 25) +
      Math.min(profitGbp / 5, 15)
  );
}

/** Venture diversification 0–100 across six core venture types. */
export function computeVentureDiversificationScore(
  missions: EmpireScoreV2RawInput["missions"]
): number {
  const activeTypes = new Set<string>();

  for (const mission of missions) {
    if (!mission.ventureTypeKey) continue;
    if (!ACTIVE_VENTURE_STATUSES.has(mission.status)) continue;
    if (
      CORE_VENTURE_TYPES.includes(
        mission.ventureTypeKey as (typeof CORE_VENTURE_TYPES)[number]
      )
    ) {
      activeTypes.add(mission.ventureTypeKey);
    }
  }

  const base = (activeTypes.size / CORE_VENTURE_TYPES.length) * 100;
  const breadthBonus = activeTypes.size >= 3 ? 10 : activeTypes.size >= 2 ? 5 : 0;

  return clampScore(Math.min(base + breadthBonus, 100));
}

/** Compute all V2 component scores — each 0–100. */
export function computeComponentScores(
  input: EmpireScoreV2RawInput
): ComponentScores {
  return {
    portfolioHealth: computePortfolioHealthScore(input.missions),
    revenuePerformance: computeRevenuePerformanceScore(
      input.totalRevenue,
      input.netProfit
    ),
    missionExecution: computeMissionExecutionScore(input),
    atlasPerformance: computeAtlasPerformanceScore(input),
    athenaPerformance: computeAthenaPerformanceScore(input),
    forgePerformance: computeForgePerformanceScore(input),
    novaPerformance: computeNovaPerformanceScore(input),
    mercuryPerformance: computeMercuryPerformanceScore(input),
    ventureDiversification: computeVentureDiversificationScore(input.missions),
  };
}

/** Weighted Empire Score V2 — maximum 100. */
export function computeEmpireScoreV2(components: ComponentScores): number {
  let total = 0;
  for (const [key, weight] of Object.entries(COMPONENT_WEIGHTS) as Array<
    [ComponentKey, number]
  >) {
    total += components[key] * weight;
  }
  return Math.round(Math.min(Math.max(total, 0), 100) * 10) / 10;
}

/** Department-level scores for HQ engines. */
export function computeDepartmentScoresV2(
  input: EmpireScoreV2RawInput,
  components: ComponentScores
): DepartmentScoreV2[] {
  const departments = [
    {
      key: DEPARTMENT_KEYS.CEO_OFFICE,
      score: components.atlasPerformance,
    },
    {
      key: DEPARTMENT_KEYS.RESEARCH_LAB,
      score: components.athenaPerformance,
    },
    {
      key: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
      score: components.forgePerformance,
    },
    {
      key: DEPARTMENT_KEYS.GROWTH,
      score: components.novaPerformance,
    },
    {
      key: DEPARTMENT_KEYS.FINANCE,
      score: components.mercuryPerformance,
    },
  ];

  return departments
    .map(({ key, score }) => {
      const deptAgents = agentsByDepartment(input.agents, key);
      return {
        departmentKey: key,
        departmentName: DEPARTMENT_NAMES[key] ?? key,
        score,
        agentCount: deptAgents.length,
        averageLevel: averageAgentLevel(deptAgents),
        averageXp:
          deptAgents.length > 0
            ? Math.round(
                deptAgents.reduce((sum, a) => sum + a.xp, 0) /
                  deptAgents.length
              )
            : 0,
        missionsWorked: deptAgents.reduce((sum, a) => sum + a.missionsWorked, 0),
        missionsCompleted: deptAgents.reduce(
          (sum, a) => sum + a.missionsCompleted,
          0
        ),
        revenueInfluenced: Math.round(
          deptAgents.reduce((sum, a) => sum + a.revenueInfluenced, 0) * 100
        ) / 100,
      };
    })
    .sort((a, b) => b.score - a.score);
}

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  portfolioHealth: "Portfolio Health",
  revenuePerformance: "Revenue Performance",
  missionExecution: "Mission Execution",
  atlasPerformance: "Atlas Performance",
  athenaPerformance: "Athena Performance",
  forgePerformance: "Forge Performance",
  novaPerformance: "Nova Performance",
  mercuryPerformance: "Mercury Performance",
  ventureDiversification: "Venture Diversification",
};

export function deriveStrengthsAndWeaknesses(components: ComponentScores): {
  strengths: string[];
  weaknesses: string[];
} {
  const ranked = (Object.entries(components) as Array<[ComponentKey, number]>)
    .map(([key, score]) => ({
      key,
      label: COMPONENT_LABELS[key],
      score,
      weight: COMPONENT_WEIGHTS[key],
      contribution: score * COMPONENT_WEIGHTS[key],
    }))
    .sort((a, b) => b.contribution - a.contribution);

  const strengths = ranked
    .filter((item) => item.score >= 40)
    .slice(0, 3)
    .map((item) => `${item.label} (${item.score}/100)`);

  const weaknesses = [...ranked]
    .sort((a, b) => a.score - b.score)
    .filter((item) => item.score < 60)
    .slice(0, 3)
    .map((item) => `${item.label} (${item.score}/100)`);

  return {
    strengths: strengths.length > 0 ? strengths : ["Building momentum — early stage empire"],
    weaknesses:
      weaknesses.length > 0 ? weaknesses : ["No critical weaknesses identified"],
  };
}

export { COMPONENT_LABELS };

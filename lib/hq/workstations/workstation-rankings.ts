import { DEPARTMENT_KEYS } from "../constants";
import type { AgentProfile } from "./agent-profiles";
import type { ScoutProfile } from "./scout-profiles";

export type AgentRankings = {
  topAgents: AgentProfile[];
  highestXp: AgentProfile[];
  highestScore: AgentProfile[];
  highestRevenue: AgentProfile[];
};

export type ScoutRankings = {
  topScouts: ScoutProfile[];
  highestXp: ScoutProfile[];
  highestScore: ScoutProfile[];
  highestRevenue: ScoutProfile[];
};

export type DepartmentRanking = {
  departmentKey: string;
  departmentName: string;
  agentCount: number;
  averageScore: number;
  averageLevel: number;
  totalXp: number;
  totalRevenue: number;
  topAgent: AgentProfile | null;
};

export type WorkstationRankings = {
  agents: AgentRankings;
  scouts: ScoutRankings;
  departments: DepartmentRanking[];
};

const DEPARTMENT_LABELS: Record<string, string> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: "CEO Office",
  [DEPARTMENT_KEYS.RESEARCH_LAB]: "Research Lab",
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: "Builder Workshop",
  [DEPARTMENT_KEYS.GROWTH]: "Growth",
  [DEPARTMENT_KEYS.FINANCE]: "Finance",
};

function topN<T>(items: T[], sortFn: (a: T, b: T) => number, n = 5): T[] {
  return [...items].sort(sortFn).slice(0, n);
}

export function buildAgentRankings(agents: AgentProfile[]): AgentRankings {
  return {
    topAgents: topN(
      agents,
      (a, b) => b.score - a.score || b.xp - a.xp
    ),
    highestXp: topN(agents, (a, b) => b.xp - a.xp),
    highestScore: topN(agents, (a, b) => b.score - a.score),
    highestRevenue: topN(
      agents,
      (a, b) => b.revenueInfluenced - a.revenueInfluenced
    ),
  };
}

export function buildScoutRankings(scouts: ScoutProfile[]): ScoutRankings {
  return {
    topScouts: topN(
      scouts,
      (a, b) => b.score - a.score || b.xp - a.xp
    ),
    highestXp: topN(scouts, (a, b) => b.xp - a.xp),
    highestScore: topN(scouts, (a, b) => b.score - a.score),
    highestRevenue: topN(
      scouts,
      (a, b) => b.revenueGenerated - a.revenueGenerated
    ),
  };
}

export function buildDepartmentRankings(
  agents: AgentProfile[]
): DepartmentRanking[] {
  const subAgents = agents.filter((a) => !a.isAggregate);

  return Object.entries(DEPARTMENT_LABELS)
    .map(([departmentKey, departmentName]) => {
      const deptAgents = subAgents.filter(
        (a) => a.department === departmentKey
      );
      const topAgent =
        [...deptAgents].sort(
          (a, b) => b.score - a.score || b.xp - a.xp
        )[0] ?? null;

      return {
        departmentKey,
        departmentName,
        agentCount: deptAgents.length,
        averageScore:
          deptAgents.length > 0
            ? Math.round(
                (deptAgents.reduce((s, a) => s + a.score, 0) /
                  deptAgents.length) *
                  10
              ) / 10
            : 0,
        averageLevel:
          deptAgents.length > 0
            ? Math.round(
                (deptAgents.reduce((s, a) => s + a.level, 0) /
                  deptAgents.length) *
                  10
              ) / 10
            : 0,
        totalXp: deptAgents.reduce((s, a) => s + a.xp, 0),
        totalRevenue: deptAgents.reduce(
          (s, a) => s + a.revenueInfluenced,
          0
        ),
        topAgent,
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);
}

export function buildWorkstationRankings(
  agents: AgentProfile[],
  scouts: ScoutProfile[]
): WorkstationRankings {
  return {
    agents: buildAgentRankings(agents),
    scouts: buildScoutRankings(scouts),
    departments: buildDepartmentRankings(agents),
  };
}

export type TopPerformersSummary = {
  topAgent: AgentProfile | null;
  topScout: ScoutProfile | null;
  highestXpAgent: AgentProfile | null;
  highestRevenueAgent: AgentProfile | null;
  highestXpScout: ScoutProfile | null;
  highestRevenueScout: ScoutProfile | null;
};

export function buildTopPerformersSummary(
  agents: AgentProfile[],
  scouts: ScoutProfile[]
): TopPerformersSummary {
  const rankings = buildWorkstationRankings(agents, scouts);

  return {
    topAgent: rankings.agents.topAgents[0] ?? null,
    topScout: rankings.scouts.topScouts[0] ?? null,
    highestXpAgent: rankings.agents.highestXp[0] ?? null,
    highestRevenueAgent: rankings.agents.highestRevenue[0] ?? null,
    highestXpScout: rankings.scouts.highestXp[0] ?? null,
    highestRevenueScout: rankings.scouts.highestRevenue[0] ?? null,
  };
}

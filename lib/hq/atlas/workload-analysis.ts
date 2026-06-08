import { DEPARTMENT_KEYS, HQ_PERSONAS, type HqPersona } from "../constants";
import type { DepartmentWorkload } from "../orchestration/department-coordinator";

export type WorkloadLevel = "balanced" | "busy" | "overloaded";

export type DepartmentWorkloadAnalysis = {
  persona: HqPersona;
  displayName: string;
  departmentKey: string;
  activeMissions: number;
  blockedMissions: number;
  awaitingHandoff: number;
  level: WorkloadLevel;
  summary: string;
};

const ANALYSIS_PERSONAS: HqPersona[] = [
  HQ_PERSONAS.ATHENA,
  HQ_PERSONAS.FORGE,
  HQ_PERSONAS.NOVA,
  HQ_PERSONAS.MERCURY,
];

function classifyWorkload(activeMissions: number, blockedMissions: number): WorkloadLevel {
  if (blockedMissions > 0 || activeMissions >= 6) return "overloaded";
  if (activeMissions >= 3) return "busy";
  return "balanced";
}

function workloadSummary(level: WorkloadLevel, active: number, blocked: number): string {
  if (level === "overloaded") {
    return blocked > 0
      ? `${active} active with ${blocked} blocked — capacity constrained`
      : `${active} active missions — department overloaded`;
  }
  if (level === "busy") {
    return `${active} active missions — elevated workload`;
  }
  return `${active} active missions — capacity available`;
}

/** Atlas executive workload analysis for operational departments. */
export function analyzeDepartmentWorkloads(
  workloads: DepartmentWorkload[]
): DepartmentWorkloadAnalysis[] {
  return ANALYSIS_PERSONAS.map((persona) => {
    const row =
      workloads.find((w) => w.persona === persona) ??
      workloads.find((w) => w.departmentKey === departmentKeyForPersona(persona));

    const activeMissions = row?.activeMissions ?? 0;
    const blockedMissions = row?.blockedMissions ?? 0;
    const level = classifyWorkload(activeMissions, blockedMissions);

    return {
      persona,
      displayName: row?.displayName ?? persona,
      departmentKey: row?.departmentKey ?? departmentKeyForPersona(persona),
      activeMissions,
      blockedMissions,
      awaitingHandoff: row?.awaitingHandoff ?? 0,
      level,
      summary: workloadSummary(level, activeMissions, blockedMissions),
    };
  });
}

function departmentKeyForPersona(persona: HqPersona): string {
  switch (persona) {
    case HQ_PERSONAS.ATHENA:
      return DEPARTMENT_KEYS.RESEARCH_LAB;
    case HQ_PERSONAS.FORGE:
      return DEPARTMENT_KEYS.BUILDER_WORKSHOP;
    case HQ_PERSONAS.NOVA:
      return DEPARTMENT_KEYS.GROWTH;
    case HQ_PERSONAS.MERCURY:
      return DEPARTMENT_KEYS.FINANCE;
    default:
      return DEPARTMENT_KEYS.CEO_OFFICE;
  }
}

export function workloadPortfolioSummary(
  analyses: DepartmentWorkloadAnalysis[]
): { balanced: number; busy: number; overloaded: number } {
  return {
    balanced: analyses.filter((a) => a.level === "balanced").length,
    busy: analyses.filter((a) => a.level === "busy").length,
    overloaded: analyses.filter((a) => a.level === "overloaded").length,
  };
}

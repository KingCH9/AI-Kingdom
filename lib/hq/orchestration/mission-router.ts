import { getDepartmentKeyForPersona } from "../agent-registry";
import {
  HQ_PERSONAS,
  MISSION_PHASES,
  MISSION_STATUSES,
  type DepartmentKey,
  type HqPersona,
  type MissionPhase,
  type MissionStatus,
} from "../constants";

/** Ordered mission lifecycle — advisory routing only. */
export const MISSION_LIFECYCLE: readonly MissionStatus[] = [
  MISSION_STATUSES.RESEARCHING,
  MISSION_STATUSES.VALIDATING,
  MISSION_STATUSES.APPROVED,
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
] as const;

export type OrchestrationStage = {
  status: MissionStatus;
  phase: MissionPhase | null;
  ownerPersona: HqPersona;
  departmentKey: DepartmentKey;
  label: string;
  description: string;
};

/** Status → HQ operating stage (Athena → Atlas → Forge → Nova → Mercury). */
export const ORCHESTRATION_STAGES: Record<MissionStatus, OrchestrationStage> = {
  [MISSION_STATUSES.RESEARCHING]: {
    status: MISSION_STATUSES.RESEARCHING,
    phase: MISSION_PHASES.RESEARCH,
    ownerPersona: HQ_PERSONAS.ATHENA,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.ATHENA),
    label: "Research Discovery",
    description: "Athena scouts and validates market opportunity",
  },
  [MISSION_STATUSES.VALIDATING]: {
    status: MISSION_STATUSES.VALIDATING,
    phase: MISSION_PHASES.VALIDATE,
    ownerPersona: HQ_PERSONAS.ATHENA,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.ATHENA),
    label: "Validation",
    description: "Athena completes venture validation metrics",
  },
  [MISSION_STATUSES.APPROVED]: {
    status: MISSION_STATUSES.APPROVED,
    phase: null,
    ownerPersona: HQ_PERSONAS.ATLAS,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.ATLAS),
    label: "CEO Review",
    description: "Atlas prioritizes and approves venture launch",
  },
  [MISSION_STATUSES.BUILDING]: {
    status: MISSION_STATUSES.BUILDING,
    phase: MISSION_PHASES.BUILD,
    ownerPersona: HQ_PERSONAS.FORGE,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.FORGE),
    label: "Build",
    description: "Forge prepares build plan and venture assets",
  },
  [MISSION_STATUSES.LAUNCHING]: {
    status: MISSION_STATUSES.LAUNCHING,
    phase: MISSION_PHASES.LAUNCH,
    ownerPersona: HQ_PERSONAS.NOVA,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.NOVA),
    label: "Launch",
    description: "Nova prepares growth and launch plan",
  },
  [MISSION_STATUSES.GROWING]: {
    status: MISSION_STATUSES.GROWING,
    phase: MISSION_PHASES.GROW,
    ownerPersona: HQ_PERSONAS.NOVA,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.NOVA),
    label: "Growth",
    description: "Nova drives traffic, conversions, and revenue",
  },
  [MISSION_STATUSES.PROFITABLE]: {
    status: MISSION_STATUSES.PROFITABLE,
    phase: MISSION_PHASES.GROW,
    ownerPersona: HQ_PERSONAS.MERCURY,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.MERCURY),
    label: "ROI Monitoring",
    description: "Mercury tracks profit, ROI, and venture performance",
  },
  [MISSION_STATUSES.KILLED]: {
    status: MISSION_STATUSES.KILLED,
    phase: null,
    ownerPersona: HQ_PERSONAS.ATLAS,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.ATLAS),
    label: "Killed",
    description: "Venture terminated by Atlas",
  },
  [MISSION_STATUSES.BLOCKED]: {
    status: MISSION_STATUSES.BLOCKED,
    phase: null,
    ownerPersona: HQ_PERSONAS.ATLAS,
    departmentKey: getDepartmentKeyForPersona(HQ_PERSONAS.ATLAS),
    label: "Blocked",
    description: "Mission blocked — requires human intervention",
  },
};

export type MissionRouteInput = {
  id: number;
  status: string;
  ownerPersona: string;
  humanOverride?: boolean;
  targetRoi?: number | null;
  missionTasks?: Array<{
    phase: string;
    status: string;
    ownerPersona: string;
  }>;
  opportunity?: { opportunityScore?: number | null } | null;
};

export type MissionRoute = {
  missionId: number;
  status: MissionStatus;
  stage: OrchestrationStage;
  ownerPersona: HqPersona;
  departmentKey: DepartmentKey;
  activePhase: MissionPhase | null;
  activeTaskStatus: string | null;
  nextStatus: MissionStatus | null;
  nextOwnerPersona: HqPersona | null;
  nextDepartmentKey: DepartmentKey | null;
  nextStageLabel: string | null;
  requiresHumanApproval: boolean;
  suggestedAction: string;
  isTerminal: boolean;
  isBlocked: boolean;
  highPriority: boolean;
};

/** Owner persona derived from mission status — single source for routing. */
export function ownerPersonaForMissionStatus(status: MissionStatus): HqPersona {
  return ORCHESTRATION_STAGES[status]?.ownerPersona ?? HQ_PERSONAS.ATLAS;
}

export function departmentKeyForMissionStatus(status: MissionStatus): DepartmentKey {
  return ORCHESTRATION_STAGES[status]?.departmentKey ?? getDepartmentKeyForPersona(HQ_PERSONAS.ATLAS);
}

export function nextStatusInLifecycle(status: MissionStatus): MissionStatus | null {
  if (
    status === MISSION_STATUSES.KILLED ||
    status === MISSION_STATUSES.BLOCKED ||
    status === MISSION_STATUSES.PROFITABLE
  ) {
    return null;
  }

  const idx = MISSION_LIFECYCLE.indexOf(status);
  if (idx === -1 || idx >= MISSION_LIFECYCLE.length - 1) {
    return null;
  }

  return MISSION_LIFECYCLE[idx + 1] ?? null;
}

/** Transitions that require explicit human approval (Phase 3 automation rules). */
export function requiresHumanApprovalForTransition(
  from: MissionStatus,
  to: MissionStatus
): boolean {
  if (from === MISSION_STATUSES.VALIDATING && to === MISSION_STATUSES.APPROVED) {
    return true;
  }
  if (from === MISSION_STATUSES.APPROVED && to === MISSION_STATUSES.BUILDING) {
    return true;
  }
  if (from === MISSION_STATUSES.BUILDING && to === MISSION_STATUSES.LAUNCHING) {
    return true;
  }
  if (from === MISSION_STATUSES.LAUNCHING && to === MISSION_STATUSES.GROWING) {
    return true;
  }
  if (from === MISSION_STATUSES.GROWING && to === MISSION_STATUSES.PROFITABLE) {
    return true;
  }
  return false;
}

function resolveActiveTask(
  tasks: MissionRouteInput["missionTasks"]
): { phase: MissionPhase | null; status: string | null } {
  if (!tasks?.length) {
    return { phase: null, status: null };
  }

  const active = tasks.find((t) => t.status === "active");
  if (active) {
    return {
      phase: active.phase as MissionPhase,
      status: active.status,
    };
  }

  const pending = tasks.find((t) => t.status === "pending");
  if (pending) {
    return {
      phase: pending.phase as MissionPhase,
      status: pending.status,
    };
  }

  const last = tasks[tasks.length - 1];
  return {
    phase: (last?.phase as MissionPhase) ?? null,
    status: last?.status ?? null,
  };
}

function buildSuggestedAction(
  status: MissionStatus,
  nextStatus: MissionStatus | null,
  requiresApproval: boolean,
  isBlocked: boolean
): string {
  if (isBlocked) {
    return "Resolve blockers and clear human override before advancing";
  }

  if (!nextStatus) {
    if (status === MISSION_STATUSES.PROFITABLE) {
      return "Mercury monitors ROI — no further stage transition";
    }
    if (status === MISSION_STATUSES.KILLED) {
      return "Mission terminated — no further action";
    }
    return "Await orchestration update";
  }

  const nextStage = ORCHESTRATION_STAGES[nextStatus];
  if (requiresApproval) {
    return `Human approval required: advance to ${nextStage.label} (${nextStage.ownerPersona})`;
  }

  return `Ready to hand off to ${nextStage.label} (${nextStage.ownerPersona})`;
}

/** Compute routing view for a single mission. Advisory only — no side effects. */
export function routeMission(mission: MissionRouteInput): MissionRoute {
  const status = mission.status as MissionStatus;
  const stage =
    ORCHESTRATION_STAGES[status] ?? ORCHESTRATION_STAGES[MISSION_STATUSES.RESEARCHING];
  const nextStatus = nextStatusInLifecycle(status);
  const nextStage = nextStatus ? ORCHESTRATION_STAGES[nextStatus] : null;
  const requiresHumanApproval = nextStatus
    ? requiresHumanApprovalForTransition(status, nextStatus)
    : false;

  const { phase, status: taskStatus } = resolveActiveTask(mission.missionTasks);
  const isBlocked =
    status === MISSION_STATUSES.BLOCKED ||
    mission.missionTasks?.some((t) => t.status === "blocked" || t.status === "failed") ===
      true;

  const oppScore = mission.opportunity?.opportunityScore ?? 0;
  const highPriority =
    oppScore >= 80 || (mission.targetRoi !== null && mission.targetRoi !== undefined && mission.targetRoi >= 2);

  return {
    missionId: mission.id,
    status,
    stage,
    ownerPersona: stage.ownerPersona,
    departmentKey: stage.departmentKey,
    activePhase: phase,
    activeTaskStatus: taskStatus,
    nextStatus,
    nextOwnerPersona: nextStage?.ownerPersona ?? null,
    nextDepartmentKey: nextStage?.departmentKey ?? null,
    nextStageLabel: nextStage?.label ?? null,
    requiresHumanApproval,
    suggestedAction: buildSuggestedAction(
      status,
      nextStatus,
      requiresHumanApproval,
      isBlocked
    ),
    isTerminal: status === MISSION_STATUSES.KILLED || status === MISSION_STATUSES.PROFITABLE,
    isBlocked,
    highPriority,
  };
}

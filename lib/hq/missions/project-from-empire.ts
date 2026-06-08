import type { Opportunity, Store, Task } from "@prisma/client";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import type { OpportunityStatus } from "@/lib/types";
import { TASK_STATUSES, TASK_TITLE_PREFIX } from "@/lib/tasks/constants";
import {
  getPersonaByPipelineRole,
} from "../agent-registry";
import {
  HQ_PERSONAS,
  MISSION_PHASES,
  MISSION_STATUSES,
  type HqPersona,
  type MissionPhase,
  type MissionStatus,
} from "../constants";

export type MissionProjectionInput = {
  opportunity: Opportunity;
  store: Store | null;
  tasks: Task[];
};

export type MissionPhaseSeed = {
  phase: MissionPhase;
  title: string;
  ownerPersona: HqPersona;
  sortOrder: number;
  status: "pending" | "active" | "completed" | "blocked" | "failed";
  legacyTaskId?: number;
};

/** Maps empire opportunity status → HQ mission status (read-only projection). */
export function mapOpportunityToMissionStatus(
  opportunityStatus: string
): MissionStatus {
  const status = normalizeOpportunityStatus(opportunityStatus);

  const mapping: Record<OpportunityStatus, MissionStatus> = {
    researching: MISSION_STATUSES.RESEARCHING,
    validated: MISSION_STATUSES.VALIDATING,
    launch_ready: MISSION_STATUSES.APPROVED,
    sourcing: MISSION_STATUSES.BUILDING,
    building: MISSION_STATUSES.BUILDING,
    launched: MISSION_STATUSES.LAUNCHING,
    scaling: MISSION_STATUSES.GROWING,
    profitable: MISSION_STATUSES.PROFITABLE,
    killed: MISSION_STATUSES.KILLED,
  };

  return mapping[status] ?? MISSION_STATUSES.RESEARCHING;
}

/** Owner persona derived from mission status — no agent-to-agent messaging. */
export function ownerPersonaForMissionStatus(status: MissionStatus): HqPersona {
  switch (status) {
    case MISSION_STATUSES.RESEARCHING:
    case MISSION_STATUSES.VALIDATING:
      return HQ_PERSONAS.ATHENA;
    case MISSION_STATUSES.APPROVED:
      return HQ_PERSONAS.ATLAS;
    case MISSION_STATUSES.BUILDING:
      return HQ_PERSONAS.FORGE;
    case MISSION_STATUSES.LAUNCHING:
    case MISSION_STATUSES.GROWING:
      return HQ_PERSONAS.NOVA;
    case MISSION_STATUSES.PROFITABLE:
      return HQ_PERSONAS.MERCURY;
    case MISSION_STATUSES.KILLED:
    case MISSION_STATUSES.BLOCKED:
    default:
      return HQ_PERSONAS.ATLAS;
  }
}

function taskPhaseStatus(
  task: Task | undefined
): MissionPhaseSeed["status"] {
  if (!task) return "pending";
  switch (task.status) {
    case TASK_STATUSES.COMPLETED:
      return "completed";
    case TASK_STATUSES.IN_PROGRESS:
      return "active";
    case TASK_STATUSES.FAILED:
      return "failed";
    default:
      return "pending";
  }
}

function findTaskByPrefix(tasks: Task[], prefix: string): Task | undefined {
  return tasks.find((task) => task.title.startsWith(prefix));
}

/** Standard mission phases for an ecommerce venture. */
export function buildMissionPhaseSeeds(input: MissionProjectionInput): MissionPhaseSeed[] {
  const buildTask = findTaskByPrefix(
    input.tasks,
    TASK_TITLE_PREFIX.BUILD_STORE
  );
  const marketingTask = findTaskByPrefix(
    input.tasks,
    TASK_TITLE_PREFIX.MARKETING_PLAN
  );

  const missionStatus = mapOpportunityToMissionStatus(input.opportunity.status);

  const researchStatus: MissionPhaseSeed["status"] =
    missionStatus === MISSION_STATUSES.RESEARCHING ? "active" : "completed";

  const validateStatus: MissionPhaseSeed["status"] =
    missionStatus === MISSION_STATUSES.VALIDATING
      ? "active"
      : missionStatus === MISSION_STATUSES.RESEARCHING ||
          missionStatus === MISSION_STATUSES.KILLED
        ? "pending"
        : "completed";

  const buildStatus =
    missionStatus === MISSION_STATUSES.BUILDING
      ? "active"
      : taskPhaseStatus(buildTask);

  const launchStatus =
    missionStatus === MISSION_STATUSES.LAUNCHING
      ? "active"
      : taskPhaseStatus(marketingTask);

  const growStatus: MissionPhaseSeed["status"] =
    missionStatus === MISSION_STATUSES.GROWING ||
    missionStatus === MISSION_STATUSES.PROFITABLE
      ? "active"
      : "pending";

  return [
    {
      phase: MISSION_PHASES.RESEARCH,
      title: "Research market opportunity",
      ownerPersona: HQ_PERSONAS.ATHENA,
      sortOrder: 0,
      status: researchStatus,
    },
    {
      phase: MISSION_PHASES.VALIDATE,
      title: "Validate venture metrics",
      ownerPersona: HQ_PERSONAS.ATHENA,
      sortOrder: 1,
      status: validateStatus,
    },
    {
      phase: MISSION_PHASES.BUILD,
      title: "Build store and product assets",
      ownerPersona: HQ_PERSONAS.FORGE,
      sortOrder: 2,
      status: buildStatus,
      legacyTaskId: buildTask?.id,
    },
    {
      phase: MISSION_PHASES.LAUNCH,
      title: "Launch marketing and go live",
      ownerPersona: HQ_PERSONAS.NOVA,
      sortOrder: 3,
      status: launchStatus,
      legacyTaskId: marketingTask?.id,
    },
    {
      phase: MISSION_PHASES.GROW,
      title: "Grow traffic and conversions",
      ownerPersona: HQ_PERSONAS.NOVA,
      sortOrder: 4,
      status: growStatus,
    },
  ];
}

export function buildMissionTitle(opportunity: Opportunity): string {
  return `Launch ${opportunity.productName}`;
}

export function pipelineRoleToPersona(role: string): HqPersona | null {
  return getPersonaByPipelineRole(role);
}

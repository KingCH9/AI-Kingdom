import { prisma } from "@/lib/prisma";
import { HQ_PERSONA_REGISTRY } from "../agent-registry";
import { MISSION_STATUSES, type MissionStatus } from "../constants";
import {
  getDepartmentWorkloads,
  getPendingHandoffs,
  isActiveMissionStatus,
  type DepartmentWorkload,
  type PendingHandoff,
} from "./department-coordinator";
import { routeMission, type MissionRoute } from "./mission-router";

export type MissionOrchestrationView = {
  id: number;
  title: string;
  status: string;
  ownerPersona: string;
  departmentKey: string;
  departmentName: string;
  ventureTypeKey: string | null;
  revenueStream: string;
  targetRoi: number | null;
  opportunityScore: number | null;
  route: MissionRoute;
};

export type CommandCenterSnapshot = {
  generatedAt: string;
  totals: {
    active: number;
    blocked: number;
    awaitingApproval: number;
    highPriority: number;
    pendingHandoffs: number;
  };
  activeMissions: MissionOrchestrationView[];
  blockedMissions: MissionOrchestrationView[];
  highRoiMissions: MissionOrchestrationView[];
  departmentWorkloads: DepartmentWorkload[];
  pendingHandoffs: PendingHandoff[];
  routingChain: Array<{
    persona: string;
    displayName: string;
    departmentKey: string;
    label: string;
  }>;
};

function toOrchestrationView(
  mission: Awaited<ReturnType<typeof loadOrchestrationMissions>>[number]
): MissionOrchestrationView {
  const route = routeMission({
    id: mission.id,
    status: mission.status,
    ownerPersona: mission.ownerPersona,
    humanOverride: mission.humanOverride,
    targetRoi: mission.targetRoi,
    missionTasks: mission.missionTasks,
    opportunity: mission.opportunity,
  });

  return {
    id: mission.id,
    title: mission.title,
    status: mission.status,
    ownerPersona: mission.ownerPersona,
    departmentKey: mission.department.key,
    departmentName: mission.department.name,
    ventureTypeKey: mission.ventureType?.key ?? null,
    revenueStream: mission.revenueStream,
    targetRoi: mission.targetRoi,
    opportunityScore: mission.opportunity?.opportunityScore ?? null,
    route,
  };
}

async function loadOrchestrationMissions() {
  return prisma.mission.findMany({
    include: {
      department: true,
      ventureType: true,
      opportunity: { select: { opportunityScore: true } },
      missionTasks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Evaluate orchestration state for a single mission. */
export async function evaluateMission(missionId: number) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      department: true,
      ventureType: true,
      opportunity: { select: { opportunityScore: true } },
      missionTasks: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!mission) {
    return null;
  }

  const view = toOrchestrationView(mission);
  const constitutionViolations = mission.events.filter(
    (e) => e.action === "rule_violation"
  );

  return {
    ...view,
    humanOverride: mission.humanOverride,
    overrideReason: mission.overrideReason,
    recentEvents: mission.events,
    blockers: [
      ...(view.route.isBlocked ? ["Mission or task blocked"] : []),
      ...(mission.humanOverride && mission.overrideReason
        ? [`Human override: ${mission.overrideReason}`]
        : []),
      ...constitutionViolations.map((e) => e.detail ?? "Constitution violation"),
    ],
  };
}

/** Mission Command Center snapshot — read-only orchestration view. */
export async function getCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  const missions = await loadOrchestrationMissions();
  const views = missions.map(toOrchestrationView);

  const activeMissions = views.filter((v) => isActiveMissionStatus(v.status));
  const blockedMissions = views.filter((v) => v.route.isBlocked);
  const highRoiMissions = views
    .filter((v) => v.route.highPriority && isActiveMissionStatus(v.status))
    .sort(
      (a, b) =>
        (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0) ||
        (b.targetRoi ?? 0) - (a.targetRoi ?? 0)
    );

  const awaitingApproval = activeMissions.filter(
    (v) => v.route.requiresHumanApproval
  ).length;

  const [departmentWorkloads, pendingHandoffs] = await Promise.all([
    getDepartmentWorkloads(),
    getPendingHandoffs(),
  ]);

  const routingChain = [
    MISSION_STATUSES.RESEARCHING,
    MISSION_STATUSES.VALIDATING,
    MISSION_STATUSES.APPROVED,
    MISSION_STATUSES.BUILDING,
    MISSION_STATUSES.LAUNCHING,
    MISSION_STATUSES.GROWING,
    MISSION_STATUSES.PROFITABLE,
  ].map((status) => {
    const sample = views.find((v) => v.status === status);
    const persona = sample?.route.ownerPersona ?? "atlas";
    const def = HQ_PERSONA_REGISTRY[persona as keyof typeof HQ_PERSONA_REGISTRY];
    return {
      persona,
      displayName: def.displayName,
      departmentKey: def.departmentKey,
      label: sample?.route.stage.label ?? status,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      active: activeMissions.length,
      blocked: blockedMissions.length,
      awaitingApproval,
      highPriority: highRoiMissions.length,
      pendingHandoffs: pendingHandoffs.length,
    },
    activeMissions,
    blockedMissions,
    highRoiMissions,
    departmentWorkloads,
    pendingHandoffs,
    routingChain,
  };
}

/** Describe orchestration handoff detail for mission event logging. */
export function formatHandoffDetail(input: {
  previousStatus: MissionStatus;
  nextStatus: MissionStatus;
  previousPersona: string;
  nextPersona: string;
  handoffLabel?: string | null;
}): string {
  const label = input.handoffLabel ?? `${input.previousStatus} → ${input.nextStatus}`;
  return `Department handoff: ${label} (${input.previousPersona} → ${input.nextPersona})`;
}

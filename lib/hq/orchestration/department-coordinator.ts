import { prisma } from "@/lib/prisma";
import { HQ_PERSONA_REGISTRY } from "../agent-registry";
import {
  DEPARTMENT_KEYS,
  HQ_PERSONAS,
  MISSION_STATUSES,
  type DepartmentKey,
  type HqPersona,
  type MissionStatus,
} from "../constants";
import {
  departmentKeyForMissionStatus,
  ownerPersonaForMissionStatus,
  type MissionRoute,
  routeMission,
} from "./mission-router";

export type DepartmentHandoff = {
  fromPersona: HqPersona;
  toPersona: HqPersona;
  fromDepartmentKey: DepartmentKey;
  toDepartmentKey: DepartmentKey;
  triggerStatus: MissionStatus;
  label: string;
};

/** Standard handoff chain across HQ departments. */
export const DEPARTMENT_HANDOFF_CHAIN: DepartmentHandoff[] = [
  {
    fromPersona: HQ_PERSONAS.ATHENA,
    toPersona: HQ_PERSONAS.ATLAS,
    fromDepartmentKey: DEPARTMENT_KEYS.RESEARCH_LAB,
    toDepartmentKey: DEPARTMENT_KEYS.CEO_OFFICE,
    triggerStatus: MISSION_STATUSES.VALIDATING,
    label: "Research complete → CEO review",
  },
  {
    fromPersona: HQ_PERSONAS.ATLAS,
    toPersona: HQ_PERSONAS.FORGE,
    fromDepartmentKey: DEPARTMENT_KEYS.CEO_OFFICE,
    toDepartmentKey: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
    triggerStatus: MISSION_STATUSES.APPROVED,
    label: "Approved → Build",
  },
  {
    fromPersona: HQ_PERSONAS.FORGE,
    toPersona: HQ_PERSONAS.NOVA,
    fromDepartmentKey: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
    toDepartmentKey: DEPARTMENT_KEYS.GROWTH,
    triggerStatus: MISSION_STATUSES.BUILDING,
    label: "Build complete → Launch",
  },
  {
    fromPersona: HQ_PERSONAS.NOVA,
    toPersona: HQ_PERSONAS.NOVA,
    fromDepartmentKey: DEPARTMENT_KEYS.GROWTH,
    toDepartmentKey: DEPARTMENT_KEYS.GROWTH,
    triggerStatus: MISSION_STATUSES.LAUNCHING,
    label: "Launch → Growth",
  },
  {
    fromPersona: HQ_PERSONAS.NOVA,
    toPersona: HQ_PERSONAS.MERCURY,
    fromDepartmentKey: DEPARTMENT_KEYS.GROWTH,
    toDepartmentKey: DEPARTMENT_KEYS.FINANCE,
    triggerStatus: MISSION_STATUSES.GROWING,
    label: "Growth → ROI monitoring",
  },
];

export type DepartmentWorkload = {
  departmentKey: DepartmentKey;
  departmentName: string;
  persona: HqPersona;
  displayName: string;
  avatarEmoji: string;
  activeMissions: number;
  blockedMissions: number;
  awaitingHandoff: number;
  totalMissions: number;
  currentMission: {
    id: number;
    title: string;
    status: string;
    stageLabel: string;
  } | null;
};

export type PendingHandoff = {
  missionId: number;
  missionTitle: string;
  currentStatus: MissionStatus;
  currentPersona: HqPersona;
  nextPersona: HqPersona;
  nextDepartmentKey: DepartmentKey;
  nextStageLabel: string;
  requiresHumanApproval: boolean;
  suggestedAction: string;
};

const ACTIVE_STATUSES: MissionStatus[] = [
  MISSION_STATUSES.RESEARCHING,
  MISSION_STATUSES.VALIDATING,
  MISSION_STATUSES.APPROVED,
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
];

export function isActiveMissionStatus(status: string): status is MissionStatus {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

type MissionRow = Awaited<ReturnType<typeof loadMissionsForCoordination>>[number];

async function loadMissionsForCoordination() {
  return prisma.mission.findMany({
    include: {
      department: true,
      opportunity: { select: { opportunityScore: true } },
      missionTasks: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/** Resolve department + persona assignment for a status transition. */
export function coordinateStatusTransition(input: {
  previousStatus: MissionStatus;
  nextStatus: MissionStatus;
}): {
  ownerPersona: HqPersona;
  departmentKey: DepartmentKey;
  handoff: DepartmentHandoff | null;
} {
  const ownerPersona = ownerPersonaForMissionStatus(input.nextStatus);
  const departmentKey = departmentKeyForMissionStatus(input.nextStatus);

  const handoff =
    DEPARTMENT_HANDOFF_CHAIN.find(
      (h) =>
        h.triggerStatus === input.previousStatus &&
        h.toPersona === ownerPersona
    ) ??
    DEPARTMENT_HANDOFF_CHAIN.find((h) => h.triggerStatus === input.previousStatus) ??
    null;

  return { ownerPersona, departmentKey, handoff };
}

function isAwaitingHandoff(route: MissionRoute): boolean {
  return (
    !route.isTerminal &&
    !route.isBlocked &&
    route.nextStatus !== null &&
    route.ownerPersona !== route.nextOwnerPersona
  );
}

export async function getDepartmentWorkloads(): Promise<DepartmentWorkload[]> {
  const missions = await loadMissionsForCoordination();
  const departments = await prisma.department.findMany();
  const deptByKey = new Map(departments.map((d) => [d.key, d]));

  return Object.values(HQ_PERSONAS).map((persona) => {
    const def = HQ_PERSONA_REGISTRY[persona];
    const deptKey = def.departmentKey;
    const dept = deptByKey.get(deptKey);

    const deptMissions = missions.filter(
      (m) => m.department.key === deptKey || m.ownerPersona === persona
    );

    const activeMissions = deptMissions.filter((m) => isActiveMissionStatus(m.status));

    const routes = activeMissions.map((m) =>
      routeMission({
        id: m.id,
        status: m.status,
        ownerPersona: m.ownerPersona,
        targetRoi: m.targetRoi,
        missionTasks: m.missionTasks,
        opportunity: m.opportunity,
      })
    );

    const blockedMissions = routes.filter((r) => r.isBlocked).length;
    const awaitingHandoff = routes.filter(isAwaitingHandoff).length;

    const current = activeMissions[0];
    const currentRoute = current
      ? routeMission({
          id: current.id,
          status: current.status,
          ownerPersona: current.ownerPersona,
          missionTasks: current.missionTasks,
        })
      : null;

    return {
      departmentKey: deptKey,
      departmentName: dept?.name ?? def.title,
      persona,
      displayName: def.displayName,
      avatarEmoji: def.avatarEmoji,
      activeMissions: activeMissions.length,
      blockedMissions,
      awaitingHandoff,
      totalMissions: deptMissions.length,
      currentMission: current
        ? {
            id: current.id,
            title: current.title,
            status: current.status,
            stageLabel: currentRoute?.stage.label ?? current.status,
          }
        : null,
    };
  });
}

export async function getPendingHandoffs(): Promise<PendingHandoff[]> {
  const missions = await loadMissionsForCoordination();

  return missions
    .filter((m) => isActiveMissionStatus(m.status))
    .map((m) => {
      const route = routeMission({
        id: m.id,
        status: m.status,
        ownerPersona: m.ownerPersona,
        targetRoi: m.targetRoi,
        missionTasks: m.missionTasks,
        opportunity: m.opportunity,
      });

      if (!route.nextStatus || !route.nextOwnerPersona || !route.nextDepartmentKey) {
        return null;
      }

      if (!isAwaitingHandoff(route) && !route.requiresHumanApproval) {
        return null;
      }

      return {
        missionId: m.id,
        missionTitle: m.title,
        currentStatus: route.status,
        currentPersona: route.ownerPersona,
        nextPersona: route.nextOwnerPersona,
        nextDepartmentKey: route.nextDepartmentKey,
        nextStageLabel: route.nextStageLabel ?? route.nextStatus,
        requiresHumanApproval: route.requiresHumanApproval,
        suggestedAction: route.suggestedAction,
      };
    })
    .filter((h): h is PendingHandoff => h !== null);
}

export function summarizeDepartmentCoordination(missions: MissionRow[]) {
  const byDepartment = new Map<DepartmentKey, number>();
  for (const mission of missions) {
    const key = mission.department.key as DepartmentKey;
    byDepartment.set(key, (byDepartment.get(key) ?? 0) + 1);
  }
  return byDepartment;
}

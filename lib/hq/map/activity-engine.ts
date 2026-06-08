import { prisma } from "@/lib/prisma";
import { getPersonaForDepartment } from "../agent-registry";
import { MISSION_STATUSES, type DepartmentKey } from "../constants";
import {
  formatActivityLabel,
  getActivityDefinition,
  type AgentActivityType,
} from "./activity-registry";
import {
  buildPipelineRoute,
  departmentToHomeRoom,
  getRoomAnchor,
  missionStatusToActivity,
  missionStatusToRoom,
} from "./agent-routes";
import type {
  HqActivityFeedEntry,
  HqAgentLiveState,
  HqDepartmentStatus,
  HqMapLiveState,
} from "./agent-state";
import { getHqMapState, type HqMapAgent } from "./map-state";
import { HQ_ROOMS, type HqRoomId } from "./room-registry";

type MissionRow = {
  id: number;
  title: string;
  status: string;
  ownerPersona: string;
  departmentKey: string;
  updatedAt: Date;
};

type DepartmentRow = {
  key: string;
  name: string;
  currentMissionTitle: string | null;
  currentMissionStatus: string | null;
};

const ACTIVE_MISSION_STATUSES = new Set<string>([
  MISSION_STATUSES.RESEARCHING,
  MISSION_STATUSES.VALIDATING,
  MISSION_STATUSES.APPROVED,
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

function missionLabel(mission: MissionRow): string {
  return `#${mission.id} ${mission.title}`;
}

function resolveMissionForAgent(
  agent: HqMapAgent,
  missions: MissionRow[],
  departmentMissionTitle: string | null
): MissionRow | null {
  if (agent.currentMission) {
    const match = missions.find((m) => m.title === agent.currentMission);
    if (match) return match;
  }

  if (departmentMissionTitle) {
    const match = missions.find((m) => m.title === departmentMissionTitle);
    if (match) return match;
  }

  if (agent.kind === "scout") {
    return (
      missions.find(
        (m) =>
          m.departmentKey === "research_lab" &&
          ACTIVE_MISSION_STATUSES.has(m.status)
      ) ?? null
    );
  }

  return (
    missions.find(
      (m) =>
        m.departmentKey === agent.department &&
        ACTIVE_MISSION_STATUSES.has(m.status)
    ) ?? null
  );
}

function computeAgentLiveState(
  agent: HqMapAgent,
  missions: MissionRow[],
  departmentMissionTitle: string | null,
  slot: number
): HqAgentLiveState {
  const homeRoom = departmentToHomeRoom(agent.department);
  const mission = resolveMissionForAgent(agent, missions, departmentMissionTitle);

  let workActivity: AgentActivityType = "idle";
  let targetRoom: HqRoomId = homeRoom;
  let missionId: number | null = null;
  let missionStatus: string | null = null;
  let currentMission = agent.currentMission;

  if (mission) {
    workActivity = missionStatusToActivity(mission.status);
    targetRoom = missionStatusToRoom(mission.status);
    missionId = mission.id;
    missionStatus = mission.status;
    currentMission = mission.title;
  }

  if (targetRoom === "command_center") {
    targetRoom = homeRoom;
    workActivity = "idle";
  }

  const isMoving = homeRoom !== targetRoom && workActivity !== "idle";
  const activity: AgentActivityType = isMoving ? "walking" : workActivity;
  const from = getRoomAnchor(homeRoom, slot);
  const to = getRoomAnchor(targetRoom, slot);
  const activityLabel = formatActivityLabel(
    workActivity,
    mission ? missionLabel(mission) : currentMission
  );

  const def = getActivityDefinition(isMoving ? "walking" : workActivity);

  return {
    key: agent.key,
    name: agent.name,
    avatarEmoji: agent.avatarEmoji,
    kind: agent.kind,
    department: agent.department,
    level: agent.level,
    xp: agent.xp,
    score: agent.score,
    profileHref: agent.profileHref,
    homeRoom,
    currentRoom: isMoving ? homeRoom : targetRoom,
    targetRoom,
    activity,
    workActivity,
    activityLabel,
    currentMission,
    missionId,
    missionStatus,
    movementProgress: isMoving ? 0.35 : 1,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    isActive: workActivity !== "idle",
    speed: 1000 / def.duration,
  };
}

function buildActivityFeed(
  agentStates: HqAgentLiveState[],
  missions: MissionRow[]
): HqActivityFeedEntry[] {
  const entries: HqActivityFeedEntry[] = [];

  for (const agent of agentStates) {
    if (agent.workActivity === "idle") continue;

    entries.push({
      id: `agent-${agent.key}`,
      emoji: agent.avatarEmoji,
      agentName: agent.name,
      message: agent.activityLabel,
      activity: agent.workActivity,
      roomId: agent.targetRoom,
      missionId: agent.missionId,
      sortKey: agent.missionId ?? 0,
    });
  }

  for (const mission of missions) {
    if (!ACTIVE_MISSION_STATUSES.has(mission.status)) continue;

    const activity = missionStatusToActivity(mission.status);
    const roomId = missionStatusToRoom(mission.status);
    const emoji =
      roomId === "athena_lab"
        ? "🔎"
        : roomId === "atlas_office"
          ? "👔"
          : roomId === "forge_workshop"
            ? "🔨"
            : roomId === "nova_growth"
              ? "📈"
              : "💰";

    entries.push({
      id: `mission-${mission.id}`,
      emoji,
      agentName: mission.ownerPersona.replace(/_/g, " "),
      message: formatActivityLabel(activity, missionLabel(mission)),
      activity,
      roomId,
      missionId: mission.id,
      sortKey: mission.id,
    });
  }

  const seen = new Set<string>();
  return entries
    .sort((a, b) => b.sortKey - a.sortKey)
    .filter((entry) => {
      const dedupe = `${entry.agentName}:${entry.message}`;
      if (seen.has(dedupe)) return false;
      seen.add(dedupe);
      return true;
    })
    .slice(0, 12);
}

function buildRoomOccupancy(
  agentStates: HqAgentLiveState[]
): Record<HqRoomId, number> {
  const occupancy = Object.fromEntries(
    HQ_ROOMS.map((room) => [room.id, 0])
  ) as Record<HqRoomId, number>;

  for (const agent of agentStates) {
    occupancy[agent.targetRoom] = (occupancy[agent.targetRoom] ?? 0) + 1;
  }

  return occupancy;
}

function buildDepartmentStatus(
  departments: DepartmentRow[],
  occupancy: Record<HqRoomId, number>
): HqDepartmentStatus[] {
  return departments.map((dept) => {
    const homeRoom = departmentToHomeRoom(dept.key);
    const persona = getPersonaForDepartment(dept.key as DepartmentKey);
    const status = dept.currentMissionStatus ?? "idle";

    return {
      departmentKey: dept.key,
      departmentName: dept.name,
      status: ACTIVE_MISSION_STATUSES.has(status) ? status : persona.persona,
      agentCount: occupancy[homeRoom] ?? 0,
      roomOccupancy: occupancy[homeRoom] ?? 0,
      currentMission: dept.currentMissionTitle,
    };
  });
}

async function loadActiveMissions(): Promise<MissionRow[]> {
  const missions = await prisma.mission.findMany({
    where: {
      status: {
        in: Array.from(ACTIVE_MISSION_STATUSES),
      },
    },
    include: {
      department: { select: { key: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    ownerPersona: m.ownerPersona,
    departmentKey: m.department.key,
    updatedAt: m.updatedAt,
  }));
}

async function loadDepartmentContext(): Promise<{
  departments: DepartmentRow[];
  totalMissions: number;
}> {
  const [departments, totalMissions] = await Promise.all([
    prisma.department.findMany({
      include: {
        missions: {
          where: {
            status: { notIn: [MISSION_STATUSES.KILLED] },
          },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { title: true, status: true },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.mission.count(),
  ]);

  return {
    totalMissions,
    departments: departments.map((dept) => ({
      key: dept.key,
      name: dept.name,
      currentMissionTitle: dept.missions[0]?.title ?? null,
      currentMissionStatus: dept.missions[0]?.status ?? null,
    })),
  };
}

/** Read-only live HQ map — agent movement states and activity feed. */
export async function getHqMapLiveState(): Promise<HqMapLiveState> {
  const [baseState, departmentContext, missions] = await Promise.all([
    getHqMapState(),
    loadDepartmentContext(),
    loadActiveMissions(),
  ]);

  const departmentMissionByKey = new Map(
    departmentContext.departments.map((dept) => [dept.key, dept.currentMissionTitle])
  );

  const roomSlotCounter = new Map<HqRoomId, number>();

  const agentStates = baseState.agents.map((agent) => {
    const homeRoom = departmentToHomeRoom(agent.department);
    const slot = roomSlotCounter.get(homeRoom) ?? 0;
    roomSlotCounter.set(homeRoom, slot + 1);

    return computeAgentLiveState(
      agent,
      missions,
      departmentMissionByKey.get(agent.department) ?? null,
      slot
    );
  });

  const roomOccupancy = buildRoomOccupancy(agentStates);
  const activeRoomIds = HQ_ROOMS.filter(
    (room) => (roomOccupancy[room.id] ?? 0) > 0
  ).map((room) => room.id);

  const activityFeed = buildActivityFeed(agentStates, missions);

  const rooms = baseState.rooms.map((room) => ({
    ...room,
    agentCount: roomOccupancy[room.id] ?? 0,
    isActive: activeRoomIds.includes(room.id),
    occupancy: roomOccupancy[room.id] ?? 0,
  }));

  return {
    ...baseState,
    rooms,
    agentStates,
    activityFeed,
    stats: {
      agentCount: agentStates.filter((a) => a.kind === "agent").length,
      scoutCount: agentStates.filter((a) => a.kind === "scout").length,
      missionCount: departmentContext.totalMissions,
      activeMissionCount: missions.length,
    },
    roomOccupancy,
    activeRoomIds,
    departmentStatus: buildDepartmentStatus(
      departmentContext.departments,
      roomOccupancy
    ),
  };
}

export { buildPipelineRoute };

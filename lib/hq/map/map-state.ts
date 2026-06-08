import { getHqSnapshot } from "../queries/hq-dashboard";
import {
  getAgentWorkstationSnapshot,
  getScoutWorkstationSnapshot,
} from "../workstations/workstation-dashboard";
import type { AgentProfile } from "../workstations/agent-profiles";
import type { ScoutProfile } from "../workstations/scout-profiles";
import { positionEntitiesInRoom } from "./agent-positioning";
import {
  getRoomById,
  getRoomForDepartment,
  HQ_ROOMS,
  type HqRoomDefinition,
  type HqRoomId,
} from "./room-registry";

export type HqMapAgentKind = "agent" | "scout";

export type HqMapAgent = {
  key: string;
  name: string;
  department: string;
  level: number;
  xp: number;
  score: number;
  currentMission: string | null;
  avatarEmoji: string;
  roomId: HqRoomId;
  x: number;
  y: number;
  profileHref: string;
  kind: HqMapAgentKind;
};

export type HqMapRoomState = HqRoomDefinition & {
  agentCount: number;
  currentMission: string | null;
};

export type HqMapState = {
  generatedAt: string;
  rooms: HqMapRoomState[];
  agents: HqMapAgent[];
  totals: {
    agents: number;
    scouts: number;
    rooms: number;
  };
};

function agentProfileHref(agentKey: string): string {
  return `/hq/agents/${agentKey}`;
}

function scoutProfileHref(scoutKey: string): string {
  return `/hq/scouts/${scoutKey}`;
}

function missionForAgent(
  agent: AgentProfile,
  departmentMission: string | null
): string | null {
  const recent = agent.recentActivity[0]?.missionTitle;
  if (recent) return recent;
  if (agent.isAggregate && departmentMission) return departmentMission;
  return null;
}

function buildAgentsForRoom(
  room: HqRoomDefinition,
  entities: Array<{
    key: string;
    name: string;
    department: string;
    level: number;
    xp: number;
    score: number;
    currentMission: string | null;
    avatarEmoji: string;
    profileHref: string;
    kind: HqMapAgentKind;
  }>
): HqMapAgent[] {
  const positions = positionEntitiesInRoom(room, entities.length);

  return entities.map((entity, index) => ({
    ...entity,
    roomId: room.id,
    x: positions[index]?.x ?? room.x + room.width / 2,
    y: positions[index]?.y ?? room.y + room.height / 2,
  }));
}

/** Read-only HQ map snapshot — agents, scouts, rooms, static positions. */
export async function getHqMapState(): Promise<HqMapState> {
  const [agentSnapshot, scoutSnapshot, hqSnapshot] = await Promise.all([
    getAgentWorkstationSnapshot(),
    getScoutWorkstationSnapshot(),
    getHqSnapshot(),
  ]);

  const departmentMissionByKey = new Map(
    hqSnapshot.departments.map((dept) => [
      dept.key,
      dept.currentMission?.title ?? null,
    ])
  );

  const mapAgents: HqMapAgent[] = [];

  for (const room of HQ_ROOMS) {
    if (room.id === "command_center") continue;

    if (room.department === "research_lab") {
      const athenaLab = getRoomById("athena_lab");
      const departmentMission =
        departmentMissionByKey.get("research_lab") ?? null;

      const athenaExecutive = agentSnapshot.agents.find(
        (agent) => agent.agentKey === "athena"
      );

      const labEntities = [
        ...(athenaExecutive
          ? [
              {
                key: athenaExecutive.agentKey,
                name: athenaExecutive.name,
                department: athenaExecutive.department,
                level: athenaExecutive.level,
                xp: athenaExecutive.xp,
                score: athenaExecutive.score,
                currentMission: missionForAgent(athenaExecutive, departmentMission),
                avatarEmoji: athenaExecutive.avatarEmoji,
                profileHref: agentProfileHref(athenaExecutive.agentKey),
                kind: "agent" as const,
              },
            ]
          : []),
        ...scoutSnapshot.scouts.map((scout) => scoutToMapEntity(scout, departmentMission)),
      ];

      mapAgents.push(...buildAgentsForRoom(athenaLab, labEntities));
      continue;
    }

    if (!room.department) continue;

    const departmentMission =
      departmentMissionByKey.get(room.department) ?? null;

    const roomAgents = agentSnapshot.agents.filter(
      (agent) => agent.department === room.department
    );

    const entities = roomAgents.map((agent) => ({
      key: agent.agentKey,
      name: agent.name,
      department: agent.department,
      level: agent.level,
      xp: agent.xp,
      score: agent.score,
      currentMission: missionForAgent(agent, departmentMission),
      avatarEmoji: agent.avatarEmoji,
      profileHref: agentProfileHref(agent.agentKey),
      kind: "agent" as const,
    }));

    mapAgents.push(...buildAgentsForRoom(room, entities));
  }

  const rooms: HqMapRoomState[] = HQ_ROOMS.map((room) => {
    const agentsInRoom = mapAgents.filter((agent) => agent.roomId === room.id);
    const departmentMission = room.department
      ? (departmentMissionByKey.get(room.department) ?? null)
      : null;

    return {
      ...room,
      agentCount: agentsInRoom.length,
      currentMission: departmentMission,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    rooms,
    agents: mapAgents,
    totals: {
      agents: mapAgents.filter((agent) => agent.kind === "agent").length,
      scouts: mapAgents.filter((agent) => agent.kind === "scout").length,
      rooms: HQ_ROOMS.length,
    },
  };
}

function scoutToMapEntity(
  scout: ScoutProfile,
  departmentMission: string | null
): {
  key: string;
  name: string;
  department: string;
  level: number;
  xp: number;
  score: number;
  currentMission: string | null;
  avatarEmoji: string;
  profileHref: string;
  kind: HqMapAgentKind;
} {
  return {
    key: scout.scoutKey,
    name: scout.name,
    department: "research_lab",
    level: scout.level,
    xp: scout.xp,
    score: scout.score,
    currentMission: departmentMission,
    avatarEmoji: "🔎",
    profileHref: scoutProfileHref(scout.scoutKey),
    kind: "scout",
  };
}

export { getRoomForDepartment, getRoomById, HQ_ROOMS };

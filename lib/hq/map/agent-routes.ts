import { DEPARTMENT_KEYS } from "../constants";
import { MISSION_STATUSES } from "../constants";
import type { AgentActivityType } from "./activity-registry";
import { getRoomById, type HqRoomId } from "./room-registry";

/** Pipeline order for visual mission routing. */
export const PIPELINE_ROOM_ORDER: HqRoomId[] = [
  "athena_lab",
  "atlas_office",
  "forge_workshop",
  "nova_growth",
  "mercury_treasury",
];

const DEPARTMENT_HOME_ROOM: Record<string, HqRoomId> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: "atlas_office",
  [DEPARTMENT_KEYS.RESEARCH_LAB]: "athena_lab",
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: "forge_workshop",
  [DEPARTMENT_KEYS.GROWTH]: "nova_growth",
  [DEPARTMENT_KEYS.FINANCE]: "mercury_treasury",
};

/** Map mission status to the room where work is visible. */
export function missionStatusToRoom(status: string): HqRoomId {
  switch (status) {
    case MISSION_STATUSES.RESEARCHING:
    case MISSION_STATUSES.VALIDATING:
      return "athena_lab";
    case MISSION_STATUSES.APPROVED:
      return "atlas_office";
    case MISSION_STATUSES.BUILDING:
      return "forge_workshop";
    case MISSION_STATUSES.LAUNCHING:
    case MISSION_STATUSES.GROWING:
      return "nova_growth";
    case MISSION_STATUSES.PROFITABLE:
      return "mercury_treasury";
    default:
      return "command_center";
  }
}

/** Map mission status to agent activity type. */
export function missionStatusToActivity(status: string): AgentActivityType {
  switch (status) {
    case MISSION_STATUSES.RESEARCHING:
    case MISSION_STATUSES.VALIDATING:
      return "researching";
    case MISSION_STATUSES.APPROVED:
      return "reviewing";
    case MISSION_STATUSES.BUILDING:
      return "building";
    case MISSION_STATUSES.LAUNCHING:
    case MISSION_STATUSES.GROWING:
      return "launching";
    case MISSION_STATUSES.PROFITABLE:
      return "analyzing";
    default:
      return "idle";
  }
}

export function departmentToHomeRoom(department: string): HqRoomId {
  return DEPARTMENT_HOME_ROOM[department] ?? "command_center";
}

/** Anchor point inside a room for agent placement / movement endpoints. */
export function getRoomAnchor(roomId: HqRoomId, slot: number): { x: number; y: number } {
  const room = getRoomById(roomId);
  const cols = 3;
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  const paddingX = 36;
  const paddingY = 48;
  const stepX = 56;
  const stepY = 52;

  return {
    x: room.x + paddingX + col * stepX,
    y: room.y + paddingY + row * stepY,
  };
}

/** Ordered pipeline route between two rooms (visual simulation only). */
export function buildPipelineRoute(
  fromRoom: HqRoomId,
  toRoom: HqRoomId
): HqRoomId[] {
  if (fromRoom === toRoom) return [fromRoom];

  const fromIndex = PIPELINE_ROOM_ORDER.indexOf(fromRoom);
  const toIndex = PIPELINE_ROOM_ORDER.indexOf(toRoom);

  if (fromIndex === -1 || toIndex === -1) {
    return [fromRoom, toRoom];
  }

  if (fromIndex < toIndex) {
    return PIPELINE_ROOM_ORDER.slice(fromIndex, toIndex + 1);
  }

  return PIPELINE_ROOM_ORDER.slice(toIndex, fromIndex + 1).reverse();
}

export function roomCenter(roomId: HqRoomId): { x: number; y: number } {
  const room = getRoomById(roomId);
  return {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };
}

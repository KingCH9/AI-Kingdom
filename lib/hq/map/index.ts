export {
  HQ_MAP_WIDTH,
  HQ_MAP_HEIGHT,
  ROOM_INNER_PADDING,
  AGENT_MARKER_SIZE,
} from "./hq-layout";

export {
  HQ_ROOMS,
  getRoomById,
  getRoomForDepartment,
  getDepartmentRooms,
  type HqRoomId,
  type HqRoomDefinition,
} from "./room-registry";

export { positionEntitiesInRoom } from "./agent-positioning";

export {
  getHqMapState,
  type HqMapState,
  type HqMapAgent,
  type HqMapRoomState,
  type HqMapAgentKind,
} from "./map-state";

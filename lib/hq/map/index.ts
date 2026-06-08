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

export {
  ACTIVITY_REGISTRY,
  getActivityDefinition,
  formatActivityLabel,
  type AgentActivityType,
  type ActivityDefinition,
} from "./activity-registry";

export {
  PIPELINE_ROOM_ORDER,
  missionStatusToRoom,
  missionStatusToActivity,
  departmentToHomeRoom,
  getRoomAnchor,
  buildPipelineRoute,
  roomCenter,
} from "./agent-routes";

export {
  getHqMapLiveState,
} from "./activity-engine";

export {
  interpolateAgentPosition,
  walkingBobOffset,
  currentAgentPosition,
} from "./agent-state-utils";

export type {
  HqAgentLiveState,
  HqActivityFeedEntry,
  HqDepartmentStatus,
  HqMapLiveState,
  HqMapAgentWithLive,
  HqMapRoomStateLive,
} from "./agent-state";

export { liveStateToMapAgent } from "./agent-state";

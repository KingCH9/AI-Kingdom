import type { AgentActivityType } from "./activity-registry";
import type { HqMapAgent, HqMapAgentKind, HqMapRoomState, HqMapState } from "./map-state";
import type { HqRoomId } from "./room-registry";

export type HqAgentLiveState = {
  key: string;
  name: string;
  avatarEmoji: string;
  kind: HqMapAgentKind;
  department: string;
  level: number;
  xp: number;
  score: number;
  profileHref: string;
  homeRoom: HqRoomId;
  currentRoom: HqRoomId;
  targetRoom: HqRoomId;
  activity: AgentActivityType;
  workActivity: AgentActivityType;
  activityLabel: string;
  currentMission: string | null;
  missionId: number | null;
  missionStatus: string | null;
  movementProgress: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isActive: boolean;
  speed: number;
};

export type HqActivityFeedEntry = {
  id: string;
  emoji: string;
  agentName: string;
  message: string;
  activity: AgentActivityType;
  roomId: HqRoomId;
  missionId: number | null;
  sortKey: number;
};

export type HqDepartmentStatus = {
  departmentKey: string;
  departmentName: string;
  status: string;
  agentCount: number;
  roomOccupancy: number;
  currentMission: string | null;
};

export type HqMapRoomStateLive = HqMapRoomState & {
  isActive: boolean;
  occupancy: number;
};

export type HqMapAgentWithLive = HqMapAgent & {
  live?: HqAgentLiveState;
};

export type HqMapLiveState = Omit<HqMapState, "rooms"> & {
  rooms: HqMapRoomStateLive[];
  agentStates: HqAgentLiveState[];
  activityFeed: HqActivityFeedEntry[];
  stats: {
    agentCount: number;
    scoutCount: number;
    missionCount: number;
    activeMissionCount: number;
  };
  roomOccupancy: Record<HqRoomId, number>;
  activeRoomIds: HqRoomId[];
  departmentStatus: HqDepartmentStatus[];
};

/** Bridge hover/tooltip data from live state. */
export function liveStateToMapAgent(
  state: HqAgentLiveState,
  progress: number
): HqMapAgentWithLive {
  const t = Math.max(0, Math.min(1, progress));
  return {
    key: state.key,
    name: state.name,
    department: state.department,
    level: state.level,
    xp: state.xp,
    score: state.score,
    currentMission: state.currentMission,
    avatarEmoji: state.avatarEmoji,
    roomId: state.targetRoom,
    x: state.fromX + (state.toX - state.fromX) * t,
    y: state.fromY + (state.toY - state.fromY) * t,
    profileHref: state.profileHref,
    kind: state.kind,
    live: state,
  };
}

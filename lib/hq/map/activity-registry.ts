import type { HqRoomId } from "./room-registry";

export type AgentActivityType =
  | "researching"
  | "reviewing"
  | "building"
  | "launching"
  | "analyzing"
  | "idle"
  | "walking";

export type ActivityDefinition = {
  activity: AgentActivityType;
  room: HqRoomId | null;
  label: string;
  duration: number;
};

/** Activity metadata — room target, display label, animation duration (ms). */
export const ACTIVITY_REGISTRY: Record<AgentActivityType, ActivityDefinition> = {
  researching: {
    activity: "researching",
    room: "athena_lab",
    label: "Researching opportunities",
    duration: 4000,
  },
  reviewing: {
    activity: "reviewing",
    room: "atlas_office",
    label: "Reviewing mission",
    duration: 3500,
  },
  building: {
    activity: "building",
    room: "forge_workshop",
    label: "Building mission",
    duration: 4500,
  },
  launching: {
    activity: "launching",
    room: "nova_growth",
    label: "Launching campaign",
    duration: 4000,
  },
  analyzing: {
    activity: "analyzing",
    room: "mercury_treasury",
    label: "Analyzing ROI",
    duration: 3800,
  },
  idle: {
    activity: "idle",
    room: null,
    label: "Standing by",
    duration: 6000,
  },
  walking: {
    activity: "walking",
    room: null,
    label: "Moving between departments",
    duration: 3000,
  },
};

export function getActivityDefinition(
  activity: AgentActivityType
): ActivityDefinition {
  return ACTIVITY_REGISTRY[activity];
}

export function formatActivityLabel(
  activity: AgentActivityType,
  missionLabel?: string | null
): string {
  const def = ACTIVITY_REGISTRY[activity];
  if (missionLabel && activity !== "idle" && activity !== "walking") {
    return `${def.label} — ${missionLabel}`;
  }
  return def.label;
}

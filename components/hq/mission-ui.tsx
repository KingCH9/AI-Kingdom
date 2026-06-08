import { MISSION_STATUSES } from "@/lib/hq/constants";

export function missionStatusBadgeClass(status: string): string {
  switch (status) {
    case MISSION_STATUSES.PROFITABLE:
    case MISSION_STATUSES.GROWING:
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case MISSION_STATUSES.KILLED:
    case MISSION_STATUSES.BLOCKED:
      return "bg-red-500/20 text-red-300 border-red-500/40";
    case MISSION_STATUSES.BUILDING:
    case MISSION_STATUSES.LAUNCHING:
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    case MISSION_STATUSES.APPROVED:
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case MISSION_STATUSES.VALIDATING:
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    default:
      return "bg-gray-500/20 text-gray-300 border-gray-600";
  }
}

export function MissionStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border capitalize inline-block ${missionStatusBadgeClass(status)}`}
    >
      {status}
    </span>
  );
}

export function missionEventActionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

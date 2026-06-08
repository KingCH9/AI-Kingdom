import type { HqMapAgent } from "@/lib/hq/map";

type HqTooltipProps = {
  agent: HqMapAgent | null;
  x: number;
  y: number;
};

export function HqTooltip({ agent, x, y }: HqTooltipProps) {
  if (!agent) return null;

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-xs rounded-lg border border-gray-600 bg-gray-950/95 p-3 text-xs shadow-xl"
      style={{
        left: Math.max(8, x + 12),
        top: Math.max(8, y - 8),
      }}
    >
      <p className="font-semibold text-sm text-white">
        {agent.avatarEmoji} {agent.name}
      </p>
      <p className="text-gray-400 mt-1 capitalize">
        {agent.kind === "scout" ? "Scout" : "Agent"} · {agent.department.replace(/_/g, " ")}
      </p>
      <p className="text-gray-300 mt-1">
        Level {agent.level} · {agent.xp} XP · Score {agent.score}
      </p>
      {agent.currentMission && (
        <p className="text-gray-500 mt-2 line-clamp-2">
          Mission: {agent.currentMission}
        </p>
      )}
      <p className="text-blue-400 mt-2">Click to open profile →</p>
    </div>
  );
}

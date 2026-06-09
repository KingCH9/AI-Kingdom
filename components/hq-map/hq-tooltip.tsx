import type { HqAgentLiveState } from "@/lib/hq/map/agent-state";

type HqTooltipProps = {
  agent: HqAgentLiveState | null;
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
      <p className="font-semibold text-sm text-white">{agent.name}</p>
      <p className="text-gray-300 mt-1">
        Level {agent.level} · {agent.xp.toLocaleString()} XP · Score {agent.score}
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-cyan-500"
          style={{ width: `${agent.xpProgressPercent}%` }}
        />
      </div>
      <p className="text-gray-400 mt-1 capitalize">
        {agent.kind === "scout" ? "Scout" : "Agent"} ·{" "}
        {agent.department.replace(/_/g, " ")}
      </p>
      {agent.currentMission && (
        <p className="text-gray-500 mt-2 line-clamp-2">
          Mission: {agent.currentMission}
        </p>
      )}
      <div className="mt-2 pt-2 border-t border-gray-800">
        <p className="text-gray-500">Activity</p>
        <p className="text-cyan-300 capitalize">{agent.activityLabel}</p>
        {agent.missionStatus && (
          <>
            <p className="text-gray-500 mt-2">Status</p>
            <p className="text-gray-300 capitalize">{agent.missionStatus}</p>
          </>
        )}
      </div>
      {agent.unlockedAchievementCount > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-800">
          <p className="text-gray-500">
            Achievements · {agent.unlockedAchievementCount} unlocked
          </p>
          <ul className="mt-1 space-y-0.5 text-amber-300">
            {agent.achievementLabels.slice(0, 3).map((label) => (
              <li key={label}>🏆 {label}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-blue-400 mt-2">Click to open profile →</p>
    </div>
  );
}

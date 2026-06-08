import type { HqDepartmentStatus, HqMapLiveState } from "@/lib/hq/map/agent-state";

type ActivityPanelProps = {
  state: HqMapLiveState;
};

export function ActivityPanel({ state }: ActivityPanelProps) {
  return (
    <aside className="rounded-2xl border border-gray-700 bg-gray-900 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-300">HQ Overview</h2>
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-gray-500">Agents</p>
            <p className="text-lg font-bold">{state.stats.agentCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-gray-500">Scouts</p>
            <p className="text-lg font-bold">{state.stats.scoutCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-gray-500">Missions</p>
            <p className="text-lg font-bold">{state.stats.missionCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
            <p className="text-gray-500">Active</p>
            <p className="text-lg font-bold text-emerald-400">
              {state.stats.activeMissionCount}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          Room Occupancy
        </h3>
        <ul className="space-y-1.5 text-xs">
          {state.rooms
            .filter((room) => room.id !== "command_center")
            .map((room) => (
              <li
                key={room.id}
                className={`flex justify-between p-2 rounded-lg border ${
                  room.isActive
                    ? "border-cyan-500/40 bg-cyan-950/20"
                    : "border-gray-800 bg-gray-950"
                }`}
              >
                <span>
                  {room.emoji} {room.name}
                </span>
                <span className="text-gray-400">{room.occupancy}</span>
              </li>
            ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          Department Status
        </h3>
        <ul className="space-y-1.5 text-xs">
          {state.departmentStatus.map((dept: HqDepartmentStatus) => (
            <li
              key={dept.departmentKey}
              className="p-2 rounded-lg border border-gray-800 bg-gray-950"
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{dept.departmentName}</span>
                <span className="text-gray-500 capitalize">{dept.status}</span>
              </div>
              {dept.currentMission && (
                <p className="text-gray-500 mt-1 line-clamp-1">{dept.currentMission}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

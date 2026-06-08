import type { HqActivityFeedEntry } from "@/lib/hq/map/agent-state";

type LiveFeedProps = {
  entries: HqActivityFeedEntry[];
};

export function LiveFeed({ entries }: LiveFeedProps) {
  return (
    <aside className="rounded-2xl border border-gray-700 bg-gray-900 p-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">Live HQ Activity</h2>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-500">No active operations right now.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="p-2.5 rounded-lg border border-gray-800 bg-gray-950 text-xs"
            >
              <p className="text-gray-200">
                <span className="mr-1">{entry.emoji}</span>
                <span className="font-medium">{entry.agentName}</span>{" "}
                <span className="text-gray-400">{entry.message}</span>
              </p>
              {entry.missionId != null && (
                <p className="text-gray-600 mt-1 capitalize">
                  Mission #{entry.missionId} · {entry.activity.replace(/_/g, " ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-gray-600 mt-3">
        Read-only feed — reflects current mission states. No mutations.
      </p>
    </aside>
  );
}

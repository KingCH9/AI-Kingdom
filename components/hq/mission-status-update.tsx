"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateMissionAction } from "@/app/actions/hq-mutations";
import { MISSION_STATUSES, type MissionStatus } from "@/lib/hq/constants";

const ALL_STATUSES = Object.values(MISSION_STATUSES);

export function MissionStatusUpdate({
  missionId,
  currentStatus,
}: {
  missionId: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyStatus(next: MissionStatus) {
    setLoading(true);
    setError(null);

    const result = await updateMissionAction({
      missionId,
      status: next,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Update failed");
      return;
    }

    setStatus(next);
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">Update status</p>
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading || s === status}
            onClick={() => applyStatus(s)}
            className={`text-xs px-2 py-1 rounded capitalize border disabled:opacity-40 ${
              s === status
                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeMissionTaskAction } from "@/app/actions/hq-mutations";

export function MissionTaskCompleteButton({
  missionId,
  taskId,
  taskTitle,
  status,
}: {
  missionId: number;
  taskId: number;
  taskTitle: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "completed") {
    return (
      <span className="text-xs text-emerald-400 capitalize">completed</span>
    );
  }

  async function complete() {
    setLoading(true);
    setError(null);

    const result = await completeMissionTaskAction({ missionId, taskId });

    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Failed to complete task");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={complete}
        disabled={loading}
        className="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50"
      >
        {loading ? "..." : "Complete"}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1" title={taskTitle}>
          {error}
        </p>
      )}
    </div>
  );
}

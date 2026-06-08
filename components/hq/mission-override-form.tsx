"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateMissionAction } from "@/app/actions/hq-mutations";

export function MissionOverrideForm({
  missionId,
  humanOverride,
  overrideReason,
}: {
  missionId: number;
  humanOverride: boolean;
  overrideReason: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(humanOverride);
  const [reason, setReason] = useState(overrideReason ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await updateMissionAction({
      missionId,
      humanOverride: enabled,
      overrideReason: reason.trim() || null,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Override update failed");
      return;
    }

    setMessage("Override saved — MissionEvent logged.");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="rounded"
        />
        Enable human override
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Override reason (required when enabling)"
        rows={3}
        className="w-full px-3 py-2 rounded bg-gray-950 border border-gray-700 text-sm"
      />
      <button
        type="button"
        onClick={save}
        disabled={loading || (enabled && !reason.trim())}
        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Override"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {message && <p className="text-emerald-400 text-sm">{message}</p>}
    </div>
  );
}

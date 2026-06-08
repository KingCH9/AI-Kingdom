"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMissionFromScoutAction } from "@/app/actions/hq-mutations";

type ScoutOption = {
  key: string;
  displayName: string;
  ventureTypeKey: string;
};

export function GenerateFromScoutForm({ scouts }: { scouts: ScoutOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const scoutKey = String(form.get("scoutKey") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();

    const result = await createMissionFromScoutAction({
      scoutKey,
      title: title || undefined,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Failed to generate from scout");
      return;
    }

    router.push(`/hq/missions/${result.missionId}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold text-sm"
      >
        Generate From Scout
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-indigo-700/40 bg-gray-900 p-5 space-y-4 mb-6 w-full"
    >
      <h3 className="font-semibold">Athena Opportunity Factory</h3>
      <p className="text-xs text-gray-500">
        Manual scout trigger — generates an HQ opportunity and mission. No autonomous
        execution.
      </p>
      <label className="block text-sm">
        <span className="text-gray-400">Scout</span>
        <select
          name="scoutKey"
          required
          className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
        >
          {scouts.map((scout) => (
            <option key={scout.key} value={scout.key}>
              {scout.displayName} ({scout.ventureTypeKey})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-gray-400">Custom mission title (optional)</span>
        <input
          name="title"
          className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          placeholder="Leave blank to auto-generate"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Mission"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg bg-gray-800 text-sm"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}

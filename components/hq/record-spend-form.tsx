"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordSpendAction } from "@/app/actions/hq-mutations";

type DepartmentOption = { id: number; name: string };

export function RecordSpendForm({
  departments,
  defaultMissionId,
}: {
  departments: DepartmentOption[];
  defaultMissionId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const departmentId = Number(form.get("departmentId"));
    const amount = Number(form.get("amount"));
    const reason = String(form.get("reason") ?? "").trim();
    const missionIdRaw = String(form.get("missionId") ?? "").trim();
    const missionId = missionIdRaw ? Number(missionIdRaw) : undefined;

    const result = await recordSpendAction({
      departmentId,
      amount,
      reason,
      missionId,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Failed to record spend");
      return;
    }

    setMessage(
      `Recorded ${amount.toFixed(2)} GBP — budget spent now ${result.budget?.spentGbp.toFixed(2)} GBP`
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4"
    >
      <h3 className="font-semibold">Record Department Spend</h3>
      <p className="text-xs text-gray-500">
        Observation only — no budget enforcement. Updates Budget.spentGbp and logs a
        MissionEvent when a mission is linked.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-gray-400">Department</span>
          <select
            name="departmentId"
            required
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-400">Amount (GBP)</span>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-gray-400">Reason</span>
          <input
            name="reason"
            required
            placeholder="e.g. Claude API usage for validation batch"
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400">Mission ID (optional)</span>
          <input
            name="missionId"
            type="number"
            min={1}
            defaultValue={defaultMissionId}
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Recording..." : "Record Spend"}
      </button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {message && <p className="text-emerald-400 text-sm">{message}</p>}
    </form>
  );
}

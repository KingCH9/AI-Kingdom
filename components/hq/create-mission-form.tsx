"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMissionAction } from "@/app/actions/hq-mutations";
import { MISSION_STATUSES, REVENUE_STREAMS_TIER1 } from "@/lib/hq/constants";

type DepartmentOption = { id: number; key: string; name: string };

export function CreateMissionForm({
  departments,
}: {
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const departmentId = Number(form.get("departmentId"));
    const ownerPersona = String(form.get("ownerPersona") ?? "").trim();
    const revenueStream = String(form.get("revenueStream") ?? "shopify");
    const opportunityIdRaw = String(form.get("opportunityId") ?? "").trim();
    const opportunityId = opportunityIdRaw ? Number(opportunityIdRaw) : undefined;

    const result = await createMissionAction({
      title,
      description: description || undefined,
      departmentId,
      ownerPersona,
      revenueStream,
      opportunityId,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Failed to create mission");
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
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-sm"
      >
        + New Mission
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-4 mb-6"
    >
      <h3 className="font-semibold">Create Mission</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-gray-400">Title</span>
          <input
            name="title"
            required
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          />
        </label>
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
          <span className="text-gray-400">Owner persona</span>
          <select
            name="ownerPersona"
            required
            defaultValue="athena"
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          >
            <option value="atlas">Atlas</option>
            <option value="athena">Athena</option>
            <option value="forge">Forge</option>
            <option value="nova">Nova</option>
            <option value="mercury">Mercury</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-400">Revenue stream</span>
          <select
            name="revenueStream"
            defaultValue="shopify"
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          >
            {REVENUE_STREAMS_TIER1.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="text-gray-400">Description</span>
          <textarea
            name="description"
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400">Opportunity ID (optional)</span>
          <input
            name="opportunityId"
            type="number"
            min={1}
            className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          />
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Mission"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <p className="text-xs text-gray-500">
        Initial status: {MISSION_STATUSES.RESEARCHING}
      </p>
    </form>
  );
}

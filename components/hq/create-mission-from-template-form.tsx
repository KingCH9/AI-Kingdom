"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createMissionFromTemplateAction } from "@/app/actions/hq-mutations";

type TemplateOption = {
  id: number;
  key: string;
  name: string;
  ventureTypeName: string;
};

export function CreateMissionFromTemplateForm({
  templates,
}: {
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const templateId = Number(form.get("templateId"));
    const title = String(form.get("title") ?? "").trim();

    const result = await createMissionFromTemplateAction({
      templateId,
      title: title || undefined,
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
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 font-semibold text-sm"
      >
        + From Template
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-purple-700/40 bg-gray-900 p-5 space-y-4 mb-6"
    >
      <h3 className="font-semibold">Create Mission from Template</h3>
      <label className="block text-sm">
        <span className="text-gray-400">Venture template</span>
        <select
          name="templateId"
          required
          className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.ventureTypeName})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-gray-400">Custom title (optional)</span>
        <input
          name="title"
          className="mt-1 w-full px-3 py-2 rounded bg-gray-950 border border-gray-700"
          placeholder="Leave blank to use template name"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? "Creating..." : "Launch Venture Mission"}
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

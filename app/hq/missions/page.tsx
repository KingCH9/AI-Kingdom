import Link from "next/link";
import { CreateMissionForm } from "@/components/hq/create-mission-form";
import { CreateMissionFromTemplateForm } from "@/components/hq/create-mission-from-template-form";
import { MissionStatusBadge } from "@/components/hq/mission-ui";
import { MISSION_STATUSES } from "@/lib/hq/constants";
import { listVentureTemplates } from "@/lib/hq/missions/create-from-template";
import { listMissions } from "@/lib/hq/missions/mission-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = Object.values(MISSION_STATUSES);

export default async function MissionBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; department?: string }>;
}) {
  const params = await searchParams;
  const status = params.status?.trim() || undefined;
  const department = params.department?.trim() || undefined;

  const [missions, departments, templates] = await Promise.all([
    listMissions({ status, department }),
    prisma.department.findMany({ orderBy: { id: "asc" } }),
    listVentureTemplates(),
  ]);

  function filterHref(next: { status?: string; department?: string }) {
    const q = new URLSearchParams();
    const s = next.status ?? status;
    const d = next.department ?? department;
    if (s) q.set("status", s);
    if (d) q.set("department", d);
    const qs = q.toString();
    return qs ? `/hq/missions?${qs}` : "/hq/missions";
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/hq"
            className="text-blue-400 hover:underline text-sm mb-2 inline-block"
          >
            ← HQ
          </Link>
          <h1 className="text-4xl font-bold mb-2">Mission Board</h1>
          <p className="text-gray-400 max-w-2xl">
            CRUD mission control — filters, detail views, human overrides, and
            constitution warnings (soft mode).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateMissionForm departments={departments} />
          <CreateMissionFromTemplateForm
            templates={templates.map((t) => ({
              id: t.id,
              key: t.key,
              name: t.name,
              ventureTypeName: t.ventureType.name,
            }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href={filterHref({ status: undefined })}
          className={`text-xs px-3 py-1 rounded-full border ${
            !status ? "border-blue-500 text-blue-300" : "border-gray-700 text-gray-400"
          }`}
        >
          All statuses
        </Link>
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={filterHref({ status: s })}
            className={`text-xs px-3 py-1 rounded-full border capitalize ${
              status === s
                ? "border-blue-500 text-blue-300"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href={filterHref({ department: undefined })}
          className={`text-xs px-3 py-1 rounded-full border ${
            !department ? "border-purple-500 text-purple-300" : "border-gray-700 text-gray-400"
          }`}
        >
          All departments
        </Link>
        {departments.map((d) => (
          <Link
            key={d.key}
            href={filterHref({ department: d.key })}
            className={`text-xs px-3 py-1 rounded-full border ${
              department === d.key
                ? "border-purple-500 text-purple-300"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {d.name}
          </Link>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {missions.length} mission{missions.length === 1 ? "" : "s"}
      </p>

      {missions.length === 0 ? (
        <p className="text-gray-500">No missions match these filters.</p>
      ) : (
        <>
          <div className="hidden lg:block rounded-xl border border-gray-700 overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left p-3">Mission</th>
                  <th className="text-left p-3">Department</th>
                  <th className="text-left p-3">Owner</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Revenue Stream</th>
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {missions.map((mission) => (
                  <tr key={mission.id} className="border-t border-gray-800 hover:bg-gray-900/50">
                    <td className="p-3">
                      <Link
                        href={`/hq/missions/${mission.id}`}
                        className="font-medium text-blue-300 hover:underline"
                      >
                        {mission.title}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-400">{mission.department.name}</td>
                    <td className="p-3 capitalize text-gray-400">
                      {mission.ownerPersona}
                    </td>
                    <td className="p-3">
                      <MissionStatusBadge status={mission.status} />
                    </td>
                    <td className="p-3 text-gray-400 capitalize">
                      {mission.revenueStream}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {mission.createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {mission.updatedAt.toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-4 lg:hidden">
            {missions.map((mission) => (
              <Link
                key={mission.id}
                href={`/hq/missions/${mission.id}`}
                className="block rounded-xl border border-gray-700 bg-gray-900 p-4 hover:border-gray-500"
              >
                <div className="flex justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-sm">{mission.title}</h2>
                  <MissionStatusBadge status={mission.status} />
                </div>
                <p className="text-xs text-gray-500 capitalize">
                  {mission.department.name} · {mission.ownerPersona} ·{" "}
                  {mission.revenueStream}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

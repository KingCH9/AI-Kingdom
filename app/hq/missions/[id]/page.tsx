import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionOverrideForm } from "@/components/hq/mission-override-form";
import { MissionStatusUpdate } from "@/components/hq/mission-status-update";
import { MissionTaskCompleteButton } from "@/components/hq/mission-task-complete-button";
import {
  MissionStatusBadge,
  missionEventActionLabel,
} from "@/components/hq/mission-ui";
import { formatGbp } from "@/components/hq/finance-ui";
import { getMissionById } from "@/lib/hq/missions/mission-service";
import { getMissionCostById } from "@/lib/hq/finance/cost-aggregation";

export const dynamic = "force-dynamic";

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const missionId = Number(id);

  if (Number.isNaN(missionId)) {
    notFound();
  }

  const mission = await getMissionById(missionId);
  if (!mission) {
    notFound();
  }

  const missionCostGbp = await getMissionCostById(missionId);

  const completedTasks = mission.missionTasks.filter(
    (t) => t.status === "completed"
  ).length;
  const progress =
    mission.missionTasks.length > 0
      ? Math.round((completedTasks / mission.missionTasks.length) * 100)
      : 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/hq/missions"
          className="text-blue-400 hover:underline text-sm"
        >
          ← Mission Board
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-3">{mission.title}</h1>
          <MissionStatusBadge status={mission.status} />
          {mission.humanOverride && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full border border-amber-500/50 text-amber-300">
              override active
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 text-right">
          <p>Created {mission.createdAt.toLocaleString("en-GB")}</p>
          <p>Updated {mission.updatedAt.toLocaleString("en-GB")}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-xl border border-gray-700 bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-4">Mission Overview</h2>
            {mission.description ? (
              <p className="text-gray-300 text-sm mb-4">{mission.description}</p>
            ) : (
              <p className="text-gray-600 text-sm mb-4">No description.</p>
            )}
            <dl className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Department</dt>
                <dd>{mission.department.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Owner</dt>
                <dd className="capitalize">{mission.ownerPersona}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Revenue stream</dt>
                <dd className="capitalize">{mission.revenueStream}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Venture type</dt>
                <dd className="capitalize">
                  {mission.ventureType?.name ?? mission.revenueStream}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Template</dt>
                <dd>{mission.ventureTemplate?.name ?? "—"}</dd>
              </div>
              {mission.opportunity?.category?.startsWith("hq_scout:") && (
                <div>
                  <dt className="text-gray-500">Scout source</dt>
                  <dd className="capitalize">
                    {mission.opportunity.category.replace("hq_scout:", "").replace(/_/g, " ")}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Target ROI</dt>
                <dd>
                  {mission.targetRoi != null ? `${mission.targetRoi}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Approved</dt>
                <dd>
                  {mission.approvedAt
                    ? `${mission.approvedBy ?? "atlas"} · ${mission.approvedAt.toLocaleDateString("en-GB")}`
                    : "Not approved"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Est. cost</dt>
                <dd>{formatGbp(mission.estimatedCostGbp, 2)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Actual cost (events)</dt>
                <dd>{formatGbp(missionCostGbp, 2)}</dd>
              </div>
            </dl>
            <div className="mt-6 pt-4 border-t border-gray-800">
              <MissionStatusUpdate
                missionId={mission.id}
                currentStatus={mission.status}
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-700 bg-gray-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Mission Tasks</h2>
              <span className="text-sm text-gray-400">
                {completedTasks}/{mission.missionTasks.length} · {progress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 mb-4 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="space-y-3">
              {mission.missionTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-gray-950 border border-gray-800"
                >
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {task.phase} · {task.ownerPersona}
                      {task.legacyTaskId
                        ? ` · legacy #${task.legacyTaskId}`
                        : ""}
                    </p>
                  </div>
                  <MissionTaskCompleteButton
                    missionId={mission.id}
                    taskId={task.id}
                    taskTitle={task.title}
                    status={task.status}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-gray-700 bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-4">Activity Timeline</h2>
            {mission.events.length === 0 ? (
              <p className="text-gray-500 text-sm">No events yet.</p>
            ) : (
              <ul className="space-y-3">
                {mission.events.map((event) => (
                  <li
                    key={event.id}
                    className="border-l-2 border-gray-700 pl-4 py-1"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{event.createdAt.toLocaleString("en-GB")}</span>
                      {event.agentPersona && (
                        <span className="capitalize">{event.agentPersona}</span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 capitalize">
                        {missionEventActionLabel(event.action)}
                      </span>
                      {event.estimatedCostGbp > 0 && (
                        <span>{formatMoney(event.estimatedCostGbp)}</span>
                      )}
                    </div>
                    {event.detail && (
                      <p className="text-sm text-gray-300 mt-1">{event.detail}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-gray-700 bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-4">Linked Assets</h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs mb-1">Opportunity</p>
                {mission.opportunity ? (
                  <Link
                    href={`/opportunities/${mission.opportunity.id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {mission.opportunity.productName}
                  </Link>
                ) : (
                  <p className="text-gray-600">None linked</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Store</p>
                {mission.store ? (
                  <Link
                    href={`/stores/${mission.store.id}`}
                    className="text-blue-400 hover:underline"
                  >
                    {mission.store.name}
                  </Link>
                ) : (
                  <p className="text-gray-600">None linked</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-amber-700/40 bg-gray-900 p-5">
            <h2 className="text-lg font-bold mb-2">Human Override</h2>
            <p className="text-xs text-gray-500 mb-4">
              Soft-mode only — logs a MissionEvent, never blocks pipeline actions.
            </p>
            <MissionOverrideForm
              missionId={mission.id}
              humanOverride={mission.humanOverride}
              overrideReason={mission.overrideReason}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

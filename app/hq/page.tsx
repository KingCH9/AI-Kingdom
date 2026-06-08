import Link from "next/link";
import { getHqSnapshot } from "@/lib/hq/queries/hq-dashboard";
import type { HqAgentStatus } from "@/lib/hq/constants";

export const dynamic = "force-dynamic";

function statusBadgeClass(status: HqAgentStatus): string {
  switch (status) {
    case "active":
    case "launching":
    case "building":
    case "researching":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "blocked":
      return "bg-red-500/20 text-red-300 border-red-500/40";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-600";
  }
}

function missionStatusClass(status: string): string {
  if (status === "profitable" || status === "growing") {
    return "text-emerald-400";
  }
  if (status === "killed" || status === "blocked") {
    return "text-red-400";
  }
  if (status === "building" || status === "launching") {
    return "text-amber-400";
  }
  return "text-blue-300";
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function HqPage() {
  const hq = await getHqSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-bold mb-2">🏛️ AI-Kingdom HQ</h1>
          <p className="text-gray-400 max-w-2xl">
            Virtual company headquarters — five departments, mission-driven
            execution. The Empire Pipeline runs beneath; agents coordinate through
            missions, not chat.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>Live snapshot</p>
          <p>{new Date(hq.generatedAt).toLocaleString("en-GB")}</p>
          <Link href="/" className="text-blue-400 hover:underline mt-2 inline-block">
            ← Empire Command Centre
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Missions</p>
          <p className="text-2xl font-bold">{hq.totals.missions}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Revenue</p>
          <p className="text-2xl font-bold text-green-400">
            {formatMoney(hq.totals.totalRevenue)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">CEO Queue</p>
          <p className="text-2xl font-bold">{hq.pipelineHealth.ceoQueue}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Validator Queue</p>
          <p className="text-2xl font-bold">{hq.pipelineHealth.validatorQueue}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Active Tasks</p>
          <p className="text-2xl font-bold">{hq.pipelineHealth.activeTasks}</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Departments</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {hq.departments.map((dept) => (
            <article
              key={dept.key}
              className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    {dept.name}
                  </p>
                  <p className="text-xl font-bold flex items-center gap-2 mt-1">
                    <span>{dept.primaryAgent.avatarEmoji}</span>
                    {dept.primaryAgent.displayName}
                  </p>
                  <p className="text-sm text-gray-400">{dept.primaryAgent.title}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border capitalize ${statusBadgeClass(dept.primaryAgent.status)}`}
                >
                  {dept.primaryAgent.status}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {dept.description}
              </p>

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Current mission</p>
                {dept.currentMission ? (
                  <p className="text-sm font-medium">
                    {dept.currentMission.title}
                    <span
                      className={`ml-2 text-xs capitalize ${missionStatusClass(dept.currentMission.status)}`}
                    >
                      {dept.currentMission.status}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">No active mission</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-gray-500">Workload</p>
                  <p>
                    {dept.workload.active} active · {dept.workload.blocked} blocked
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Budget</p>
                  <p>
                    {formatMoney(dept.budget.spent)} / {formatMoney(dept.budget.allocated)}
                  </p>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(dept.budget.percentUsed, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {dept.primaryAgent.subAgents.slice(0, 4).map((sub) => (
                  <span
                    key={sub}
                    className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Mission Board</h2>
          {hq.missionBoard.length === 0 ? (
            <p className="text-gray-500">
              No missions yet. Bootstrap runs on startup from existing opportunities.
            </p>
          ) : (
            <div className="rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 text-gray-400">
                  <tr>
                    <th className="text-left p-3">Mission</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Owner</th>
                    <th className="text-left p-3">Store</th>
                    <th className="text-right p-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {hq.missionBoard.map((mission) => (
                    <tr key={mission.id} className="border-t border-gray-800">
                      <td className="p-3 font-medium">{mission.title}</td>
                      <td className={`p-3 capitalize ${missionStatusClass(mission.status)}`}>
                        {mission.status}
                      </td>
                      <td className="p-3 capitalize text-gray-400">
                        {mission.ownerPersona}
                      </td>
                      <td className="p-3 text-gray-400">
                        {mission.storeName ?? "—"}
                      </td>
                      <td className="p-3 text-right text-green-400">
                        {formatMoney(mission.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Constitution</h2>
          <ul className="space-y-3">
            {hq.constitution.map((rule) => (
              <li
                key={rule.key}
                className="p-4 rounded-xl border border-gray-700 bg-gray-900"
              >
                <p className="font-semibold text-sm">{rule.title}</p>
                <p className="text-xs text-gray-400 mt-1">{rule.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

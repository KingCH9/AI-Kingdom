import Link from "next/link";
import { getHqSnapshot } from "@/lib/hq/queries/hq-dashboard";
import { BudgetUsageBar, formatGbp } from "@/components/hq/finance-ui";
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
          <h1 className="text-4xl font-bold mb-2">🏛️ AI-Kingdom HQ</h1>
          <p className="text-gray-400 max-w-2xl">
            Company headquarters — departments, missions, and advisory engines in one
            view. Drill into Empire, Mercury, or any engine from the sidebar.
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

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <section className="p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-gray-900 to-gray-950">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold">👑 Empire Score</h2>
              <p className="text-xs text-gray-500 mt-1">
                {hq.empireSummary.activeVentures} active ·{" "}
                {hq.empireSummary.launchReadyCount} launch ready
              </p>
            </div>
            <Link href="/hq/empire" className="text-xs text-blue-400 hover:underline shrink-0">
              Details →
            </Link>
          </div>
          <p className="text-5xl font-bold text-purple-300 text-center">
            {hq.empireSummary.score}
          </p>
          {hq.empireSummary.topStrength && (
            <p className="text-xs text-gray-500 mt-3 text-center line-clamp-2">
              {hq.empireSummary.topStrength}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
              <p className="text-gray-500">Top agent</p>
              <p className="font-medium truncate capitalize">
                {hq.empireSummary.topAgent?.agentKey.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-gray-950 border border-gray-800">
              <p className="text-gray-500">Top dept</p>
              <p className="font-medium truncate">
                {hq.empireSummary.topDepartment?.departmentName ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 p-6 rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold">💰 Mercury</h2>
              <p className="text-xs text-gray-500">
                Period {hq.finance.periodMonth} · {formatGbp(hq.finance.totalSpent)} spent of{" "}
                {formatGbp(hq.finance.totalAllocated)}
              </p>
            </div>
            <Link href="/hq/mercury" className="text-xs text-blue-400 hover:underline">
              Mercury →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase">Portfolio</p>
              <p className="text-xl font-bold">{hq.mercurySummary.portfolioHealthScore}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase">Net profit</p>
              <p
                className={`text-xl font-bold ${hq.mercurySummary.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {formatGbp(hq.mercurySummary.netProfit)}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase">Monthly rev</p>
              <p className="text-xl font-bold text-green-400">
                {formatGbp(hq.raeSummary.monthlyRevenueGbp)}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase">Profitable</p>
              <p className="text-xl font-bold">{hq.mercurySummary.profitableMissions}</p>
            </div>
          </div>
          <BudgetUsageBar percent={hq.finance.usagePercent} />
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Advisory Engines</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/hq/atlas"
            className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
          >
            <p className="text-xs text-gray-500">👔 Atlas</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {hq.atlasSummary.topPriorityScore}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.atlasSummary.fundRecommendations} fund ·{" "}
              {hq.atlasSummary.killRecommendations} kill
            </p>
          </Link>
          <Link
            href="/hq/revenue"
            className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
          >
            <p className="text-xs text-gray-500">📈 Revenue</p>
            <p className="text-2xl font-bold text-green-400 mt-1">
              {formatGbp(hq.raeSummary.monthlyRevenueGbp)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.raeSummary.scaleRecommendations} scale recs
            </p>
          </Link>
          <Link
            href="/hq/capital"
            className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
          >
            <p className="text-xs text-gray-500">💷 Capital</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {hq.caeSummary.portfolioCapitalScore}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.caeSummary.fundCount + hq.caeSummary.fundAggressivelyCount} fund recs
            </p>
          </Link>
          <Link
            href="/hq/ventures"
            className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
          >
            <p className="text-xs text-gray-500">🚀 Scaling</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {hq.vseSummary.portfolioScalingScore}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.vseSummary.scaleNowCount} scale now
            </p>
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold">🏆 Top Performers</h2>
          <div className="flex gap-3 text-xs">
            <Link href="/hq/agents" className="text-blue-400 hover:underline">
              Agents →
            </Link>
            <Link href="/hq/scouts" className="text-blue-400 hover:underline">
              Scouts →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href={
              hq.topPerformersSummary.topAgent
                ? `/hq/agents/${hq.topPerformersSummary.topAgent.agentKey}`
                : "/hq/agents"
            }
            className="p-4 rounded-xl border border-amber-500/30 bg-gray-900 hover:border-amber-500/50 block"
          >
            <p className="text-[10px] text-gray-500 uppercase">#1 Agent</p>
            <p className="text-sm font-bold truncate">
              {hq.topPerformersSummary.topAgent?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.topPerformersSummary.topAgent?.score ?? 0} · L
              {hq.topPerformersSummary.topAgent?.level ?? 0}
            </p>
          </Link>
          <Link
            href={
              hq.topPerformersSummary.topScout
                ? `/hq/scouts/${hq.topPerformersSummary.topScout.scoutKey}`
                : "/hq/scouts"
            }
            className="p-4 rounded-xl border border-emerald-500/30 bg-gray-900 hover:border-emerald-500/50 block"
          >
            <p className="text-[10px] text-gray-500 uppercase">#1 Scout</p>
            <p className="text-sm font-bold truncate">
              {hq.topPerformersSummary.topScout?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.topPerformersSummary.topScout?.score ?? 0} · L
              {hq.topPerformersSummary.topScout?.level ?? 0}
            </p>
          </Link>
          <Link
            href={
              hq.topPerformersSummary.highestXpAgent
                ? `/hq/agents/${hq.topPerformersSummary.highestXpAgent.agentKey}`
                : "/hq/agents"
            }
            className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
          >
            <p className="text-[10px] text-gray-500 uppercase">Highest XP</p>
            <p className="text-sm font-bold truncate">
              {hq.topPerformersSummary.highestXpAgent?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {hq.topPerformersSummary.highestXpAgent?.xp ?? 0} XP
            </p>
          </Link>
          <Link
            href={
              hq.topPerformersSummary.highestRevenueAgent
                ? `/hq/agents/${hq.topPerformersSummary.highestRevenueAgent.agentKey}`
                : "/hq/agents"
            }
            className="p-4 rounded-xl border border-green-500/30 bg-gray-900 hover:border-green-500/50 block"
          >
            <p className="text-[10px] text-gray-500 uppercase">Top revenue</p>
            <p className="text-sm font-bold truncate">
              {hq.topPerformersSummary.highestRevenueAgent?.name ?? "—"}
            </p>
            <p className="text-xs text-green-400 mt-1">
              {formatGbp(
                hq.topPerformersSummary.highestRevenueAgent?.revenueInfluenced ?? 0
              )}
            </p>
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-2">Athena Opportunity Factory</h2>
        <p className="text-sm text-gray-500 mb-4">
          Six venture scouts — manual triggers only.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {hq.athenaScouts.map((scout) => (
            <article
              key={scout.key}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold text-sm">{scout.displayName}</p>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-400 capitalize">
                  {scout.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 capitalize">{scout.ventureTypeKey}</p>
              <p className="text-sm mt-2">
                {scout.missions} missions · {scout.scoutOpportunitiesGenerated} opportunities
              </p>
            </article>
          ))}
        </div>
      </section>

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Mission Board</h2>
            <div className="flex gap-4 text-sm">
              <Link href="/hq/command" className="text-amber-400 hover:underline">
                Command Center →
              </Link>
              <Link href="/hq/missions" className="text-blue-400 hover:underline">
                View all missions →
              </Link>
            </div>
          </div>
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
                      <td className="p-3 font-medium">
                        <Link
                          href={`/hq/missions/${mission.id}`}
                          className="hover:text-blue-300"
                        >
                          {mission.title}
                        </Link>
                      </td>
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

      <div className="grid lg:grid-cols-2 gap-8 mt-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Recent Missions</h2>
          <ul className="space-y-2">
            {hq.recentMissions.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
              >
                <Link
                  href={`/hq/missions/${m.id}`}
                  className="font-medium hover:text-blue-300 truncate"
                >
                  {m.title}
                </Link>
                <span className={`text-xs capitalize shrink-0 ${missionStatusClass(m.status)}`}>
                  {m.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Recent Mission Events</h2>
          <ul className="space-y-2">
            {hq.recentEvents.length === 0 ? (
              <li className="text-gray-500 text-sm">No events yet.</li>
            ) : (
              hq.recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
                >
                  <div className="flex justify-between gap-2 text-xs text-gray-500 mb-1">
                    <span>{new Date(e.createdAt).toLocaleString("en-GB")}</span>
                    <span className="capitalize">{e.action.replace(/_/g, " ")}</span>
                  </div>
                  <Link
                    href={`/hq/missions/${e.missionId}`}
                    className="text-blue-400 hover:underline text-xs"
                  >
                    {e.missionTitle}
                  </Link>
                  {e.detail && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{e.detail}</p>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

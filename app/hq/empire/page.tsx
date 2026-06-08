import Link from "next/link";
import { getEmpireScoreSnapshot } from "@/lib/hq/empire/queries";
import { formatGbp, RoiBadge } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

export default async function EmpirePage() {
  const empire = await getEmpireScoreSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">👑 Empire Score</h1>
        <p className="text-gray-400 max-w-2xl">
          AI Venture Company performance — multi-stream venture analytics across
          Shopify, Etsy, Affiliate, Content, SaaS, and Amazon.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Period {empire.periodMonth} · {new Date(empire.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <div className="mb-10 p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-gray-900 to-gray-950 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Empire Score</p>
        <p className="text-7xl font-bold text-amber-300">{empire.empireScore}</p>
        <p className="text-gray-500 text-sm mt-2">out of 100</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
        {[
          { label: "Total Missions", value: empire.metrics.totalMissions },
          { label: "Active Ventures", value: empire.metrics.activeVentures },
          {
            label: "Monthly Revenue",
            value: formatGbp(empire.metrics.monthlyRevenue),
          },
          {
            label: "Monthly Costs",
            value: formatGbp(empire.metrics.monthlyCosts),
          },
          {
            label: "Net Profit",
            value: formatGbp(empire.metrics.netProfit),
            color: empire.metrics.netProfit >= 0 ? "text-emerald-400" : "text-red-400",
          },
          {
            label: "ROI",
            value:
              empire.metrics.roi != null ? `${empire.metrics.roi}%` : "Unknown",
          },
          { label: "Launch Ready", value: empire.metrics.launchReadyCount },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900"
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className={`text-xl font-bold ${"color" in item ? item.color : ""}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Department Rankings</h2>
          <ul className="space-y-2">
            {empire.departmentScores.map((dept, index) => (
              <li
                key={dept.departmentKey}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-500 w-6">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-semibold">{dept.departmentName}</p>
                    <p className="text-xs text-gray-500">
                      {dept.missions} missions · {dept.activeMissions} active
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-300">{dept.score}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Ventures by Type</h2>
          <div className="grid grid-cols-2 gap-2">
            {empire.venturesByType.map((vt) => (
              <div
                key={vt.ventureTypeKey}
                className="p-4 rounded-xl border border-gray-800 bg-gray-900"
              >
                <p className="text-sm text-gray-400">{vt.ventureTypeName}</p>
                <p className="text-3xl font-bold">{vt.count}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Revenue by Venture Type</h2>
        <div className="rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="text-left p-3">Venture Type</th>
                <th className="text-right p-3">Missions</th>
                <th className="text-right p-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {empire.revenueByVentureType.map((row) => (
                <tr key={row.ventureTypeKey} className="border-t border-gray-800">
                  <td className="p-3">{row.ventureTypeName}</td>
                  <td className="p-3 text-right">{row.missionCount}</td>
                  <td className="p-3 text-right text-green-400">
                    {formatGbp(row.revenueGbp, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Mission Statistics</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
              <p className="text-xs text-gray-500">Success Rate</p>
              <p className="text-2xl font-bold text-emerald-400">
                {empire.missionStatistics.successRate}%
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-800 bg-gray-900">
              <p className="text-xs text-gray-500">Profitable</p>
              <p className="text-2xl font-bold">
                {empire.missionStatistics.profitableCount}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(empire.missionStatistics.byStatus).map(([status, count]) => (
              <div
                key={status}
                className="p-3 rounded-lg border border-gray-800 bg-gray-950 text-sm"
              >
                <p className="text-xs text-gray-500 capitalize">{status}</p>
                <p className="font-bold">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Athena Scouts</h2>
          <ul className="space-y-2">
            {empire.scouts.map((scout) => (
              <li
                key={scout.key}
                className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">{scout.displayName}</span>
                  <span className="text-xs capitalize px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                    {scout.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {scout.missions} missions · {scout.opportunitiesDiscovered}{" "}
                  opportunities
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Store-Linked Mission ROI</h2>
        {empire.revenueByVentureType.every((r) => r.revenueGbp === 0) ? (
          <p className="text-gray-500 text-sm">
            No store revenue linked to missions yet.
          </p>
        ) : (
          <p className="text-gray-400 text-sm mb-4">
            See per-mission ROI on linked store missions in Finance.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {empire.revenueByVentureType
            .filter((r) => r.missionCount > 0)
            .map((r) => (
              <RoiBadge
                key={r.ventureTypeKey}
                label={r.revenueGbp > 0 ? "positive" : "unknown"}
                roi={null}
              />
            ))}
        </div>
      </section>
    </div>
  );
}

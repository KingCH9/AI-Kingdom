import Link from "next/link";
import { getRaeSnapshot } from "@/lib/hq/revenue";
import { formatGbp, RoiBadge } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  scale: "text-emerald-400 border-emerald-500/30",
  maintain: "text-blue-400 border-blue-500/30",
  review: "text-amber-400 border-amber-500/30",
  kill: "text-red-400 border-red-500/30",
};

function roiLabel(roi: number | null): "positive" | "negative" | "unknown" {
  if (roi == null) return "unknown";
  if (roi > 0) return "positive";
  if (roi < 0) return "negative";
  return "unknown";
}

export default async function RevenueAccelerationPage() {
  const rae = await getRaeSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/hq"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">📈 Revenue Acceleration Engine</h1>
        <p className="text-gray-400 max-w-2xl">
          Cross-engine revenue analytics — venture performance, department totals,
          and agent contributions. Advisory only — no automatic mission changes or
          spending.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Period {rae.periodMonth} ·{" "}
          {new Date(rae.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: "Total Revenue",
              value: formatGbp(rae.summary.totalRevenueGbp),
            },
            {
              label: "Monthly Revenue",
              value: formatGbp(rae.summary.monthlyRevenueGbp),
              green: true,
            },
            {
              label: "Net Profit",
              value: formatGbp(rae.summary.netProfitGbp),
            },
            {
              label: "Avg ROI",
              value:
                rae.summary.averageRoi != null
                  ? `${rae.summary.averageRoi}%`
                  : "—",
            },
            {
              label: "Flagged Ventures",
              value: rae.summary.flaggedCount,
              warn: rae.summary.flaggedCount > 0,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="text-xs text-gray-500 uppercase">{item.label}</p>
              <p
                className={`text-xl font-bold ${item.green ? "text-green-400" : item.warn ? "text-amber-400" : ""}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Engine Insights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rae.engineInsights.map((insight) => (
            <Link
              key={insight.engine}
              href={insight.href}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
            >
              <p className="text-xs text-gray-500 uppercase">{insight.title}</p>
              <p className="text-sm text-gray-300 mt-2">{insight.summary}</p>
              <p className="text-xs text-blue-400 mt-3">View dashboard →</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Top Ventures by Revenue</h2>
          <ul className="space-y-2">
            {rae.topVenturesByRevenue.length === 0 ? (
              <li className="text-gray-500 text-sm">No venture revenue yet.</li>
            ) : (
              rae.topVenturesByRevenue.map((v, index) => (
                <li
                  key={v.missionId}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">#{index + 1}</p>
                    <p className="font-medium truncate">{v.title}</p>
                    <p className="text-xs text-gray-500">{v.ventureTypeName ?? v.status}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-green-400 font-semibold">
                      {formatGbp(v.revenueGbp)}
                    </p>
                    <RoiBadge label={roiLabel(v.roi)} roi={v.roi} />
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Top Ventures by ROI</h2>
          <ul className="space-y-2">
            {rae.topVenturesByRoi.length === 0 ? (
              <li className="text-gray-500 text-sm">No ROI data yet.</li>
            ) : (
              rae.topVenturesByRoi.map((v, index) => (
                <li
                  key={v.missionId}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">#{index + 1}</p>
                    <p className="font-medium truncate">{v.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <RoiBadge label={roiLabel(v.roi)} roi={v.roi} />
                    <p className="text-xs text-gray-500 mt-1">
                      {formatGbp(v.revenueGbp)}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Flagged Low-Performing Ventures</h2>
        {rae.flaggedVentures.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No ventures flagged for 7+ day underperformance.
          </p>
        ) : (
          <ul className="space-y-2">
            {rae.flaggedVentures.map((v) => (
              <li
                key={v.missionId}
                className="p-4 rounded-lg border border-amber-500/30 bg-gray-900"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{v.title}</p>
                    <p className="text-sm text-amber-300 mt-1">{v.flagReason}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs border capitalize h-fit ${ACTION_COLORS[v.atlasAction]}`}
                  >
                    {v.atlasAction}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Department Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Department</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Monthly</th>
                <th className="py-2 pr-4">Avg ROI</th>
                <th className="py-2 pr-4">Active</th>
                <th className="py-2 pr-4">Flagged</th>
              </tr>
            </thead>
            <tbody>
              {rae.departments.map((d) => (
                <tr key={d.departmentKey} className="border-b border-gray-900">
                  <td className="py-3 pr-4 font-medium">{d.departmentName}</td>
                  <td className="py-3 pr-4">{formatGbp(d.totalRevenueGbp)}</td>
                  <td className="py-3 pr-4">{formatGbp(d.monthlyRevenueGbp)}</td>
                  <td className="py-3 pr-4">
                    {d.averageRoi != null ? `${d.averageRoi}%` : "—"}
                  </td>
                  <td className="py-3 pr-4">{d.activeMissions}</td>
                  <td className="py-3 pr-4">{d.flaggedVentures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Agent Revenue Contributions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rae.topAgentContributors.map((agent) => (
            <Link
              key={agent.agentKey}
              href={`/hq/agents/${agent.agentKey}`}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
            >
              <div className="flex items-start gap-2">
                <span className="text-2xl">{agent.avatarEmoji}</span>
                <div>
                  <p className="font-semibold">{agent.name}</p>
                  <p className="text-xs text-gray-500">{agent.departmentName}</p>
                </div>
              </div>
              <p className="text-green-400 font-bold mt-2">
                {formatGbp(agent.revenueContributed)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                L{agent.level} · {agent.xp} XP · Score {agent.score}
              </p>
              <p className="text-xs text-gray-600 mt-2">{agent.contributionSummary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

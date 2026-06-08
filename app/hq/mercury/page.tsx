import Link from "next/link";
import { getMercurySnapshot } from "@/lib/hq/mercury/profitability-dashboard";
import { formatGbp, RoiBadge } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

const ACTION_COLORS: Record<string, string> = {
  fund: "text-emerald-400 border-emerald-500/30",
  maintain: "text-blue-400 border-blue-500/30",
  review: "text-amber-400 border-amber-500/30",
  reduce: "text-red-400 border-red-500/30",
};

export default async function MercuryPage() {
  const mercury = await getMercurySnapshot();
  const { portfolioHealth: health } = mercury;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/hq"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">💰 Mercury Command Center</h1>
        <p className="text-gray-400 max-w-2xl">
          Profitability, ROI, capital efficiency, and portfolio health across all
          missions. Advisory only — no automatic spending or budget enforcement.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(mercury.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Portfolio Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Health Score", value: `${health.portfolioHealthScore}/100` },
            { label: "Total Revenue", value: formatGbp(health.totalRevenue) },
            { label: "Total Costs", value: formatGbp(health.totalCosts) },
            {
              label: "Net Profit",
              value: formatGbp(health.netProfit),
              className: health.netProfit >= 0 ? "text-green-400" : "text-red-400",
            },
            {
              label: "Avg ROI",
              value:
                health.averageRoi != null ? `${health.averageRoi}%` : "—",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="text-xs text-gray-500 uppercase">{item.label}</p>
              <p className={`text-xl font-bold truncate ${item.className ?? ""}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 max-w-xl">
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-gray-900 text-center">
            <p className="text-xs text-gray-500">Profitable</p>
            <p className="text-2xl font-bold text-emerald-400">
              {health.profitableMissions}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-red-500/20 bg-gray-900 text-center">
            <p className="text-xs text-gray-500">Unprofitable</p>
            <p className="text-2xl font-bold text-red-400">
              {health.unprofitableMissions}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-gray-600 bg-gray-900 text-center">
            <p className="text-xs text-gray-500">Break-even</p>
            <p className="text-2xl font-bold">{health.breakEvenMissions}</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Agent Rankings</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {mercury.rankings.topAgents.map((agent, index) => (
            <div
              key={agent.agentKey}
              className="p-4 rounded-xl border border-amber-500/20 bg-gray-900"
            >
              <p className="text-xs text-gray-500">#{index + 1}</p>
              <p className="font-semibold text-amber-300">{agent.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                Score {agent.score} · Level {agent.level} · {agent.xp} XP
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Top Profitable Missions</h2>
          <ul className="space-y-2">
            {mercury.topProfitableMissions.length === 0 ? (
              <li className="text-gray-500 text-sm">No mission data yet.</li>
            ) : (
              mercury.topProfitableMissions.map((m) => (
                <li
                  key={m.missionId}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.status}</p>
                  </div>
                  <p className="text-emerald-400 font-semibold shrink-0">
                    {formatGbp(m.netProfitGbp)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Highest ROI Missions</h2>
          <ul className="space-y-2">
            {mercury.highestRoiMissions.length === 0 ? (
              <li className="text-gray-500 text-sm">No ROI data yet.</li>
            ) : (
              mercury.highestRoiMissions.map((m) => (
                <li
                  key={m.missionId}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2 items-center"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatGbp(m.revenueGbp)} / {formatGbp(m.costGbp)}
                    </p>
                  </div>
                  {m.roi != null ? (
                    <RoiBadge roi={m.roi} label={m.roi >= 0 ? "positive" : "negative"} />
                  ) : (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Capital Allocation Recommendations</h2>
        <p className="text-sm text-gray-500 mb-4">
          Advisory only — fund, maintain, review, or reduce. No automatic actions.
        </p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {mercury.recommendations.slice(0, 20).map((rec) => (
            <div
              key={rec.missionId}
              className={`p-3 rounded-lg border bg-gray-900 ${ACTION_COLORS[rec.action] ?? "border-gray-700"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{rec.title}</p>
                <span className="text-xs uppercase font-semibold">{rec.action}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{rec.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Profitability Metrics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-700">
                <th className="py-2 pr-4">Mission</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Cost</th>
                <th className="py-2 pr-4">Profit</th>
                <th className="py-2 pr-4">ROI</th>
                <th className="py-2 pr-4">Rev Multiple</th>
                <th className="py-2">Cap. Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {mercury.profitabilityMetrics
                .filter((m) => m.revenueGbp > 0 || m.costGbp > 0)
                .slice(0, 30)
                .map((m) => (
                  <tr key={m.missionId} className="border-b border-gray-800">
                    <td className="py-2 pr-4 max-w-[200px] truncate">{m.title}</td>
                    <td className="py-2 pr-4">{formatGbp(m.revenueGbp)}</td>
                    <td className="py-2 pr-4">{formatGbp(m.costGbp)}</td>
                    <td
                      className={`py-2 pr-4 ${m.netProfitGbp >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {formatGbp(m.netProfitGbp)}
                    </td>
                    <td className="py-2 pr-4">
                      {m.roi != null ? `${m.roi}%` : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      {m.revenueMultiple != null ? `${m.revenueMultiple}x` : "—"}
                    </td>
                    <td className="py-2">{m.capitalEfficiency}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">XP / Levels</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mercury.agents.map((agent) => (
            <div
              key={agent.agentKey}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="font-semibold">{agent.name}</p>
              <p className="text-sm text-gray-400">
                Level {agent.level} · {agent.xp} XP
                {agent.xpToNextLevel != null
                  ? ` · ${agent.xpToNextLevel} to next`
                  : " · max level"}
              </p>
              <ul className="text-xs text-gray-500 mt-2 space-y-0.5">
                {agent.xpBreakdown.fromProfitable > 0 && (
                  <li>Profitable missions: +{agent.xpBreakdown.fromProfitable}</li>
                )}
                {agent.xpBreakdown.fromProfit > 0 && (
                  <li>Profit £: +{agent.xpBreakdown.fromProfit}</li>
                )}
                {agent.xpBreakdown.fromCostTracked > 0 && (
                  <li>Cost tracked: +{agent.xpBreakdown.fromCostTracked}</li>
                )}
                {agent.xpBreakdown.fromSpendEvents > 0 && (
                  <li>Spend events: +{agent.xpBreakdown.fromSpendEvents}</li>
                )}
                {agent.xpBreakdown.fromProfitableVentures > 0 && (
                  <li>
                    Profitable ventures: +{agent.xpBreakdown.fromProfitableVentures}
                  </li>
                )}
                {agent.xpBreakdown.fromFundRecommendations > 0 && (
                  <li>
                    Fund recs: +{agent.xpBreakdown.fromFundRecommendations}
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

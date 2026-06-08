import Link from "next/link";
import { getCaeSnapshot } from "@/lib/hq/capital";
import { formatGbp, RoiBadge } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

const REC_COLORS: Record<string, string> = {
  fund_aggressively: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  fund: "text-green-400 border-green-500/30 bg-green-500/10",
  maintain: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  review: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  avoid: "text-red-400 border-red-500/30 bg-red-500/10",
};

function recLabel(rec: string): string {
  return rec.replace(/_/g, " ");
}

function roiLabel(roi: number | null): "positive" | "negative" | "unknown" {
  if (roi == null) return "unknown";
  if (roi > 0) return "positive";
  if (roi < 0) return "negative";
  return "unknown";
}

export default async function CapitalAllocationPage() {
  const cae = await getCaeSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/hq"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">💷 Capital Allocation Engine</h1>
        <p className="text-gray-400 max-w-2xl">
          Advisory capital allocation for Atlas and Mercury — where future capital
          should flow across ventures. Simulation only.
        </p>
        <p className="mt-3 text-sm text-amber-400/90 border border-amber-500/30 rounded-lg px-4 py-2 max-w-2xl">
          Recommendations only. No capital is allocated automatically.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Period {cae.periodMonth} ·{" "}
          {new Date(cae.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              label: "Portfolio Capital Score",
              value: `${cae.summary.portfolioCapitalScore}/100`,
              green: cae.summary.portfolioCapitalScore >= 70,
            },
            {
              label: "Portfolio Health",
              value: `${cae.summary.portfolioHealthScore}/100`,
            },
            {
              label: "Total Revenue",
              value: formatGbp(cae.summary.totalRevenueGbp),
            },
            {
              label: "Fund Aggressive",
              value: cae.summary.fundAggressivelyCount,
              green: true,
            },
            {
              label: "Fund",
              value: cae.summary.fundCount,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="text-xs text-gray-500 uppercase">{item.label}</p>
              <p
                className={`text-xl font-bold ${item.green ? "text-green-400" : ""}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Funding Recommendations</h2>
        <ul className="space-y-2">
          {cae.recommendations.length === 0 ? (
            <li className="text-gray-500 text-sm">No ventures to analyse.</li>
          ) : (
            cae.recommendations.slice(0, 15).map((rec, index) => (
              <li
                key={rec.missionId}
                className="p-4 rounded-lg border border-gray-700 bg-gray-900 flex flex-wrap justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">#{index + 1}</p>
                  <p className="font-medium truncate">{rec.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{rec.rationale}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">{rec.allocationScore}/100</span>
                  <span
                    className={`text-xs px-2 py-1 rounded border capitalize ${REC_COLORS[rec.recommendation] ?? ""}`}
                  >
                    {recLabel(rec.recommendation)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {formatGbp(rec.revenueGbp)}
                  </span>
                  <RoiBadge roi={rec.roi} label={roiLabel(rec.roi)} />
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Budget Simulations</h2>
        <p className="text-sm text-gray-500 mb-4">
          Model portfolios at £100, £500, £1,000, and £5,000 — no real spending.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {cae.fundingSimulations.map((sim) => (
            <div
              key={sim.budget}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="text-lg font-bold text-green-400 mb-3">
                {formatGbp(sim.budget)} budget
              </p>
              {sim.allocations.length === 0 ? (
                <p className="text-sm text-gray-500">No eligible ventures.</p>
              ) : (
                <ul className="space-y-2">
                  {sim.allocations.slice(0, 5).map((a) => (
                    <li
                      key={a.missionId}
                      className="flex justify-between text-sm gap-2"
                    >
                      <span className="truncate">{a.title}</span>
                      <span className="text-green-400 shrink-0">
                        {formatGbp(a.amount)} ({a.percentage}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {sim.unallocated > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Unallocated: {formatGbp(sim.unallocated)}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Portfolio Optimization</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: "Top Opportunities",
              items: cae.portfolioOptimization.topOpportunities,
            },
            {
              title: "Underfunded Winners",
              items: cae.portfolioOptimization.underfundedWinners,
            },
            {
              title: "Overfunded Risks",
              items: cae.portfolioOptimization.overfundedRisks,
            },
            {
              title: "Highest ROI Ventures",
              items: cae.portfolioOptimization.highestRoiVentures,
            },
            {
              title: "Highest Growth Ventures",
              items: cae.portfolioOptimization.highestGrowthVentures,
            },
          ].map((group) => (
            <div
              key={group.title}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="font-bold mb-3">{group.title}</p>
              {group.items.length === 0 ? (
                <p className="text-sm text-gray-500">None identified.</p>
              ) : (
                <ul className="space-y-2">
                  {group.items.map((v) => (
                    <li key={v.missionId} className="text-sm">
                      <p className="truncate">{v.title}</p>
                      <p className="text-xs text-gray-500">
                        Score {v.allocationScore} · {recLabel(v.recommendation)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Department Allocations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-700 rounded-xl overflow-hidden">
            <thead className="bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="p-3">Engine</th>
                <th className="p-3">Recommended Capital</th>
                <th className="p-3">Active Ventures</th>
                <th className="p-3">Revenue</th>
                <th className="p-3">Avg ROI</th>
                <th className="p-3">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {cae.departmentAllocations.map((dept) => (
                <tr key={dept.department} className="border-t border-gray-700">
                  <td className="p-3 font-medium">{dept.departmentName}</td>
                  <td className="p-3 text-green-400">{dept.recommendedCapital}</td>
                  <td className="p-3">{dept.activeVentures}</td>
                  <td className="p-3">{formatGbp(dept.revenue)}</td>
                  <td className="p-3">
                    {dept.roi != null ? `${dept.roi}%` : "—"}
                  </td>
                  <td className="p-3">{dept.averageAllocationScore}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

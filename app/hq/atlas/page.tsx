import Link from "next/link";
import { getAtlasDashboardSnapshot } from "@/lib/hq/atlas/ceo-dashboard";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

function recommendationClass(rec: string): string {
  switch (rec) {
    case "fund":
      return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    case "accelerate":
      return "text-blue-400 border-blue-500/30 bg-blue-500/10";
    case "kill":
      return "text-red-400 border-red-500/30 bg-red-500/10";
    case "review":
      return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    default:
      return "text-gray-400 border-gray-600 bg-gray-800";
  }
}

function workloadClass(level: string): string {
  switch (level) {
    case "overloaded":
      return "text-red-400";
    case "busy":
      return "text-amber-400";
    default:
      return "text-emerald-400";
  }
}

export default async function AtlasPage() {
  const atlas = await getAtlasDashboardSnapshot();

  const recSections = [
    { key: "fund", label: "Fund Recommendations", items: atlas.recommendations.fund },
    { key: "accelerate", label: "Accelerate", items: atlas.recommendations.accelerate },
    { key: "hold", label: "Hold Recommendations", items: atlas.recommendations.hold },
    { key: "kill", label: "Kill Recommendations", items: atlas.recommendations.kill },
    { key: "review", label: "Review", items: atlas.recommendations.review },
  ] as const;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">👔 Atlas CEO Dashboard</h1>
        <p className="text-gray-400 max-w-2xl">
          Executive advisor for AI-Kingdom — mission priority scores, portfolio
          ranking, and fund/hold/kill recommendations. Advisory only; human
          approval required for all actions.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(atlas.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        {[
          { label: "Empire Score", value: atlas.empireScore },
          { label: "Active Missions", value: atlas.executiveSummary.activeMissions },
          { label: "Fund", value: atlas.recommendationCounts.fund, color: "text-emerald-400" },
          { label: "Hold", value: atlas.recommendationCounts.hold, color: "text-amber-400" },
          { label: "Kill", value: atlas.recommendationCounts.kill, color: "text-red-400" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900"
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className={`text-2xl font-bold ${"color" in item ? item.color : ""}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-8 p-3 rounded-lg border border-gray-800 bg-gray-950">
        {atlas.executiveSummary.advisoryNote}
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Top Priority Missions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Mission</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {atlas.priorityMissions.slice(0, 10).map((m) => (
                <tr key={m.missionId} className="border-b border-gray-900">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/hq/missions/${m.missionId}`}
                      className="text-blue-400 hover:underline"
                    >
                      {m.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-bold">{m.priorityScore}</td>
                  <td className="py-3 pr-4 text-gray-400">{m.status}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2 py-1 rounded text-xs border ${recommendationClass(m.recommendation)}`}
                    >
                      {m.recommendation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        {recSections
          .filter((s) => s.items.length > 0)
          .slice(0, 4)
          .map((section) => (
            <section key={section.key}>
              <h2 className="text-xl font-bold mb-3">{section.label}</h2>
              <ul className="space-y-2">
                {section.items.slice(0, 5).map((m) => (
                  <li
                    key={m.missionId}
                    className="p-3 rounded-xl border border-gray-800 bg-gray-900"
                  >
                    <Link
                      href={`/hq/missions/${m.missionId}`}
                      className="font-medium hover:underline"
                    >
                      {m.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">
                      Priority {m.priorityScore} · {m.status}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Department Workloads</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {atlas.departmentWorkloads.map((dept) => (
            <div
              key={dept.persona}
              className="p-4 rounded-xl border border-gray-800 bg-gray-900"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{dept.displayName}</span>
                <span className={`text-sm font-medium ${workloadClass(dept.level)}`}>
                  {dept.level}
                </span>
              </div>
              <p className="text-sm text-gray-400">{dept.summary}</p>
              <p className="text-xs text-gray-600 mt-1">
                {dept.awaitingHandoff} awaiting handoff
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Portfolio Ranking</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          {[
            { title: "Top Opportunities", items: atlas.portfolioSummary.topOpportunities },
            { title: "Top Revenue Producers", items: atlas.portfolioSummary.topRevenueProducers },
            { title: "Highest ROI", items: atlas.portfolioSummary.highestRoi },
            { title: "Highest Potential", items: atlas.portfolioSummary.highestPotential },
            { title: "Lowest Performing", items: atlas.portfolioSummary.lowestPerforming },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="text-lg font-semibold mb-2">{group.title}</h3>
              {group.items.length === 0 ? (
                <p className="text-gray-600 text-sm">No data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {group.items.map((m) => (
                    <li
                      key={`${group.title}-${m.missionId}`}
                      className="p-3 rounded-lg border border-gray-800 bg-gray-950 text-sm"
                    >
                      <Link
                        href={`/hq/missions/${m.missionId}`}
                        className="text-blue-400 hover:underline"
                      >
                        {m.title}
                      </Link>
                      <p className="text-gray-500 mt-1">
                        {m.label}:{" "}
                        {group.title.includes("Revenue")
                          ? formatGbp(m.value)
                          : m.value}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

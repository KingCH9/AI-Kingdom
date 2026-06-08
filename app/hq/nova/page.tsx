import Link from "next/link";
import { getNovaGrowthSnapshot } from "@/lib/hq/nova/growth-dashboard";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

export default async function NovaPage() {
  const nova = await getNovaGrowthSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">📈 Nova Growth Command</h1>
        <p className="text-gray-400 max-w-2xl">
          Growth performance across all ventures — launch, grow, and profit metrics
          with agent XP and campaign analysis. Advisory only.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(nova.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        {[
          {
            label: "Growth Score",
            value: nova.growthScore,
          },
          {
            label: "Total Revenue",
            value: formatGbp(nova.totalRevenue),
          },
          {
            label: "Launching",
            value: nova.launchedMissions,
          },
          {
            label: "Growing",
            value: nova.growingMissions,
          },
          {
            label: "Profitable",
            value: nova.profitableMissions,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900"
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className="text-xl font-bold truncate">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Top Growth Agents</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {nova.rankings.topAgents.map((agent, index) => (
            <div
              key={agent.agentKey}
              className="p-4 rounded-xl border border-emerald-500/20 bg-gray-900"
            >
              <p className="text-xs text-gray-500">#{index + 1}</p>
              <p className="font-semibold text-emerald-300">{agent.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                Score {agent.score} · Level {agent.level} · {agent.xp} XP
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Revenue Generated</h2>
          <ul className="space-y-2">
            {nova.rankings.byRevenue.map((a) => (
              <li
                key={a.agentKey}
                className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm flex justify-between"
              >
                <span>{a.name}</span>
                <span>{formatGbp(a.revenueGenerated)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold mb-3">Launching Missions</h2>
          <p className="text-3xl font-bold text-amber-300">{nova.launchedMissions}</p>
          <p className="text-sm text-gray-500 mt-1">SEO Specialist domain</p>
        </section>
        <section>
          <h2 className="text-xl font-bold mb-3">Growing / Profitable</h2>
          <p className="text-sm text-gray-400">
            Growing: <span className="text-white font-bold">{nova.growingMissions}</span>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Profitable:{" "}
            <span className="text-emerald-400 font-bold">{nova.profitableMissions}</span>
          </p>
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Campaign Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Campaign</th>
                <th className="py-2 pr-4">Missions</th>
                <th className="py-2 pr-4">Launching</th>
                <th className="py-2 pr-4">Growing</th>
                <th className="py-2 pr-4">Profitable</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {nova.campaignPerformance.map((c) => (
                <tr key={c.campaignKey} className="border-b border-gray-900">
                  <td className="py-3 pr-4 font-medium">{c.campaignName}</td>
                  <td className="py-3 pr-4">{c.missions}</td>
                  <td className="py-3 pr-4">{c.launching}</td>
                  <td className="py-3 pr-4">{c.growing}</td>
                  <td className="py-3 pr-4">{c.profitable}</td>
                  <td className="py-3 pr-4">{formatGbp(c.revenueGbp)}</td>
                  <td className="py-3 pr-4 font-bold">{c.growthScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Agent Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">XP</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Launch</th>
                <th className="py-2 pr-4">Grow</th>
                <th className="py-2 pr-4">Profit</th>
                <th className="py-2 pr-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {nova.agents.map((agent) => (
                <tr key={agent.agentKey} className="border-b border-gray-900">
                  <td className="py-3 pr-4 font-medium">{agent.name}</td>
                  <td className="py-3 pr-4">{agent.level}</td>
                  <td className="py-3 pr-4">{agent.xp}</td>
                  <td className="py-3 pr-4 font-bold">{agent.score}</td>
                  <td className="py-3 pr-4">{agent.launchedMissions}</td>
                  <td className="py-3 pr-4">{agent.growingMissions}</td>
                  <td className="py-3 pr-4">{agent.profitableMissions}</td>
                  <td className="py-3 pr-4">{formatGbp(agent.revenueGenerated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">XP / Levels</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nova.agents.map((agent) => (
            <div
              key={agent.agentKey}
              className="p-4 rounded-xl border border-gray-800 bg-gray-900"
            >
              <p className="font-semibold">{agent.name}</p>
              <p className="text-2xl font-bold text-blue-300 mt-1">
                Level {agent.level}
              </p>
              <p className="text-sm text-gray-400">
                {agent.xp} XP
                {agent.nextLevelXp != null
                  ? ` · ${agent.xpToNextLevel} to level ${agent.level + 1}`
                  : " · max level"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

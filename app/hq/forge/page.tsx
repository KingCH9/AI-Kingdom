import Link from "next/link";
import { getForgeWorkstationSnapshot } from "@/lib/hq/forge/workstation-dashboard";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

export default async function ForgePage() {
  const forge = await getForgeWorkstationSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">🔨 Forge Builder Engine</h1>
        <p className="text-gray-400 max-w-2xl">
          Builder performance metrics — build success, template efficiency, store
          launches, and agent XP. Advisory only; no automatic mission advancement.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(forge.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          {
            label: "Top Builder",
            value: forge.summary.topAgent?.name ?? "—",
            sub: forge.summary.topAgent
              ? `Score ${forge.summary.topAgent.score}`
              : "",
          },
          {
            label: "Builds Completed",
            value: forge.summary.totalBuildsCompleted,
          },
          {
            label: "Stores Launched",
            value: forge.summary.totalStoresLaunched,
          },
          {
            label: "Forge Revenue",
            value: formatGbp(forge.summary.totalForgeRevenue),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 rounded-xl border border-gray-700 bg-gray-900"
          >
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className="text-xl font-bold truncate">{item.value}</p>
            {"sub" in item && item.sub ? (
              <p className="text-xs text-gray-500">{item.sub}</p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Top Builders</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {forge.topAgents.map((agent, index) => (
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

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Builder Agent Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">XP</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Builds</th>
                <th className="py-2 pr-4">Missions</th>
                <th className="py-2 pr-4">Stores</th>
                <th className="py-2 pr-4">Launched</th>
                <th className="py-2 pr-4">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {forge.agents.map((agent) => (
                <tr key={agent.agentKey} className="border-b border-gray-900">
                  <td className="py-3 pr-4 font-medium">{agent.name}</td>
                  <td className="py-3 pr-4">{agent.level}</td>
                  <td className="py-3 pr-4">{agent.xp}</td>
                  <td className="py-3 pr-4 font-bold">{agent.score}</td>
                  <td className="py-3 pr-4">{agent.buildsCompleted}</td>
                  <td className="py-3 pr-4">{agent.missionsBuilt}</td>
                  <td className="py-3 pr-4">{agent.storesLaunched}</td>
                  <td className="py-3 pr-4">{agent.missionsLaunched}</td>
                  <td className="py-3 pr-4">{formatGbp(agent.revenueGenerated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Top Templates</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {forge.topTemplates.map((template) => (
            <div
              key={template.templateKey}
              className="p-4 rounded-xl border border-gray-800 bg-gray-900"
            >
              <p className="font-semibold">{template.templateName}</p>
              <p className="text-sm text-gray-400 mt-1">
                Efficiency {template.efficiencyScore} · {template.missionsUsed}{" "}
                missions · {template.missionsLaunched} launched
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Revenue {formatGbp(template.revenueGenerated)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Template Efficiency</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Template</th>
                <th className="py-2 pr-4">Missions</th>
                <th className="py-2 pr-4">Builds</th>
                <th className="py-2 pr-4">Stores</th>
                <th className="py-2 pr-4">Launched</th>
                <th className="py-2 pr-4">Success</th>
                <th className="py-2 pr-4">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {forge.templates.map((template) => (
                <tr key={template.templateKey} className="border-b border-gray-900">
                  <td className="py-3 pr-4 font-medium">{template.templateName}</td>
                  <td className="py-3 pr-4">{template.missionsUsed}</td>
                  <td className="py-3 pr-4">{template.buildsCompleted}</td>
                  <td className="py-3 pr-4">{template.storesLaunched}</td>
                  <td className="py-3 pr-4">{template.missionsLaunched}</td>
                  <td className="py-3 pr-4">{template.successRate}%</td>
                  <td className="py-3 pr-4 font-bold">{template.efficiencyScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Mission Builds</h2>
        {forge.missionBuilds.length === 0 ? (
          <p className="text-gray-600 text-sm">No forge build activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-500">
                  <th className="py-2 pr-4">Mission</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Template</th>
                  <th className="py-2 pr-4">Forge Tasks</th>
                  <th className="py-2 pr-4">Store</th>
                  <th className="py-2 pr-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {forge.missionBuilds.map((build) => (
                  <tr key={build.missionId} className="border-b border-gray-900">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/hq/missions/${build.missionId}`}
                        className="hover:text-blue-300 font-medium"
                      >
                        {build.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 capitalize">{build.status}</td>
                    <td className="py-3 pr-4">{build.templateName ?? "—"}</td>
                    <td className="py-3 pr-4">
                      {build.forgeTasksCompleted}/{build.forgeTasksTotal}
                    </td>
                    <td className="py-3 pr-4">{build.storeLinked ? "✓" : "—"}</td>
                    <td className="py-3 pr-4">{formatGbp(build.revenueGbp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

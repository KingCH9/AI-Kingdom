import Link from "next/link";
import { getAgentWorkstationSnapshot } from "@/lib/hq/workstations";
import { AgentCard } from "@/components/hq/workstation-ui";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

const TEAM_LABELS: Record<string, string> = {
  executive: "Executive Team",
  builder: "Builder Team",
  growth: "Growth Team",
  finance: "Finance Team",
};

export default async function AgentsPage() {
  const snapshot = await getAgentWorkstationSnapshot();
  const { rankings, teams, topPerformers } = snapshot;

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/hq"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">👥 Agent Workstations</h1>
        <p className="text-gray-400 max-w-2xl">
          Command-center profiles for all HQ agents — executives and sub-agents.
          Read-only performance history, rankings, and activity. No automation.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(snapshot.generatedAt).toLocaleString("en-GB")} ·{" "}
          {snapshot.agents.length} agents tracked
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Performance Leaders</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-amber-500/30 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">#1 Agent</p>
            <p className="text-lg font-bold truncate">
              {topPerformers.topAgent?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              Score {topPerformers.topAgent?.score ?? 0}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">Highest XP</p>
            <p className="text-lg font-bold truncate">
              {topPerformers.highestXpAgent?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              {topPerformers.highestXpAgent?.xp ?? 0} XP
            </p>
          </div>
          <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">Highest Score</p>
            <p className="text-lg font-bold truncate">
              {rankings.agents.highestScore[0]?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              {rankings.agents.highestScore[0]?.score ?? 0}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-green-500/30 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">Revenue Leader</p>
            <p className="text-lg font-bold truncate">
              {topPerformers.highestRevenueAgent?.name ?? "—"}
            </p>
            <p className="text-xs text-green-400">
              {formatGbp(topPerformers.highestRevenueAgent?.revenueInfluenced ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {(["executive", "builder", "growth", "finance"] as const).map((teamKey) => (
        <section key={teamKey} className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{TEAM_LABELS[teamKey]}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teams[teamKey].map((agent) => (
              <AgentCard key={agent.agentKey} agent={agent} />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Rankings</h2>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">Top Agents</h3>
            <ul className="space-y-2">
              {rankings.agents.topAgents.map((agent, index) => (
                <li key={agent.agentKey}>
                  <Link
                    href={`/hq/agents/${agent.agentKey}`}
                    className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2 hover:border-gray-600 block"
                  >
                    <div>
                      <p className="text-xs text-gray-500">#{index + 1}</p>
                      <p className="font-medium">{agent.name}</p>
                    </div>
                    <p className="text-sm text-amber-300 shrink-0">
                      {agent.score} · L{agent.level}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Department Rankings</h3>
            <ul className="space-y-2">
              {rankings.departments.map((dept, index) => (
                <li
                  key={dept.departmentKey}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-900"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500">#{index + 1}</p>
                      <p className="font-medium">{dept.departmentName}</p>
                      <p className="text-xs text-gray-500">
                        {dept.agentCount} agents · avg score {dept.averageScore}
                      </p>
                    </div>
                    <div className="text-right text-sm shrink-0">
                      <p className="text-amber-300">{dept.totalXp} XP</p>
                      <p className="text-green-400">
                        {formatGbp(dept.totalRevenue)}
                      </p>
                    </div>
                  </div>
                  {dept.topAgent ? (
                    <p className="text-xs text-gray-600 mt-2">
                      Top: {dept.topAgent.name} ({dept.topAgent.score})
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

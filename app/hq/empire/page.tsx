import Link from "next/link";
import { getEmpireScoreV2Snapshot } from "@/lib/hq/empire/score-v2-dashboard";
import { COMPONENT_LABELS } from "@/lib/hq/empire/score-v2";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

export default async function EmpirePage() {
  const empire = await getEmpireScoreV2Snapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/hq"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">👑 Empire Score</h1>
        <p className="text-gray-400 max-w-2xl">
          Multi-engine empire health — portfolio, revenue, execution, department
          performance, agent XP, scout XP, and venture diversification. Advisory only.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(empire.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <div className="mb-10 p-8 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-gray-900 to-gray-950 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">
          Empire Score
        </p>
        <p className="text-7xl font-bold text-purple-300">{empire.empireScoreV2}</p>
        <p className="text-gray-500 text-sm mt-2">out of 100</p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Component Breakdown</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(
            Object.entries(empire.componentScores) as Array<
              [keyof typeof empire.componentScores, number]
            >
          ).map(([key, score]) => (
            <div
              key={key}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900"
            >
              <p className="text-xs text-gray-500 uppercase">
                {COMPONENT_LABELS[key]}
              </p>
              <p className="text-2xl font-bold text-purple-300">{score}</p>
              <p className="text-xs text-gray-500 mt-1">
                Weight {Math.round(empire.componentWeights[key] * 100)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
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
                    {dept.agentCount} agents · L{dept.averageLevel} avg ·{" "}
                    {dept.missionsCompleted} completed
                  </p>
                </div>
              </div>
              <span className="text-2xl font-bold text-purple-300">
                {dept.score}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Top Agents</h2>
          <ul className="space-y-2">
            {empire.rankings.topAgents.map((agent, index) => (
              <li
                key={agent.agentKey}
                className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2"
              >
                <div>
                  <p className="text-xs text-gray-500">#{index + 1}</p>
                  <p className="font-medium capitalize">
                    {agent.agentKey.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">{agent.department}</p>
                </div>
                <p className="text-sm text-purple-300 shrink-0">
                  {agent.score} · L{agent.level}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Top Scouts</h2>
          <ul className="space-y-2">
            {empire.rankings.topScouts.map((scout, index) => (
              <li
                key={scout.scoutKey}
                className="p-3 rounded-lg border border-gray-700 bg-gray-900 flex justify-between gap-2"
              >
                <div>
                  <p className="text-xs text-gray-500">#{index + 1}</p>
                  <p className="font-medium capitalize">
                    {scout.scoutKey.replace(/_/g, " ")}
                  </p>
                </div>
                <p className="text-sm text-emerald-300 shrink-0">
                  {scout.score} · L{scout.level}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Portfolio Health</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
              <p className="text-xs text-gray-500 uppercase">Health Score</p>
              <p className="text-2xl font-bold">{empire.portfolioHealth.score}</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
              <p className="text-xs text-gray-500 uppercase">Net Profit</p>
              <p
                className={`text-2xl font-bold ${empire.portfolioHealth.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {formatGbp(empire.portfolioHealth.netProfit)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
              <p className="text-xs text-gray-500 uppercase">Revenue</p>
              <p className="text-xl font-bold text-green-400">
                {formatGbp(empire.portfolioHealth.totalRevenue)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
              <p className="text-xs text-gray-500 uppercase">Costs</p>
              <p className="text-xl font-bold">
                {formatGbp(empire.portfolioHealth.totalCosts)}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3">Venture Diversification</h2>
          <p className="text-sm text-gray-500 mb-3">
            {empire.ventureDiversification.activeTypes} of{" "}
            {empire.ventureDiversification.totalTypes} core venture types active ·
            score {empire.ventureDiversification.score}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {empire.ventureDiversification.details.map((vt) => (
              <div
                key={vt.ventureTypeKey}
                className={`p-3 rounded-lg border text-sm capitalize ${
                  vt.active
                    ? "border-emerald-500/30 bg-emerald-950/20"
                    : "border-gray-800 bg-gray-900"
                }`}
              >
                <p>{vt.ventureTypeKey}</p>
                <p className="text-xs text-gray-500">{vt.missionCount} active</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-bold mb-3 text-emerald-400">Strengths</h2>
          <ul className="space-y-2">
            {empire.strengths.map((item) => (
              <li
                key={item}
                className="p-3 rounded-lg border border-emerald-500/20 bg-gray-900 text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-amber-400">Weaknesses</h2>
          <ul className="space-y-2">
            {empire.weaknesses.map((item) => (
              <li
                key={item}
                className="p-3 rounded-lg border border-amber-500/20 bg-gray-900 text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

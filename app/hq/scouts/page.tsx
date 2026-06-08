import Link from "next/link";
import { getAthenaIntelligenceSnapshot } from "@/lib/hq/athena/intelligence-dashboard";
import { getScoutWorkstationSnapshot } from "@/lib/hq/workstations";
import { ScoutCard } from "@/components/hq/workstation-ui";
import { formatGbp } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

export default async function ScoutsPage() {
  const [intel, workstation] = await Promise.all([
    getAthenaIntelligenceSnapshot(),
    getScoutWorkstationSnapshot(),
  ]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">🔎 Scout Workstations</h1>
        <p className="text-gray-400 max-w-2xl">
          Athena intelligence and scout workstation profiles — XP, levels, scores,
          rankings, and revenue leaders. Advisory only.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {new Date(workstation.generatedAt).toLocaleString("en-GB")} ·{" "}
          {workstation.scouts.length} scouts tracked
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Top Performers</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">#1 Scout</p>
            <p className="text-lg font-bold truncate">
              {workstation.topPerformers.topScout?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              Score {workstation.topPerformers.topScout?.score ?? 0}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">Highest XP</p>
            <p className="text-lg font-bold truncate">
              {workstation.topPerformers.highestXpScout?.name ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              {workstation.topPerformers.highestXpScout?.xp ?? 0} XP
            </p>
          </div>
          <div className="p-4 rounded-xl border border-green-500/30 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">Revenue Leader</p>
            <p className="text-lg font-bold truncate">
              {workstation.topPerformers.highestRevenueScout?.name ?? "—"}
            </p>
            <p className="text-xs text-green-400">
              {formatGbp(
                workstation.topPerformers.highestRevenueScout?.revenueGenerated ?? 0
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Scout Profiles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {workstation.scouts.map((scout) => (
            <ScoutCard key={scout.scoutKey} scout={scout} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          {
            label: "Top Scout",
            value: intel.summary.topScout?.name ?? "—",
            sub: intel.summary.topScout
              ? `Score ${intel.summary.topScout.score}`
              : "",
          },
          {
            label: "Avg Scout Score",
            value: intel.summary.averageScoutScore,
          },
          {
            label: "Total Scout Revenue",
            value: formatGbp(intel.summary.totalScoutRevenue),
          },
          {
            label: "Avg Level",
            value: intel.summary.averageLevel,
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
        <h2 className="text-2xl font-bold mb-4">Scout Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-500">
                <th className="py-2 pr-4">Scout</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2 pr-4">XP</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Opps</th>
                <th className="py-2 pr-4">Missions</th>
                <th className="py-2 pr-4">Launched</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2 pr-4">Success</th>
              </tr>
            </thead>
            <tbody>
              {workstation.scouts.map((scout) => (
                <tr key={scout.scoutKey} className="border-b border-gray-900">
                  <td className="py-3 pr-4 font-medium">
                    <Link
                      href={`/hq/scouts/${scout.scoutKey}`}
                      className="hover:text-emerald-300"
                    >
                      {scout.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{scout.level}</td>
                  <td className="py-3 pr-4">{scout.xp}</td>
                  <td className="py-3 pr-4 font-bold">{scout.score}</td>
                  <td className="py-3 pr-4">{scout.opportunitiesFound}</td>
                  <td className="py-3 pr-4">{scout.missionsCreated}</td>
                  <td className="py-3 pr-4">{scout.missionsLaunched}</td>
                  <td className="py-3 pr-4">{formatGbp(scout.revenueGenerated)}</td>
                  <td className="py-3 pr-4">{scout.successRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-xl font-bold mb-3">Revenue Leaders</h2>
          <ul className="space-y-2">
            {workstation.rankings.highestRevenue.map((s) => (
              <li key={s.scoutKey}>
                <Link
                  href={`/hq/scouts/${s.scoutKey}`}
                  className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm hover:border-gray-700 block"
                >
                  {s.name} — {formatGbp(s.revenueGenerated)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold mb-3">Success Rate Rankings</h2>
          <ul className="space-y-2">
            {intel.scoutRankings.highestSuccessRateScouts.length === 0 ? (
              <li className="text-gray-600 text-sm">No terminal missions yet.</li>
            ) : (
              intel.scoutRankings.highestSuccessRateScouts.map((s) => (
                <li key={s.scoutKey}>
                  <Link
                    href={`/hq/scouts/${s.scoutKey}`}
                    className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm hover:border-gray-700 block"
                  >
                    {s.name} — {s.successRate}%
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Scout Levels (Athena Intelligence)</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {intel.scouts.map((scout) => (
            <Link
              key={scout.scoutKey}
              href={`/hq/scouts/${scout.scoutKey}`}
              className="p-4 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 block"
            >
              <p className="font-semibold">{scout.name}</p>
              <p className="text-2xl font-bold text-blue-300 mt-1">
                Level {scout.level}
              </p>
              <p className="text-sm text-gray-400">
                {scout.xp} XP
                {scout.nextLevelXp != null
                  ? ` · ${scout.xpToNextLevel} to level ${scout.level + 1}`
                  : " · max level"}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                XP: opps +{scout.xpBreakdown.fromOpportunities}, missions +
                {scout.xpBreakdown.fromMissionsCreated}, revenue +
                {scout.xpBreakdown.fromRevenue}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

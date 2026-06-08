/**
 * @deprecated Empire Score V1 dashboard — archived Phase 4D.
 * Canonical empire dashboard: /hq/empire (formerly V2).
 */
import Link from "next/link";
import { getEmpireScoreSnapshot } from "@/lib/hq/empire/queries";
import { formatGbp, RoiBadge } from "@/components/hq/finance-ui";

export const dynamic = "force-dynamic";

export default async function ArchivedEmpireV1Page() {
  const empire = await getEmpireScoreSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link href="/hq/empire" className="text-blue-400 hover:underline text-sm mb-2 inline-block">
          ← Current Empire dashboard
        </Link>
        <h1 className="text-4xl font-bold mb-2">👑 Empire Score (V1 — archived)</h1>
        <p className="text-gray-400 max-w-2xl">
          Legacy V1 scoring dashboard. Retained for reference only.
        </p>
      </div>

      <div className="mb-10 p-8 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-gray-900 to-gray-950 text-center">
        <p className="text-7xl font-bold text-amber-300">{empire.empireScore}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Total Missions", value: empire.metrics.totalMissions },
          { label: "Active Ventures", value: empire.metrics.activeVentures },
          { label: "Monthly Revenue", value: formatGbp(empire.metrics.monthlyRevenue) },
          { label: "Launch Ready", value: empire.metrics.launchReadyCount },
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-xl border border-gray-700 bg-gray-900">
            <p className="text-xs text-gray-500 uppercase">{item.label}</p>
            <p className="text-xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Department Rankings (V1)</h2>
        <ul className="space-y-2">
          {empire.departmentScores.map((dept) => (
            <li key={dept.departmentKey} className="p-3 rounded-lg border border-gray-800 bg-gray-900">
              {dept.departmentName}: {dept.score}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

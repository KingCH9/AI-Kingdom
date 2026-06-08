import Link from "next/link";
import { RecordSpendForm } from "@/components/hq/record-spend-form";
import { BudgetUsageBar, formatGbp, RoiBadge } from "@/components/hq/finance-ui";
import { getFinanceSnapshot } from "@/lib/hq/finance/queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const [finance, departments] = await Promise.all([
    getFinanceSnapshot(),
    prisma.department.findMany({ orderBy: { id: "asc" } }),
  ]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/hq"
            className="text-blue-400 hover:underline text-sm mb-2 inline-block"
          >
            ← HQ
          </Link>
          <h1 className="text-4xl font-bold mb-2">💰 Mercury Finance</h1>
          <p className="text-gray-400 max-w-2xl">
            Budget tracking, AI cost observation, mission cost accounting, and ROI
            for store-linked missions. No enforcement — observation only.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Period: {finance.periodMonth} · Updated{" "}
            {new Date(finance.generatedAt).toLocaleString("en-GB")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Allocated</p>
          <p className="text-2xl font-bold">{formatGbp(finance.totals.allocatedGbp)}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Spent</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatGbp(finance.totals.spentGbp)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Remaining</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatGbp(finance.totals.remainingGbp)}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Mission Costs</p>
          <p className="text-2xl font-bold">{formatGbp(finance.totals.missionCostGbp)}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-xs text-gray-500 uppercase">Empire Revenue</p>
          <p className="text-2xl font-bold text-green-400">
            {formatGbp(finance.totals.revenueGbp)}
          </p>
        </div>
      </div>

      <div className="mb-10">
        <BudgetUsageBar percent={finance.totals.usagePercent} className="h-3" />
        <p className="text-xs text-gray-500 mt-1">
          Budget usage: {finance.totals.usagePercent}%
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-10">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Department Budgets</h2>
          <div className="space-y-3">
            {finance.budgets.map((dept) => (
              <div
                key={dept.departmentKey}
                className="p-4 rounded-xl border border-gray-700 bg-gray-900"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="font-semibold">{dept.departmentName}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {dept.departmentKey.replace(/_/g, " ")}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400">
                    {formatGbp(dept.spentGbp)} / {formatGbp(dept.allocatedGbp)}
                  </p>
                </div>
                <BudgetUsageBar percent={dept.usagePercent} />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Remaining {formatGbp(dept.remainingGbp)}</span>
                  <span>Mission costs {formatGbp(dept.missionCostGbp)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <RecordSpendForm
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          />
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">Top Costly Missions</h2>
          {finance.topCostlyMissions.length === 0 ? (
            <p className="text-gray-500 text-sm">No mission costs recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {finance.topCostlyMissions.map((m) => (
                <li
                  key={m.missionId}
                  className="flex justify-between items-center p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
                >
                  <Link
                    href={`/hq/missions/${m.missionId}`}
                    className="hover:text-blue-300 truncate pr-2"
                  >
                    {m.missionTitle}
                  </Link>
                  <span className="font-bold shrink-0">
                    {formatGbp(m.totalCostGbp, 2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Monthly AI / Mission Costs</h2>
          {finance.monthlySpend.length === 0 ? (
            <p className="text-gray-500 text-sm">No costs this period.</p>
          ) : (
            <ul className="space-y-2">
              {finance.monthlySpend.map((row) => (
                <li
                  key={row.periodMonth}
                  className="flex justify-between p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
                >
                  <span className="text-gray-400">{row.periodMonth}</span>
                  <span>
                    {formatGbp(row.totalCostGbp, 2)}{" "}
                    <span className="text-gray-500 text-xs">
                      ({row.eventCount} events)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Mission ROI (Store-Linked)</h2>
        {finance.roi.length === 0 ? (
          <p className="text-gray-500 text-sm">No store-linked missions.</p>
        ) : (
          <div className="rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="text-left p-3">Mission</th>
                  <th className="text-left p-3">Store</th>
                  <th className="text-right p-3">Cost</th>
                  <th className="text-right p-3">Revenue</th>
                  <th className="text-left p-3">ROI</th>
                </tr>
              </thead>
              <tbody>
                {finance.roi.map((row) => (
                  <tr key={row.missionId} className="border-t border-gray-800">
                    <td className="p-3">
                      <Link
                        href={`/hq/missions/${row.missionId}`}
                        className="text-blue-300 hover:underline"
                      >
                        {row.missionTitle}
                      </Link>
                    </td>
                    <td className="p-3 text-gray-400">{row.storeName ?? "—"}</td>
                    <td className="p-3 text-right">{formatGbp(row.costGbp, 2)}</td>
                    <td className="p-3 text-right text-green-400">
                      {formatGbp(row.revenueGbp, 2)}
                    </td>
                    <td className="p-3">
                      <RoiBadge label={row.roiLabel} roi={row.roi} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Spending Events</h2>
        {finance.recentSpendingEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">No spending events yet.</p>
        ) : (
          <ul className="space-y-2">
            {finance.recentSpendingEvents.map((e) => (
              <li
                key={e.id}
                className="p-3 rounded-lg border border-gray-800 bg-gray-900 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500 mb-1">
                  <span>{new Date(e.createdAt).toLocaleString("en-GB")}</span>
                  <span className="font-bold text-amber-300">
                    {formatGbp(e.estimatedCostGbp, 2)}
                  </span>
                </div>
                <Link
                  href={`/hq/missions/${e.missionId}`}
                  className="text-blue-400 hover:underline"
                >
                  {e.missionTitle}
                </Link>
                <p className="text-gray-400 text-xs mt-1 capitalize">
                  {e.action.replace(/_/g, " ")}
                  {e.detail ? ` — ${e.detail}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

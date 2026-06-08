import Link from "next/link";
import { AGENT_NAMES } from "@/lib/types";
import { GenerateOpportunityButton } from "@/components/opportunity-workflow-actions";
import { EmpireFunnel } from "@/components/empire-funnel";
import { EmpireIntelligenceInsights } from "@/components/empire-intelligence-insights";
import { StatCard } from "@/components/opportunity-ui";
import { getEmpireDashboard } from "@/lib/queries/analytics";

export default async function HomePage() {
  const dashboard = await getEmpireDashboard();

  return (
    <div className="p-10 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-5xl font-bold mb-2">Empire Command Centre</h1>
          <p className="text-gray-400">
            Intelligence-driven operations for AI Empire
          </p>
        </div>
        <GenerateOpportunityButton />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Research Queue"
          value={dashboard.queueStats.researchQueue}
          accent="blue"
        />
        <StatCard
          label="Validator Queue"
          value={dashboard.queueStats.validatorQueue}
          accent="blue"
        />
        <StatCard
          label="CEO Queue"
          value={dashboard.queueStats.ceoQueue}
          accent="blue"
        />
        <StatCard
          label="Launch Ready"
          value={dashboard.queueStats.launchReady}
          accent="green"
        />
        <StatCard label="Active Tasks" value={dashboard.queueStats.activeTasks} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Revenue"
          value={`£${dashboard.revenue.totalRevenue.toLocaleString()}`}
        />
        <StatCard label="Stores" value={dashboard.storeLifecycle.total} />
        <StatCard
          label="Profitable Stores"
          value={dashboard.storeLifecycle.profitable}
          accent="green"
        />
        <StatCard label="Agents" value={dashboard.agentCount} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Store Launch Rate"
          value={`${dashboard.storeLifecycle.launchRate}%`}
        />
        <StatCard
          label="Store Profitability"
          value={`${dashboard.storeLifecycle.profitabilityRate}%`}
          accent="green"
        />
        <StatCard
          label="Validation Success"
          value={`${dashboard.intelligence.analysis.validationSuccessRate}%`}
        />
        <StatCard
          label="Launch Success"
          value={`${dashboard.intelligence.analysis.launchSuccessRate}%`}
        />
      </div>

      <section className="mb-10">
        <EmpireFunnel funnel={dashboard.funnel} />
      </section>

      <section className="mb-10">
        <EmpireIntelligenceInsights intelligence={dashboard.intelligence} />
      </section>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Recent Launches</h2>
          {dashboard.recentLaunches.length === 0 ? (
            <p className="text-gray-500 text-sm">No launched stores yet.</p>
          ) : (
            <ul className="space-y-3">
              {dashboard.recentLaunches.map((store) => (
                <li key={store.id}>
                  <Link
                    href={`/stores/${store.id}`}
                    className="block p-3 rounded-lg border border-gray-800 hover:border-teal-600"
                  >
                    <div className="font-semibold">{store.name}</div>
                    <div className="text-sm text-gray-400">
                      {store.niche}
                      {store.opportunityName && ` · ${store.opportunityName}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Recent Profitable Stores</h2>
          {dashboard.recentProfitableStores.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No profitable stores yet — revenue past £5,000 promotes stores
              automatically.
            </p>
          ) : (
            <ul className="space-y-3">
              {dashboard.recentProfitableStores.map((store) => (
                <li key={store.id}>
                  <Link
                    href={`/stores/${store.id}`}
                    className="block p-3 rounded-lg border border-gray-800 hover:border-green-600"
                  >
                    <div className="font-semibold">{store.name}</div>
                    <div className="text-sm text-gray-400">
                      {store.niche} · £{store.revenue.toLocaleString()}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Empire Performance</h2>
          <div className="space-y-2 text-gray-300">
            <p>
              <strong>Top Store:</strong>{" "}
              {dashboard.revenue.topStore?.name ?? "None"}
              {dashboard.revenue.topStore &&
                ` (£${dashboard.revenue.topStore.revenue.toLocaleString()})`}
            </p>
            <p>
              <strong>Total Opportunities:</strong>{" "}
              {dashboard.opportunityStats.total}
            </p>
            <p>
              <strong>Average Score:</strong>{" "}
              {dashboard.opportunityStats.averageScore}/100
            </p>
            <p>
              <strong>Scaling Stores:</strong>{" "}
              {dashboard.storeLifecycle.scaling}
            </p>
          </div>
        </div>

        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link
              href="/ceo/intelligence"
              className="px-4 py-3 bg-purple-950 border border-purple-700 rounded-lg hover:bg-purple-900"
            >
              CEO Intelligence
            </Link>
            <Link
              href="/validator"
              className="px-4 py-3 bg-indigo-950 border border-indigo-700 rounded-lg hover:bg-indigo-900"
            >
              Validator Queue ({dashboard.queueStats.validatorQueue})
            </Link>
            <Link
              href="/ceo"
              className="px-4 py-3 bg-blue-950 border border-blue-700 rounded-lg hover:bg-blue-900"
            >
              CEO Approval Queue ({dashboard.queueStats.ceoQueue})
            </Link>
            <Link
              href="/agents/work-queue"
              className="px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg hover:bg-gray-800"
            >
              Agent Work Queue ({dashboard.queueStats.activeTasks} active)
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Recent Opportunities</h2>
          {dashboard.recentOpportunities.length === 0 ? (
            <p className="text-gray-500 text-sm">No opportunities yet.</p>
          ) : (
            <ul className="space-y-3">
              {dashboard.recentOpportunities.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/opportunities/${item.id}`}
                    className="block p-3 rounded-lg border border-gray-800 hover:border-blue-600"
                  >
                    <div className="font-semibold">{item.productName}</div>
                    <div className="text-sm text-gray-400">
                      {item.status} · Score {item.opportunityScore ?? "N/A"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Recent Agent Activity</h2>
          {dashboard.recentLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {dashboard.recentLogs.map((log) => (
                <li
                  key={log.id}
                  className="p-3 rounded-lg border border-gray-800"
                >
                  <div className="text-blue-300 font-medium">{log.agentName}</div>
                  <div className="text-gray-300">{log.action}</div>
                  <div className="text-gray-500 text-xs mt-1">
                    {log.createdAt.toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/agent-logs"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            View all logs →
          </Link>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-8">
        Pipeline: Scout discovers → {AGENT_NAMES.VALIDATOR} validates →{" "}
        {AGENT_NAMES.CEO} approves launch → Forge & Gamma execute → revenue
        drives scaling & profitability.
      </p>
    </div>
  );
}

import Link from "next/link";
import { StatCard } from "@/components/opportunity-ui";
import { StoreStatusBadge } from "@/components/store-ui";
import { getStoreDashboardStats, getStores } from "@/lib/queries/stores";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const [stores, stats] = await Promise.all([
    getStores(),
    getStoreDashboardStats(),
  ]);

  return (
    <div className="p-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-5xl font-bold mb-2">🏪 Store Command Centre</h1>
        <p className="text-gray-400">
          Operational view of every business in the empire
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <StatCard label="Total Stores" value={stats.total} accent="blue" />
        <StatCard label="Building" value={stats.building} />
        <StatCard label="Launched" value={stats.launched} accent="green" />
        <StatCard label="Scaling" value={stats.scaling} />
        <StatCard label="Profitable" value={stats.profitable} accent="green" />
      </div>

      {stores.length === 0 ? (
        <div className="border border-gray-700 rounded-2xl p-8 bg-gray-900 text-center">
          <p className="text-gray-400">No stores yet.</p>
          <p className="text-gray-500 text-sm mt-2">
            Stores are created when Forge completes a build-store task after CEO
            approval.
          </p>
          <Link
            href="/ceo"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300"
          >
            Go to CEO Queue →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="block border border-gray-700 rounded-2xl p-6 bg-gray-900 hover:border-blue-600 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{store.name}</h2>
                  <StoreStatusBadge status={store.status} />
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>Revenue: £{store.revenue.toLocaleString()}</p>
                  <p>Niche: {store.niche}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-300">
                {store.opportunityName && (
                  <span>Opportunity: {store.opportunityName}</span>
                )}
                {store.opportunityScore != null && (
                  <span>Score: {store.opportunityScore}/100</span>
                )}
                <span>Created {store.createdAt.toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

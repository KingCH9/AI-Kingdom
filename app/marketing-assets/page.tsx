import Link from "next/link";
import {
  getMarketingAssetsForAdmin,
  getMarketingStats,
} from "@/lib/marketing/queries";

export const dynamic = "force-dynamic";

function preview(content: string, max = 160): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export default async function MarketingAssetsPage() {
  const [assets, stats] = await Promise.all([
    getMarketingAssetsForAdmin(),
    getMarketingStats(),
  ]);

  const byStore = assets.reduce(
    (acc, asset) => {
      const key = asset.store.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(asset);
      return acc;
    },
    {} as Record<string, typeof assets>
  );

  return (
    <div className="p-10 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">📣 Marketing Assets</h1>
        <p className="text-gray-400">
          AI-generated launch assets by store, type, and platform
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Total assets</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <p className="text-sm text-gray-500">Stores covered</p>
          <p className="text-3xl font-bold text-green-400">
            {stats.storesCovered}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-700 bg-gray-900 col-span-2">
          <p className="text-sm text-gray-500 mb-2">By type</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(stats.byType).map(([type, count]) => (
              <span
                key={type}
                className="px-2 py-1 rounded bg-gray-800 text-gray-300"
              >
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {assets.length === 0 ? (
        <p className="text-gray-500">
          No marketing assets yet. They generate automatically when stores
          launch.
        </p>
      ) : (
        Object.entries(byStore).map(([storeName, storeAssets]) => (
          <section key={storeName} className="mb-12">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-2xl font-bold">{storeName}</h2>
              {storeAssets[0]?.store.slug && (
                <Link
                  href={`/shop/${storeAssets[0].store.slug}`}
                  className="text-sm text-blue-400 hover:underline"
                >
                  View public shop →
                </Link>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-950 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Platform</th>
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {storeAssets.map((asset) => (
                    <tr key={asset.id} className="bg-gray-900/50">
                      <td className="p-3 text-blue-300 whitespace-nowrap">
                        {asset.assetType}
                      </td>
                      <td className="p-3 text-gray-400 whitespace-nowrap">
                        {asset.platform}
                      </td>
                      <td className="p-3 text-white whitespace-nowrap">
                        {asset.title}
                      </td>
                      <td className="p-3 text-gray-400 max-w-md">
                        {preview(asset.content)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}

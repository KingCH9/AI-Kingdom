import type { IntelligenceSnapshot } from "@/lib/intelligence/types";

export function EmpireIntelligenceInsights({
  intelligence,
  compact = false,
}: {
  intelligence: IntelligenceSnapshot;
  compact?: boolean;
}) {
  const { analysis } = intelligence;

  return (
    <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">Empire Intelligence</h2>
          <p className="text-sm text-gray-400 mt-1">
            Learning from {intelligence.opportunityCount} opportunities and{" "}
            {intelligence.storeCount} stores
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Updated {new Date(intelligence.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6 text-sm">
        <MetricCard
          label="Profitable Store Rate"
          value={`${analysis.profitableStoreRate}%`}
        />
        <MetricCard
          label="Launch Success Rate"
          value={`${analysis.launchSuccessRate}%`}
        />
        <MetricCard
          label="Validation Success"
          value={`${analysis.validationSuccessRate}%`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6 text-sm">
        <MetricCard
          label="Total Orders"
          value={analysis.totalOrders.toLocaleString()}
        />
        <MetricCard
          label="Average Order Value"
          value={`£${analysis.averageOrderValue.toLocaleString()}`}
        />
      </div>

      {!compact && (
        <>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <InsightList
              title="Strongest Categories"
              items={analysis.strongestCategories.map(
                (item) =>
                  `${item.label} — ${item.profitabilityRate}% profitable (${item.profitableCount}/${item.launchedCount} launched)`
              )}
              emptyMessage="No category outcome data yet."
            />
            <InsightList
              title="Top Niches"
              items={analysis.topNiches.map(
                (item) =>
                  `${item.niche} — ${item.profitabilityRate}% profitable, £${item.totalRevenue.toLocaleString()} revenue`
              )}
              emptyMessage="No store niche data yet."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <InsightList
              title="Score Bands"
              items={analysis.strongestScores
                .filter((item) => item.count > 0)
                .map(
                  (item) =>
                    `${item.band} — ${item.profitabilityRate}% profitable (${item.count} opportunities)`
                )}
              emptyMessage="No score band data yet."
            />
            <InsightList
              title="Margin Bands"
              items={analysis.strongestMargins
                .filter((item) => item.count > 0)
                .map(
                  (item) =>
                    `${item.band} — ${item.profitabilityRate}% profitable (${item.count} opportunities)`
                )}
              emptyMessage="No margin band data yet."
            />
          </div>
        </>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Recommendations
        </h3>
        <ul className="space-y-2">
          {analysis.recommendations.map((rec, index) => (
            <li key={index} className="flex gap-2 text-sm text-gray-300">
              <span className="text-purple-400 shrink-0">→</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-gray-800 bg-gray-950">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function InsightList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1 text-sm text-gray-300">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-gray-600 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { EmpireIntelligenceInsights } from "@/components/empire-intelligence-insights";
import { StatCard } from "@/components/opportunity-ui";
import { AGENT_NAMES } from "@/lib/types";
import { getEmpireIntelligence } from "@/lib/queries/intelligence";

export default async function CeoIntelligencePage() {
  const intelligence = await getEmpireIntelligence();
  const { analysis } = intelligence;

  return (
    <div className="p-10 max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/ceo"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Back to CEO Queue
          </Link>
          <h1 className="text-5xl font-bold mt-4 mb-2">CEO Intelligence</h1>
          <p className="text-gray-400">
            {AGENT_NAMES.CEO} strategic insights derived from empire outcomes
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-300"
        >
          Empire Command Centre →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Profitable Store Rate"
          value={`${analysis.profitableStoreRate}%`}
          accent="green"
        />
        <StatCard
          label="Launch Success"
          value={`${analysis.launchSuccessRate}%`}
        />
        <StatCard
          label="Validation Success"
          value={`${analysis.validationSuccessRate}%`}
        />
        <StatCard
          label="Recommendations"
          value={analysis.recommendations.length}
          accent="blue"
        />
      </div>

      <section className="mb-10">
        <EmpireIntelligenceInsights intelligence={intelligence} />
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <FocusAreas
          title="Recommended Focus Areas"
          items={analysis.recommendations}
        />

        <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
          <h2 className="text-xl font-bold mb-4">Weakest Categories</h2>
          {analysis.weakestCategories.length === 0 ? (
            <p className="text-gray-500 text-sm">No category data yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {analysis.weakestCategories.map((item) => (
                <li
                  key={item.label}
                  className="p-3 rounded-lg border border-gray-800"
                >
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-gray-400 mt-1">
                    {item.profitabilityRate}% profitable · {item.killedCount}{" "}
                    killed · avg score {item.avgScore}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <RankingPanel
          title="Best Performing Categories"
          rows={analysis.strongestCategories.map((item) => ({
            label: item.label,
            detail: `${item.profitabilityRate}% profitable · avg margin ${item.avgMargin}% · ${item.count} total`,
          }))}
        />
        <RankingPanel
          title="Best Performing Niches"
          rows={analysis.topNiches.map((item) => ({
            label: item.niche,
            detail: `${item.profitabilityRate}% profitable · £${item.totalRevenue.toLocaleString()} revenue · ${item.storeCount} stores`,
          }))}
        />
      </div>
    </div>
  );
}

function FocusAreas({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <ul className="space-y-3 text-sm text-gray-300">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-green-400 shrink-0">{index + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankingPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; detail: string }>;
}) {
  return (
    <div className="border border-gray-700 rounded-2xl p-6 bg-gray-900">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-gray-500 text-sm">No data yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {rows.map((row) => (
            <li
              key={row.label}
              className="p-3 rounded-lg border border-gray-800"
            >
              <p className="font-medium text-white">{row.label}</p>
              <p className="text-gray-400 mt-1">{row.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { getVseSnapshot } from "@/lib/hq/ventures";
import {
  ScalingSummaryGrid,
  ScalingRecommendationRow,
  PriorityQueueGrid,
  GrowthLeversPanel,
} from "@/components/hq/venture-scaling-ui";

export const dynamic = "force-dynamic";

export default async function VentureScalingPage() {
  const vse = await getVseSnapshot();

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/hq"
          className="text-blue-400 hover:underline text-sm mb-2 inline-block"
        >
          ← HQ
        </Link>
        <h1 className="text-4xl font-bold mb-2">🚀 Venture Scaling Engine</h1>
        <p className="text-gray-400 max-w-2xl">
          Nova-powered scaling advisory — which ventures to scale, how to grow,
          and which levers to pull. No automatic ad spend or campaign launches.
        </p>
        <p className="mt-3 text-sm text-amber-400/90 border border-amber-500/30 rounded-lg px-4 py-2 max-w-2xl">
          Recommendations only. No scaling actions are executed automatically.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Period {vse.periodMonth} ·{" "}
          {new Date(vse.generatedAt).toLocaleString("en-GB")}
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
        <ScalingSummaryGrid summary={vse.summary} />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Engine Insights</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vse.engineInsights.map((insight) => (
            <Link
              key={insight.engine}
              href={insight.href}
              className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 block"
            >
              <p className="text-xs text-gray-500 uppercase">{insight.title}</p>
              <p className="text-sm text-gray-300 mt-2">{insight.summary}</p>
              <p className="text-xs text-blue-400 mt-3">View dashboard →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Scaling Recommendations</h2>
        <ul className="space-y-2">
          {vse.recommendations.length === 0 ? (
            <li className="text-gray-500 text-sm">No ventures to analyse.</li>
          ) : (
            vse.recommendations.slice(0, 15).map((rec, index) => (
              <ScalingRecommendationRow key={rec.missionId} rec={rec} index={index} />
            ))
          )}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Scaling Priority Queue</h2>
        <PriorityQueueGrid queue={vse.priorityQueue} />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Growth Levers</h2>
        <p className="text-sm text-gray-500 mb-4">
          Advisory levers for top scaling candidates — traffic, conversion, ads,
          SEO, social, and retention.
        </p>
        <GrowthLeversPanel levers={vse.growthLevers} />
      </section>
    </div>
  );
}

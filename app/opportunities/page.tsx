import Link from "next/link";
import { StatCard, StatusBadge } from "@/components/opportunity-ui";
import { GenerateOpportunityButton } from "@/components/opportunity-workflow-actions";
import { computeOpportunityStats } from "@/lib/opportunity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: {
      opportunityScore: "desc",
    },
  });

  const stats = computeOpportunityStats(opportunities);

  return (
    <div className="p-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <h1 className="text-5xl font-bold">🔥 Product Opportunities</h1>
        <GenerateOpportunityButton />
      </div>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Opportunities" value={stats.total} />
        <StatCard
          label="Launch Ready"
          value={stats.launchReady}
          accent="green"
        />
        <StatCard
          label="Validated"
          value={stats.validated}
          accent="blue"
        />
        <StatCard
          label="Average Score"
          value={`${stats.averageScore}/100`}
        />
        <StatCard
          label="Highest Score"
          value={`${stats.highestScore}/100`}
        />
      </div>

      {opportunities.length === 0 ? (
        <p className="text-gray-400">No opportunities yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {opportunities.map((item) => (
            <div
              key={item.id}
              className="border border-gray-700 rounded-2xl p-6 bg-gray-900"
            >
              <h2 className="text-3xl font-bold mb-4">{item.productName}</h2>

              <div className="space-y-3 text-sm">
                <p>
                  <strong>Opportunity Score:</strong>{" "}
                  {item.opportunityScore ?? "N/A"}/100
                </p>

                <p className="flex items-center gap-2">
                  <strong>Status:</strong>
                  <StatusBadge status={item.status} />
                </p>

                <p>
                  <strong>Risk Rating:</strong> {item.riskRating ?? "N/A"}/10
                </p>

                <p>
                  <strong>Selling Price:</strong> {item.sellingPrice || "N/A"}
                </p>

                <p>
                  <strong>Estimated Cost:</strong>{" "}
                  {item.estimatedCostPerUnit || "N/A"}
                </p>

                <p>
                  <strong>Profit Margin:</strong> {item.profitMargin || "N/A"}
                </p>
              </div>

              {item.productDescription && (
                <p className="mt-4 text-gray-300 line-clamp-3">
                  {item.productDescription}
                </p>
              )}

              <p className="text-xs text-gray-500 mt-4">
                Created: {item.createdAt.toLocaleDateString()}
              </p>

              <Link
                href={`/opportunities/${item.id}`}
                className="inline-block mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

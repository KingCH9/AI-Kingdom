import Link from "next/link";
import { CeoDecisionButtons } from "@/components/opportunity-workflow-actions";
import { StatusBadge, StatCard } from "@/components/opportunity-ui";
import { AGENT_NAMES } from "@/lib/types";
import { getCeoApprovalQueue } from "@/lib/queries/ceo";
import { scoreOpportunityWithIntelligence } from "@/lib/intelligence/priority-bias";

export default async function CeoApprovalPage() {
  const { queue, intelligence } = await getCeoApprovalQueue();

  return (
    <div className="p-10 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-5xl font-bold mb-2">CEO Approval Queue</h1>
          <p className="text-gray-400">
            {AGENT_NAMES.CEO} reviews validated opportunities — sorted by empire
            intelligence priority.
          </p>
        </div>
        <Link
          href="/ceo/intelligence"
          className="px-4 py-2 bg-purple-950 border border-purple-700 rounded-lg hover:bg-purple-900 text-sm"
        >
          View Intelligence →
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Awaiting Decision" value={queue.length} accent="blue" />
        <StatCard
          label="Approve Action"
          value="launch ready"
          accent="green"
        />
        <StatCard label="Reject Action" value="killed" accent="default" />
      </div>

      {queue.length === 0 ? (
        <div className="border border-gray-700 rounded-2xl p-8 bg-gray-900 text-center">
          <p className="text-gray-400">
            No validated opportunities awaiting CEO approval.
          </p>
          <Link
            href="/opportunities"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300"
          >
            View all opportunities
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {queue.map((item) => (
            <div
              key={item.id}
              className="border border-gray-700 rounded-2xl p-6 bg-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{item.productName}</h2>
                  <StatusBadge status={item.status} />
                </div>
                <Link
                  href={`/opportunities/${item.id}`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View full details →
                </Link>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-4 text-sm">
                <p>
                  <strong>Score:</strong> {item.opportunityScore ?? "N/A"}/100
                </p>
                <p>
                  <strong>Intelligence Priority:</strong>{" "}
                  {Math.round(
                    scoreOpportunityWithIntelligence(item, intelligence.analysis)
                  )}
                </p>
                <p>
                  <strong>Risk:</strong> {item.riskRating ?? "N/A"}/10
                </p>
                <p>
                  <strong>Margin:</strong> {item.profitMargin ?? "N/A"}
                </p>
              </div>

              {item.productDescription && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {item.productDescription}
                </p>
              )}

              <div className="border-t border-gray-800 pt-4">
                <p className="text-sm text-gray-400 mb-3">
                  {AGENT_NAMES.CEO} decision:
                </p>
                <div className="flex flex-wrap gap-3">
                  <CeoDecisionButtons opportunityId={item.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

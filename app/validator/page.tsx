import Link from "next/link";
import {
  RunValidatorCycleButton,
  ValidatorDecisionButtons,
} from "@/components/validator-decision-actions";
import { StatusBadge, StatCard } from "@/components/opportunity-ui";
import { AGENT_NAMES } from "@/lib/types";
import { normalizeOpportunityStatus } from "@/lib/opportunity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ValidatorQueuePage() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: { createdAt: "asc" },
  });

  const queue = opportunities.filter(
    (item) => normalizeOpportunityStatus(item.status) === "researching"
  );

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
          <h1 className="text-5xl font-bold mb-2">🔬 Validator Queue</h1>
          <p className="text-gray-400">
            {AGENT_NAMES.VALIDATOR} reviews researching opportunities before CEO
            launch approval.
          </p>
        </div>
        <RunValidatorCycleButton />
      </div>

      <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Awaiting Validation" value={queue.length} accent="blue" />
        <StatCard label="Approve Action" value="validated" accent="green" />
        <StatCard label="Reject Action" value="killed" accent="default" />
      </div>

      {queue.length === 0 ? (
        <div className="border border-gray-700 rounded-2xl p-8 bg-gray-900 text-center">
          <p className="text-gray-400">
            No researching opportunities awaiting validation.
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

              <div className="grid md:grid-cols-5 gap-4 mb-4 text-sm">
                <p>
                  <strong>Score:</strong> {item.opportunityScore ?? "N/A"}/100
                </p>
                <p>
                  <strong>Risk:</strong> {item.riskRating ?? "N/A"}/10
                </p>
                <p>
                  <strong>Demand:</strong> {item.demandScore ?? "N/A"}
                </p>
                <p>
                  <strong>Competition:</strong> {item.competition ?? "N/A"}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {item.createdAt.toLocaleDateString()}
                </p>
              </div>

              {item.productDescription && (
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                  {item.productDescription}
                </p>
              )}

              <div className="border-t border-gray-800 pt-4">
                <p className="text-sm text-gray-400 mb-3">
                  {AGENT_NAMES.VALIDATOR} decision:
                </p>
                <ValidatorDecisionButtons opportunityId={item.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

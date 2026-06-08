import Link from "next/link";
import { notFound } from "next/navigation";
import { OpportunityWorkflowActions } from "@/components/opportunity-workflow-actions";
import {
  AgentLogList,
  DetailSection,
  MetricGrid,
  StatusBadge,
  StringListSection,
} from "@/components/opportunity-ui";
import { findAgentLogsForOpportunity } from "@/lib/agents";
import { toOpportunityViewModel } from "@/lib/opportunity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunityId = Number(id);

  if (Number.isNaN(opportunityId)) {
    notFound();
  }

  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
    include: {
      stores: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!opportunity) {
    notFound();
  }

  const view = toOpportunityViewModel(opportunity);
  const agentLogs = await findAgentLogsForOpportunity(
    view.id,
    view.productName
  );

  return (
    <div className="p-10 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/opportunities"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Opportunities
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-3">{view.productName}</h1>
          <StatusBadge status={view.status} />
        </div>
        <p className="text-sm text-gray-500">
          Created {view.createdAt.toLocaleString()}
        </p>
      </div>

      <div className="mb-8">
        <DetailSection title="Workflow Actions">
          <OpportunityWorkflowActions
            opportunityId={view.id}
            currentStatus={view.status}
          />
        </DetailSection>
      </div>

      {opportunity.stores.length > 0 && (
        <div className="mb-8">
          <DetailSection title="Linked Stores">
            <ul className="space-y-2">
              {opportunity.stores.map((store) => (
                <li key={store.id} className="text-gray-300">
                  <span className="font-medium text-white">{store.name}</span>
                  {" — "}
                  {store.niche} · {store.status} · £{store.revenue} revenue
                </li>
              ))}
            </ul>
          </DetailSection>
        </div>
      )}

      <div className="mb-8">
        <MetricGrid
          metrics={[
            {
              label: "Opportunity Score",
              value: `${view.opportunityScore ?? "N/A"}/100`,
            },
            {
              label: "Demand Score",
              value: view.demandScore ?? "N/A",
            },
            {
              label: "Competition",
              value: view.competition ?? "N/A",
            },
            {
              label: "Risk Rating",
              value: `${view.riskRating ?? "N/A"}/10`,
            },
            {
              label: "Category",
              value: view.category ?? "N/A",
            },
          ]}
        />
      </div>

      <div className="grid gap-6 mb-8">
        <DetailSection title="Product Description">
          <p className="text-gray-300 leading-relaxed">
            {view.productDescription ?? "No description available."}
          </p>
        </DetailSection>

        <div className="grid md:grid-cols-2 gap-6">
          <DetailSection title="Why Trending">
            <p className="text-gray-300 leading-relaxed">
              {view.whyTrending ?? "Not recorded."}
            </p>
          </DetailSection>

          <DetailSection title="Target Customer">
            <p className="text-gray-300 leading-relaxed">
              {view.targetCustomer ?? "Not recorded."}
            </p>
          </DetailSection>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <DetailSection title="Selling Price">
            <p className="text-2xl font-bold">{view.sellingPrice ?? "N/A"}</p>
          </DetailSection>

          <DetailSection title="Estimated Cost">
            <p className="text-2xl font-bold">
              {view.estimatedCostPerUnit ?? "N/A"}
            </p>
          </DetailSection>

          <DetailSection title="Profit Margin">
            <p className="text-2xl font-bold">{view.profitMargin ?? "N/A"}</p>
          </DetailSection>
        </div>

        <DetailSection title="Supplier Search">
          <p className="text-gray-300">
            {view.supplierSearch ?? view.supplier ?? "Not recorded."}
          </p>
        </DetailSection>
      </div>

      <div className="grid gap-6 mb-8">
        <StringListSection title="Marketing Angles" items={view.marketingAngles} />
        <StringListSection title="TikTok Ideas" items={view.tiktokIdeas} />
        <StringListSection
          title="Facebook Ad Ideas"
          items={view.facebookAdIdeas}
        />
        <StringListSection title="Alibaba Keywords" items={view.alibabaKeywords} />
        <StringListSection title="Launch Plan" items={view.launchPlan} />
      </div>

      <AgentLogList logs={agentLogs} />
    </div>
  );
}

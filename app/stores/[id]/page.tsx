import Link from "next/link";
import {
  AgentLogList,
  DetailSection,
  MetricGrid,
  StatusBadge,
} from "@/components/opportunity-ui";
import { StoreStatusBadge } from "@/components/store-ui";
import { RecordOrderForm } from "@/components/record-order-form";
import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { isStripeConfigured, isStripeTestMode } from "@/lib/stripe/client";
import { normalizeStoreStatus, STORE_STATUSES } from "@/lib/store/status";
import { STORE_REVENUE_THRESHOLDS } from "@/lib/store/thresholds";
import {
  AGENT_ROLE_LABELS,
  requireStoreById,
} from "@/lib/queries/stores";
import { TASK_STATUSES } from "@/lib/tasks/constants";

export const dynamic = "force-dynamic";

const TASK_STATUS_LABELS: Record<string, string> = {
  [TASK_STATUSES.PENDING]: "Pending",
  [TASK_STATUSES.IN_PROGRESS]: "In Progress",
  [TASK_STATUSES.COMPLETED]: "Completed",
  [TASK_STATUSES.FAILED]: "Failed",
};

function TaskGroup({
  title,
  tasks,
}: {
  title: string;
  tasks: Array<{
    id: number;
    title: string;
    agent: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  }>;
}) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title} ({tasks.length})
      </h3>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="p-3 rounded-lg border border-gray-800 bg-gray-950 text-sm"
          >
            <p className="font-medium text-white">{task.title}</p>
            <p className="text-blue-300 mt-1">Agent: {task.agent}</p>
            <p className="text-xs text-gray-500 mt-1">
              Created {task.createdAt.toLocaleString()}
              {task.completedAt &&
                ` · Completed ${task.completedAt.toLocaleString()}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function stripeCheckoutDisabledReason(
  store: { status: string; products: unknown[] },
  stripeConfigured: boolean
): string | null {
  if (!stripeConfigured) {
    return "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.";
  }
  if (normalizeStoreStatus(store.status) === STORE_STATUSES.KILLED) {
    return "This store is killed and cannot accept payments.";
  }
  if (store.products.length === 0) {
    return "No products on this store. Launch the store or add a product first.";
  }
  return null;
}

export default async function StoreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const { checkout } = await searchParams;
  const store = await requireStoreById(Number(id));

  const stripeConfigured = isStripeConfigured();
  const stripeTestMode = isStripeTestMode();
  const checkoutDisabledReason = stripeCheckoutDisabledReason(
    store,
    stripeConfigured
  );

  const logsByRole = store.agentLogs.reduce(
    (acc, log) => {
      const label = AGENT_ROLE_LABELS[log.agentRole];
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(log);
      return acc;
    },
    {} as Record<string, typeof store.agentLogs>
  );

  return (
    <div className="p-10 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/stores"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to Stores
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-5xl font-bold mb-3">{store.name}</h1>
          <StoreStatusBadge status={store.status} />
        </div>
        {store.opportunity && (
          <Link
            href={`/opportunities/${store.opportunity.id}`}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            View linked opportunity →
          </Link>
        )}
      </div>

      <section className="mb-8">
        <DetailSection title="Store Overview">
          <MetricGrid
            metrics={[
              { label: "Revenue", value: `£${store.revenue.toLocaleString()}` },
              { label: "Niche", value: store.niche },
              { label: "Products", value: store.productCount },
              { label: "Revenue Entries", value: store.revenueEntryCount },
              {
                label: "Customers",
                value: store.commerce.totalCustomers,
              },
              {
                label: "Orders",
                value: store.commerce.totalOrders,
              },
              {
                label: "Avg order value",
                value: `£${store.commerce.averageOrderValue.toLocaleString()}`,
              },
              {
                label: "Created",
                value: store.createdAt.toLocaleDateString(),
              },
            ]}
          />
          {store.opportunity && (
            <div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
              <p>
                <strong className="text-gray-400">Linked opportunity:</strong>{" "}
                {store.opportunity.productName}
              </p>
              <p>
                <strong className="text-gray-400">Opportunity score:</strong>{" "}
                {store.opportunity.opportunityScore ?? "N/A"}/100
              </p>
              <p className="flex items-center gap-2">
                <strong className="text-gray-400">Lifecycle stage:</strong>
                <StatusBadge status={store.opportunity.lifecycleStage} />
              </p>
            </div>
          )}
        </DetailSection>
      </section>

      {checkout === "success" && (
        <div className="mb-6 p-4 rounded-lg border border-green-800 bg-green-950/40 text-green-300 text-sm">
          Payment completed. Your order will appear shortly once Stripe confirms
          the webhook.
        </div>
      )}
      {checkout === "cancelled" && (
        <div className="mb-6 p-4 rounded-lg border border-amber-800 bg-amber-950/40 text-amber-300 text-sm">
          Stripe checkout was cancelled. No payment was taken.
        </div>
      )}

      <section className="mb-8">
        <DetailSection title="Stripe Checkout">
          {stripeTestMode && stripeConfigured && (
            <div className="mb-4 p-3 rounded-lg border border-amber-700 bg-amber-950/30 text-amber-200 text-sm">
              Test mode — payments use Stripe test keys. Use card{" "}
              <code className="text-amber-100">4242 4242 4242 4242</code> with
              any future expiry and CVC.
            </div>
          )}
          <StripeCheckoutButton
            storeId={store.id}
            disabledReason={checkoutDisabledReason}
          />
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Record Order">
          <RecordOrderForm storeId={store.id} />
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Orders">
          {store.orders.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No orders yet. Record a manual order or connect Stripe checkout.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Customer</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {store.orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-900 last:border-0"
                    >
                      <td className="py-3 pr-4 text-gray-300">
                        {order.placedAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-white">
                        {order.customerName ?? order.customerEmail}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{order.source}</td>
                      <td className="py-3 pr-4 text-gray-300">
                        £{order.total.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Product Catalogue">
          {store.products.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No products yet. Gamma creates the catalogue when the store
              launches.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="pb-2 pr-4 font-medium">Product</th>
                    <th className="pb-2 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {store.products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-gray-900 last:border-0"
                    >
                      <td className="py-3 pr-4 text-white">{product.name}</td>
                      <td className="py-3 text-gray-300">
                        £{product.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-4">
            Revenue thresholds: scaling at £
            {STORE_REVENUE_THRESHOLDS.SCALING_MIN_REVENUE.toLocaleString()},
            profitable at £
            {STORE_REVENUE_THRESHOLDS.PROFITABLE_MIN_REVENUE.toLocaleString()}
          </p>
        </DetailSection>
      </section>

      {store.opportunity && (
        <section className="mb-8">
          <DetailSection title="Origin">
            <div className="space-y-4 text-gray-300">
              <div>
                <p className="text-xs text-gray-500 uppercase">Product name</p>
                <p className="font-medium">{store.opportunity.productName}</p>
              </div>
              {store.opportunity.productDescription && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Description</p>
                  <p>{store.opportunity.productDescription}</p>
                </div>
              )}
              {store.opportunity.targetCustomer && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Target customer
                  </p>
                  <p>{store.opportunity.targetCustomer}</p>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Profit margin
                  </p>
                  <p>{store.opportunity.profitMargin ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Supplier</p>
                  <p>{store.opportunity.supplier ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    Why trending
                  </p>
                  <p>{store.opportunity.whyTrending ?? "N/A"}</p>
                </div>
              </div>
            </div>
          </DetailSection>
        </section>
      )}

      <section className="mb-8">
        <DetailSection title="Agent Activity">
          {store.agentLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No agent activity recorded.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(logsByRole).map(([role, logs]) => (
                <div key={role}>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    {role}
                  </h3>
                  <AgentLogList logs={logs} />
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Tasks">
          {Object.values(store.tasks).every((group) => group.length === 0) ? (
            <p className="text-gray-500 text-sm">
              No tasks linked to this store&apos;s opportunity.
            </p>
          ) : (
            <>
              <TaskGroup
                title={TASK_STATUS_LABELS[TASK_STATUSES.PENDING]}
                tasks={store.tasks.pending}
              />
              <TaskGroup
                title={TASK_STATUS_LABELS[TASK_STATUSES.IN_PROGRESS]}
                tasks={store.tasks.in_progress}
              />
              <TaskGroup
                title={TASK_STATUS_LABELS[TASK_STATUSES.COMPLETED]}
                tasks={store.tasks.completed}
              />
              <TaskGroup
                title={TASK_STATUS_LABELS[TASK_STATUSES.FAILED]}
                tasks={store.tasks.failed}
              />
            </>
          )}
        </DetailSection>
      </section>

      <section className="mb-8">
        <DetailSection title="Marketing">
          {store.marketingPlan ? (
            <div className="space-y-6 text-gray-300">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  Launch recommendation
                </h3>
                <p>{store.marketingPlan.launchRecommendation}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  Marketing summary
                </h3>
                <pre className="whitespace-pre-wrap text-sm bg-gray-950 p-4 rounded-lg border border-gray-800">
                  {store.marketingPlan.marketingSummary}
                </pre>
              </div>
              {store.marketingPlan.campaignNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    Campaign notes
                  </h3>
                  <ul className="space-y-2">
                    {store.marketingPlan.campaignNotes.map((note, index) => (
                      <li key={index} className="flex gap-2 text-sm">
                        <span className="text-blue-400 shrink-0">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              No marketing plan yet. Gamma generates this when the marketing task
              completes.
            </p>
          )}
        </DetailSection>
      </section>
    </div>
  );
}

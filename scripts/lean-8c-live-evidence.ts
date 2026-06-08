import { prisma } from "../lib/prisma";
import { requireStoreById } from "../lib/queries/stores";

async function main() {
  const storeId = Number(process.argv[2] ?? 36);
  const store = await requireStoreById(storeId);

  const opp = store.opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: store.opportunityId } })
    : null;

  const latestStripeOrder = await prisma.order.findFirst({
    where: { storeId, source: "stripe" },
    orderBy: { id: "desc" },
    include: { revenues: true, customer: true },
  });

  console.log(
    JSON.stringify(
      {
        store: {
          id: store.id,
          status: store.status,
          revenue: store.revenue,
          productPrice: store.products[0]?.price,
        },
        intelligence: store.commerce,
        opportunity: opp
          ? { id: opp.id, status: opp.status, lifecycleStage: opp.lifecycleStage }
          : null,
        latestStripeOrder: latestStripeOrder
          ? {
              id: latestStripeOrder.id,
              externalId: latestStripeOrder.externalId,
              source: latestStripeOrder.source,
              status: latestStripeOrder.status,
              total: latestStripeOrder.total,
              customer: latestStripeOrder.customer
                ? {
                    email: latestStripeOrder.customer.email,
                    orderCount: latestStripeOrder.customer.orderCount,
                    totalSpent: latestStripeOrder.customer.totalSpent,
                  }
                : null,
              revenues: latestStripeOrder.revenues.map((r) => ({
                id: r.id,
                amount: r.amount,
                orderId: r.orderId,
              })),
            }
          : null,
      },
      null,
      2
    )
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});

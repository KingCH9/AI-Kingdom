import { prisma } from "../lib/prisma";
import { requireStoreById } from "../lib/queries/stores";

async function main() {
  const order = await prisma.order.findFirst({
    where: {
      externalId:
        "cs_test_a1wcMVd5YFzhwL4G0AtCQLrcTvs04wpJkjB3VWnFenb8Q0uPzy8mJoFa56",
    },
    include: { revenues: true, customer: true },
  });
  const store = await requireStoreById(36);
  const opp = await prisma.opportunity.findUnique({ where: { id: 91 } });

  console.log(
    JSON.stringify(
      {
        order: order
          ? {
              id: order.id,
              source: order.source,
              status: order.status,
              externalId: order.externalId,
              total: order.total,
              customer: order.customer
                ? {
                    id: order.customer.id,
                    email: order.customer.email,
                    orderCount: order.customer.orderCount,
                    totalSpent: order.customer.totalSpent,
                  }
                : null,
              revenue: order.revenues[0],
              revenueLinked: order.revenues[0]?.orderId === order.id,
            }
          : null,
        store: { id: 36, revenue: store.revenue, status: store.status },
        intelligence: store.commerce,
        opportunity: opp ? { id: opp.id, status: opp.status } : null,
      },
      null,
      2
    )
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});

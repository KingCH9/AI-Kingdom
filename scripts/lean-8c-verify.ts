/**
 * Lean 8C verification — inspect store commerce state after Stripe checkout tests.
 * Usage: npx tsx scripts/lean-8c-verify.ts [storeId]
 */
import { prisma } from "../lib/prisma";

async function main() {
  const storeId = Number(process.argv[2] ?? 36);
  if (!Number.isFinite(storeId)) {
    console.error("Invalid store id");
    process.exit(1);
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      products: { orderBy: { id: "asc" } },
      opportunity: true,
      orders: {
        orderBy: { placedAt: "desc" },
        take: 10,
        include: {
          customer: true,
          revenues: true,
        },
      },
      revenues: { orderBy: { createdAt: "desc" }, take: 10 },
      customers: { orderBy: { updatedAt: "desc" }, take: 5 },
    },
  });

  if (!store) {
    console.error(`Store #${storeId} not found`);
    process.exit(1);
  }

  const stripeOrders = store.orders.filter((o) => o.source === "stripe");

  console.log(JSON.stringify(
    {
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
        revenue: store.revenue,
        opportunityId: store.opportunityId,
        productCount: store.products.length,
        firstProduct: store.products[0] ?? null,
      },
      opportunity: store.opportunity
        ? {
            id: store.opportunity.id,
            productName: store.opportunity.productName,
            status: store.opportunity.status,
            lifecycleStage: store.opportunity.lifecycleStage,
          }
        : null,
      stripeOrders: stripeOrders.map((o) => ({
        id: o.id,
        externalId: o.externalId,
        total: o.total,
        status: o.status,
        customerEmail: o.customerEmail,
        revenueLinked: o.revenues.map((r) => ({
          id: r.id,
          amount: r.amount,
          orderId: r.orderId,
        })),
      })),
      duplicateSessionIds: (() => {
        const ids = stripeOrders.map((o) => o.externalId).filter(Boolean);
        const counts = new Map<string, number>();
        for (const id of ids) {
          counts.set(id!, (counts.get(id!) ?? 0) + 1);
        }
        return [...counts.entries()].filter(([, c]) => c > 1);
      })(),
      customers: store.customers.map((c) => ({
        id: c.id,
        email: c.email,
        orderCount: c.orderCount,
        totalSpent: c.totalSpent,
      })),
      recentRevenues: store.revenues.map((r) => ({
        id: r.id,
        amount: r.amount,
        orderId: r.orderId,
        createdAt: r.createdAt,
      })),
    },
    null,
    2
  ));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

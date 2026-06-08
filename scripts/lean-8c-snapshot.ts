import { prisma } from "../lib/prisma";
import { requireStoreById } from "../lib/queries/stores";

export async function captureLean8cSnapshot(storeId: number, opportunityId?: number) {
  const store = await requireStoreById(storeId);
  const opp = opportunityId
    ? await prisma.opportunity.findUnique({ where: { id: opportunityId } })
    : store.opportunityId
      ? await prisma.opportunity.findUnique({ where: { id: store.opportunityId } })
      : null;

  const stripeOrderCount = await prisma.order.count({
    where: { storeId, source: "stripe" },
  });
  const revenueCount = await prisma.revenue.count({ where: { storeId } });

  return {
    capturedAt: new Date().toISOString(),
    store: {
      id: store.id,
      status: store.status,
      revenue: store.revenue,
      productPrice: store.products[0]?.price ?? null,
    },
    intelligence: store.commerce,
    opportunity: opp
      ? { id: opp.id, status: opp.status, productName: opp.productName }
      : null,
    counts: { stripeOrders: stripeOrderCount, revenueEntries: revenueCount },
  };
}

async function main() {
  const storeId = Number(process.argv[2] ?? 36);
  const oppId = process.argv[3] ? Number(process.argv[3]) : 91;
  console.log(JSON.stringify(await captureLean8cSnapshot(storeId, oppId), null, 2));
}

main().finally(async () => {
  await prisma.$disconnect();
});

/**
 * Remove Lean 8B.1 validation test artifacts from the database.
 *
 * Run: npx tsx --env-file=.env scripts/cleanup-lean8b1-artifacts.ts
 */
import { prisma } from "../lib/prisma";

async function main() {
  const testStores = await prisma.store.findMany({
    where: {
      OR: [
        { name: { contains: "lean8b1-" } },
        { name: { contains: "lean8b-" } },
      ],
    },
    select: { id: true, name: true },
  });

  const storeIds = testStores.map((store) => store.id);

  if (storeIds.length === 0) {
    console.log(JSON.stringify({ removedStores: 0, message: "No test stores found" }, null, 2));
    return;
  }

  await prisma.revenue.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.order.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.customer.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.product.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.agentLog.deleteMany({ where: { storeId: { in: storeIds } } });
  await prisma.store.deleteMany({ where: { id: { in: storeIds } } });

  console.log(
    JSON.stringify(
      {
        removedStores: testStores.length,
        storeIds,
        storeNames: testStores.map((store) => store.name),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

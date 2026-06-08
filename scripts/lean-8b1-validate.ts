/**
 * Lean 8B.1 validation — run with: npx tsx --env-file=.env scripts/lean-8b1-validate.ts
 */
import { prisma } from "../lib/prisma";
import { recordOrderRevenue } from "../lib/commerce/record-order-revenue";
import { STORE_STATUSES } from "../lib/store/status";
import { normalizeOpportunityStatus } from "../lib/opportunity/status";
import { normalizeStoreStatus } from "../lib/store/status";

const TAG = `lean8b1-${Date.now()}`;

async function cleanupStore(storeId: number) {
  await prisma.revenue.deleteMany({ where: { storeId } });
  await prisma.order.deleteMany({ where: { storeId } });
  await prisma.customer.deleteMany({ where: { storeId } });
}

async function testManualOrder() {
  const store = await prisma.store.create({
    data: { name: `${TAG}-manual`, niche: "test", revenue: 0, status: "launched" },
  });

  const result = await recordOrderRevenue({
    storeId: store.id,
    email: `${TAG}@example.com`,
    total: 100,
    source: "test",
  });

  const [orderCount, revenueCount, customer, refreshed] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id } }),
    prisma.revenue.count({ where: { storeId: store.id } }),
    prisma.customer.findFirst({ where: { storeId: store.id } }),
    prisma.store.findUnique({ where: { id: store.id } }),
  ]);

  const pass =
    result.duplicate === false &&
    orderCount === 1 &&
    revenueCount === 1 &&
    customer?.orderCount === 1 &&
    refreshed?.revenue === 100;

  await cleanupStore(store.id);
  await prisma.store.delete({ where: { id: store.id } });

  return { name: "Manual order atomic write", pass };
}

async function testForcedRollback() {
  const store = await prisma.store.create({
    data: { name: `${TAG}-rollback`, niche: "test", revenue: 0, status: "launched" },
  });

  const before = {
    orders: await prisma.order.count({ where: { storeId: store.id } }),
    revenues: await prisma.revenue.count({ where: { storeId: store.id } }),
    customers: await prisma.customer.count({ where: { storeId: store.id } }),
    revenue: store.revenue,
  };

  let threw = false;
  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          storeId: store.id,
          email: `${TAG}-rollback@example.com`,
          orderCount: 0,
          totalSpent: 0,
        },
      });

      await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          source: "test",
          status: "paid",
          total: 50,
        },
      });

      await tx.customer.update({
        where: { id: customer.id },
        data: { orderCount: { increment: 1 }, totalSpent: { increment: 50 } },
      });

      throw new Error("forced failure after order write");
    });
  } catch (error) {
    threw = error instanceof Error;
  }

  const after = {
    orders: await prisma.order.count({ where: { storeId: store.id } }),
    revenues: await prisma.revenue.count({ where: { storeId: store.id } }),
    customers: await prisma.customer.count({ where: { storeId: store.id } }),
    revenue: (await prisma.store.findUnique({ where: { id: store.id } }))?.revenue,
  };

  const pass =
    threw &&
    after.orders === before.orders &&
    after.revenues === before.revenues &&
    after.customers === before.customers &&
    after.revenue === before.revenue;

  await cleanupStore(store.id);
  await prisma.store.delete({ where: { id: store.id } });

  return { name: "Forced failure rolls back all writes", pass };
}

async function testRepeatCustomer() {
  const store = await prisma.store.create({
    data: { name: `${TAG}-repeat`, niche: "test", revenue: 0, status: "launched" },
  });

  const email = `${TAG}-repeat@example.com`;
  await recordOrderRevenue({ storeId: store.id, email, total: 50, source: "test" });
  await recordOrderRevenue({
    storeId: store.id,
    email: email.toUpperCase(),
    total: 75,
    source: "test",
  });

  const customers = await prisma.customer.findMany({ where: { storeId: store.id } });
  const pass =
    customers.length === 1 &&
    customers[0]?.orderCount === 2 &&
    customers[0]?.totalSpent === 125;

  await cleanupStore(store.id);
  await prisma.store.delete({ where: { id: store.id } });

  return { name: "Repeat customer single row + increment", pass };
}

async function testProfitableSync() {
  const opp = await prisma.opportunity.create({
    data: { productName: `${TAG}-opp`, status: "launched" },
  });

  const store = await prisma.store.create({
    data: {
      name: `${TAG}-profit`,
      niche: "test",
      revenue: 0,
      status: STORE_STATUSES.LAUNCHED,
      opportunityId: opp.id,
    },
  });

  await recordOrderRevenue({
    storeId: store.id,
    email: `${TAG}-profit@example.com`,
    total: 5000,
    source: "test",
  });

  const [finalStore, finalOpp] = await Promise.all([
    prisma.store.findUnique({ where: { id: store.id } }),
    prisma.opportunity.findUnique({ where: { id: opp.id } }),
  ]);

  const pass =
    normalizeStoreStatus(finalStore?.status ?? "") === "profitable" &&
    normalizeOpportunityStatus(finalOpp?.status ?? "") === "profitable" &&
    finalStore?.revenue === 5000;

  await cleanupStore(store.id);
  await prisma.store.delete({ where: { id: store.id } });
  await prisma.opportunity.delete({ where: { id: opp.id } });

  return { name: "£5,000 → store + opportunity profitable", pass };
}

async function main() {
  const results = [
    await testManualOrder(),
    await testForcedRollback(),
    await testRepeatCustomer(),
    await testProfitableSync(),
  ];

  console.log(JSON.stringify(results, null, 2));
  process.exit(results.every((r) => r.pass) ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

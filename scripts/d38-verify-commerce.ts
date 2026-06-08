/**
 * Phase D3.8 — verify commerce pipeline for stores #1–#3.
 * Usage: npx tsx scripts/d38-verify-commerce.ts [--simulate]
 *
 * --simulate  Record test orders via recordOrderRevenue (no Stripe required)
 */
import { prisma } from "../lib/prisma";
import { recordOrderRevenue } from "../lib/commerce/record-order-revenue";
import { getShopAnalyticsSummary } from "../lib/commerce/shop-analytics";
import { isStripeConfigured } from "../lib/stripe/client";

const SIMULATE = process.argv.includes("--simulate");

async function main() {
  console.log("=== Phase D3.8 Commerce Verification ===\n");
  console.log(`Stripe configured: ${isStripeConfigured()}`);
  console.log(`Mode: ${SIMULATE ? "simulate orders" : "report only"}\n`);

  const stores = await prisma.store.findMany({
    where: { id: { in: [1, 2, 3] } },
    include: {
      products: { orderBy: { id: "asc" }, take: 1 },
      opportunity: { select: { id: true, status: true, productName: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { id: "asc" },
  });

  if (stores.length === 0) {
    console.log("No stores #1–#3 found.");
    process.exit(1);
  }

  for (const store of stores) {
    const product = store.products[0];
    console.log(`--- Store #${store.id}: ${store.name} ---`);
    console.log(`  slug: ${store.slug ?? "(none)"}`);
    console.log(`  status: ${store.status}`);
    console.log(`  revenue: £${store.revenue.toFixed(2)}`);
    console.log(`  orders: ${store._count.orders}`);
    console.log(
      `  opportunity: ${store.opportunity ? `#${store.opportunity.id} (${store.opportunity.status})` : "none"}`
    );
    console.log(`  product: ${product ? `${product.name} @ £${product.price}` : "none"}`);

    if (SIMULATE && product && store._count.orders === 0) {
      const externalId = `d38-test-store-${store.id}-${Date.now()}`;
      const result = await recordOrderRevenue({
        storeId: store.id,
        email: `buyer+store${store.id}@ai-empire.test`,
        name: "D3.8 Test Buyer",
        total: product.price,
        currency: "GBP",
        source: "d38_test",
        externalId,
        productId: product.id,
        opportunityId: store.opportunityId,
        lineItemsJson: JSON.stringify([
          {
            name: product.name,
            price: product.price,
            quantity: 1,
            productId: product.id,
          },
        ]),
      });

      console.log(
        `  [simulate] order=${result.orderId} revenue=${result.revenueId} storeStatus=${result.storeStatus}`
      );
    }

    console.log("");
  }

  const [orderCount, revenueTotal, analytics] = await Promise.all([
    prisma.order.count(),
    prisma.revenue.aggregate({ _sum: { amount: true } }),
    getShopAnalyticsSummary(),
  ]);

  const ordersByStore = await prisma.order.groupBy({
    by: ["storeId"],
    _count: { storeId: true },
    _sum: { total: true },
  });

  console.log("=== Summary ===");
  console.log(`Total orders: ${orderCount}`);
  console.log(`Total revenue: £${(revenueTotal._sum.amount ?? 0).toFixed(2)}`);
  console.log(`Page views: ${analytics.pageViews}`);
  console.log(`Checkout starts: ${analytics.checkoutStarts}`);
  console.log(`Purchases: ${analytics.purchases}`);
  console.log(`Conversion rate: ${analytics.conversionRate}%`);
  console.log("\nOrders by store:");
  for (const row of ordersByStore) {
    console.log(
      `  store #${row.storeId}: ${row._count.storeId} orders, £${(row._sum.total ?? 0).toFixed(2)}`
    );
  }

  const linked = await prisma.order.findMany({
    where: { storeId: { in: [1, 2, 3] } },
    select: {
      id: true,
      storeId: true,
      productId: true,
      opportunityId: true,
      total: true,
    },
    orderBy: { id: "asc" },
  });

  console.log("\nLifecycle links (orders):");
  for (const order of linked) {
    console.log(
      `  order #${order.id} store=${order.storeId} product=${order.productId ?? "—"} opp=${order.opportunityId ?? "—"} £${order.total}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

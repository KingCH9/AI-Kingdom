/**
 * Lean 8C tests that do not require Stripe API keys.
 * - Duplicate protection via mocked checkout sessions
 * - Fresh store lifecycle (researching → launched + product)
 *
 * Usage: npx tsx scripts/lean-8c-offline-tests.ts
 */
import { prisma } from "../lib/prisma";
import type Stripe from "stripe";
import { processStripeCheckoutSession } from "../lib/commerce/process-stripe-checkout";
import { ensureStoreForOpportunity } from "../lib/store/link-opportunity";
import { updateOpportunityStatus } from "../lib/opportunity/update-status";
import { ensureProductForStore } from "../lib/store/ensure-product";
import { STORE_STATUSES } from "../lib/store/status";
import { syncStoreStatusForOpportunity } from "../lib/store/sync-lifecycle";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`ASSERT: ${message}`);
}

function mockPaidSession(
  storeId: number,
  sessionId: string,
  email: string,
  amountPence: number,
  productName: string
): Stripe.Checkout.Session {
  return {
    id: sessionId,
    object: "checkout.session",
    payment_status: "paid",
    amount_total: amountPence,
    currency: "gbp",
    created: Math.floor(Date.now() / 1000),
    customer_email: email,
    client_reference_id: String(storeId),
    metadata: {
      storeId: String(storeId),
      customerEmail: email,
      lineItems: JSON.stringify([
        { name: productName, price: amountPence / 100, quantity: 1 },
      ]),
    },
  } as Stripe.Checkout.Session;
}

async function testDuplicateProtection() {
  console.log("\n=== Duplicate protection (mock Stripe sessions) ===");

  const store = await prisma.store.findUnique({
    where: { id: 36 },
    include: { opportunity: true, products: true },
  });
  assert(Boolean(store?.opportunity), "Store #36 + opportunity required");

  if (store!.products.length === 0) {
    await ensureProductForStore(store!.id, store!.opportunity!);
  }

  const beforeCount = await prisma.order.count({
    where: { storeId: 36, source: "stripe" },
  });
  const revenueBefore = store!.revenue;

  const sessionId = `cs_test_lean8c_dup_${Date.now()}`;
  const session = mockPaidSession(
    36,
    sessionId,
    "dup-test@example.com",
    4999,
    store!.products[0]?.name ?? "Test Product"
  );

  const first = await processStripeCheckoutSession(session);
  assert(!first.duplicate, "First ingest not duplicate");

  const second = await processStripeCheckoutSession(session);
  assert(second.duplicate, "Second ingest must be duplicate");

  const orderCount = await prisma.order.count({
    where: { storeId: 36, source: "stripe", externalId: sessionId },
  });
  assert(orderCount === 1, "Only one order row for session id");

  const order = await prisma.order.findFirst({
    where: { source: "stripe", externalId: sessionId },
    include: { revenues: true },
  });
  assert(order && order.revenues.length >= 1, "Revenue linked to order");
  assert(order!.revenues[0].orderId === order!.id, "Revenue.orderId set");

  const afterStore = await prisma.store.findUnique({ where: { id: 36 } });
  assert((afterStore?.revenue ?? 0) > revenueBefore, "Store revenue increased once");

  console.log("Duplicate protection: PASS");
  console.log(`  Orders before: ${beforeCount}, session orders: 1, duplicate re-ingest: true`);
}

async function testFreshStoreLifecycle() {
  console.log("\n=== Fresh store lifecycle ===");

  const suffix = Date.now();
  const productName = `Lean 8C Fresh ${suffix}`;

  const opportunity = await prisma.opportunity.create({
    data: {
      productName,
      productDescription: "Lean 8C lifecycle test",
      category: "Test",
      status: "researching",
      sellingPrice: "£49.99",
      opportunityScore: 85,
      riskRating: 3,
      competition: 25,
      profitMargin: "70%",
    },
  });

  await updateOpportunityStatus({
    opportunityId: opportunity.id,
    newStatus: "validated",
    actor: "validator",
  });
  await updateOpportunityStatus({
    opportunityId: opportunity.id,
    newStatus: "launch_ready",
    actor: "ceo",
  });

  const store = await ensureStoreForOpportunity(opportunity);

  await prisma.store.update({
    where: { id: store.id },
    data: { status: STORE_STATUSES.BUILDING },
  });
  await updateOpportunityStatus({
    opportunityId: opportunity.id,
    newStatus: "building",
    actor: "operator",
  });

  await syncStoreStatusForOpportunity(opportunity.id, STORE_STATUSES.LAUNCHED);
  await updateOpportunityStatus({
    opportunityId: opportunity.id,
    newStatus: "launched",
    actor: "operator",
  });

  const launchedOpp = await prisma.opportunity.findUniqueOrThrow({
    where: { id: opportunity.id },
  });
  await ensureProductForStore(store.id, launchedOpp);

  const finalStore = await prisma.store.findFirst({
    where: { opportunityId: opportunity.id },
    include: { products: true, opportunity: true },
  });

  assert(finalStore !== null, "Store exists");
  assert(finalStore!.products.length > 0, "Product created on launch");
  assert(finalStore!.status === "launched", `Store launched, got ${finalStore!.status}`);
  assert(
    finalStore!.opportunity?.status === "launched",
    `Opportunity launched, got ${finalStore!.opportunity?.status}`
  );
  assert(finalStore!.opportunityId === opportunity.id, "Store linked to opportunity");

  const sessionId = `cs_test_lean8c_fresh_${suffix}`;
  const session = mockPaidSession(
    finalStore!.id,
    sessionId,
    `fresh-${suffix}@example.com`,
    4999,
    finalStore!.products[0].name
  );
  const ingest = await processStripeCheckoutSession(session);
  assert(!ingest.duplicate, "First order on fresh store");

  const withOrder = await prisma.store.findUnique({
    where: { id: finalStore!.id },
    include: {
      orders: { where: { externalId: sessionId }, include: { revenues: true } },
      opportunity: true,
    },
  });

  assert(withOrder!.orders.length === 1, "Order created");
  assert(withOrder!.orders[0].revenues.length >= 1, "Revenue linked");
  assert((withOrder!.revenue ?? 0) > 0, "Store revenue > 0");

  console.log("Fresh store lifecycle: PASS");
  console.log(
    `  Opportunity #${opportunity.id} → store #${finalStore!.id} → order via stripe mock`
  );
}

async function main() {
  await testDuplicateProtection();
  await testFreshStoreLifecycle();
  console.log("\n=== OFFLINE TESTS PASSED ===");
  console.log(
    "\nNote: Real Stripe Checkout (Test 1 UI + card 4242...) requires STRIPE_SECRET_KEY in .env"
  );
}

main()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

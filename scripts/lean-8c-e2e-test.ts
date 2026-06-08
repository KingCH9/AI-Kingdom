/**
 * Lean 8C end-to-end test runner.
 *
 * Tests checkout session creation, payment completion (via Stripe API poll),
 * webhook ingestion, duplicate protection, and fresh-store lifecycle.
 *
 * Requires STRIPE_SECRET_KEY in environment (.env loaded via dotenv).
 * Stripe CLI is optional — completed sessions are ingested via processStripeCheckoutSession.
 *
 * Usage:
 *   npx tsx scripts/lean-8c-e2e-test.ts
 *   npx tsx scripts/lean-8c-e2e-test.ts --skip-fresh
 */
import "dotenv/config";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { createStripeCheckoutSession } from "../lib/commerce/create-stripe-checkout";
import { processStripeCheckoutSession } from "../lib/commerce/process-stripe-checkout";
import { ensureProductForStore } from "../lib/store/ensure-product";
import { ensureStoreForOpportunity } from "../lib/store/link-opportunity";
import { updateOpportunityStatus } from "../lib/opportunity/update-status";
import { executeBuildStoreTask } from "../lib/agents/execution/handlers/build-store";
import { executeMarketingPlanTask } from "../lib/agents/execution/handlers/marketing-plan";
import { findAgentByRole } from "../lib/agents/queries";
import { TASK_STATUSES, TASK_TITLE_PREFIX } from "../lib/tasks/constants";
import { AGENT_ROLES } from "../lib/types";

const STORE_ID = 36;
const TEST_EMAIL = "lean8c-test@example.com";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERT FAILED: ${message}`);
  }
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is required for Lean 8C E2E tests");
  }
  return new Stripe(key);
}

async function ingestCompletedSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    throw new Error(
      `Session ${sessionId} not paid yet (status: ${session.payment_status})`
    );
  }
  return processStripeCheckoutSession(session);
}

async function snapshotStore(storeId: number) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      opportunity: true,
      orders: {
        where: { source: "stripe" },
        include: { revenues: true, customer: true },
        orderBy: { id: "desc" },
      },
      customers: { where: { email: TEST_EMAIL } },
    },
  });
  return store;
}

async function ensureStore36Product() {
  const store = await prisma.store.findUnique({
    where: { id: STORE_ID },
    include: { opportunity: true, products: true },
  });
  if (!store) throw new Error(`Store #${STORE_ID} not found`);
  if (store.products.length > 0) return store;

  if (!store.opportunity) {
    throw new Error(`Store #${STORE_ID} has no opportunity for product seeding`);
  }

  await ensureProductForStore(store.id, store.opportunity);
  return prisma.store.findUnique({
    where: { id: STORE_ID },
    include: { opportunity: true, products: true },
  });
}

async function completeCheckoutInBrowser(url: string): Promise<void> {
  console.log("\n--- Manual step required ---");
  console.log("Open this URL and pay with 4242 4242 4242 4242:");
  console.log(url);
  console.log("Waiting for payment (polling Stripe API every 3s, max 5 min)...\n");
}

async function waitForSessionPaid(
  sessionId: string,
  maxWaitMs = 300_000
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const start = Date.now();
  while Date.now() - start < maxWaitMs) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      return session;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Session ${sessionId} not paid within ${maxWaitMs}ms`);
}

async function test1RealCheckout() {
  console.log("\n========== TEST 1 — Real Stripe Checkout (Store #36) ==========");

  const before = await snapshotStore(STORE_ID);
  assert(Boolean(before), "Store #36 must exist");

  await ensureStore36Product();

  const revenueBefore = before!.revenue;
  const orderCountBefore = before!.orders.length;

  const { url, sessionId } = await createStripeCheckoutSession({
    storeId: STORE_ID,
    customerEmail: TEST_EMAIL,
  });

  console.log(`Created session: ${sessionId}`);
  console.log(`Checkout URL: ${url}`);

  await completeCheckoutInBrowser(url);
  await waitForSessionPaid(sessionId);

  const ingest1 = await ingestCompletedSession(sessionId);
  console.log("First ingestion:", ingest1);

  assert(!ingest1.duplicate, "First ingestion should not be duplicate");

  const after = await snapshotStore(STORE_ID);
  const newOrders = after!.orders.filter((o) => o.externalId === sessionId);
  assert(newOrders.length === 1, "Exactly one order for session");

  const order = newOrders[0];
  assert(order.revenues.length >= 1, "Revenue linked to order");
  assert(order.revenues[0].orderId === order.id, "Revenue.orderId matches order");
  assert(after!.customers.length >= 1, "Customer created/updated");
  assert(after!.revenue > revenueBefore, "Store revenue increased");
  assert(
    after!.opportunity?.status === before!.opportunity?.status ||
      after!.opportunity?.id === before!.opportunity?.id,
    "Opportunity still linked"
  );

  console.log("TEST 1 PASSED");
  return sessionId;
}

async function test2DuplicateProtection(firstSessionId: string) {
  console.log("\n========== TEST 2 — Duplicate Protection ==========");

  const before = await snapshotStore(STORE_ID);
  const orderCountBefore = before!.orders.length;
  const revenueBefore = before!.revenue;

  const { sessionId: sessionId2 } = await createStripeCheckoutSession({
    storeId: STORE_ID,
    customerEmail: TEST_EMAIL,
  });

  console.log(`Second session: ${sessionId2}`);
  const session2 = await createStripeCheckoutSession({
    storeId: STORE_ID,
    customerEmail: TEST_EMAIL,
  });
  // create again to get URL - we already have sessionId2 from above, need URL
  const { url: url2 } = session2;
  console.log(`Second checkout URL: ${url2}`);

  await completeCheckoutInBrowser(url2);
  await waitForSessionPaid(sessionId2);

  const ingest2a = await ingestCompletedSession(sessionId2);
  assert(!ingest2a.duplicate, "Second session first ingest not duplicate");

  const ingest2b = await ingestCompletedSession(sessionId2);
  assert(ingest2b.duplicate, "Second ingest of same session must be duplicate");

  const ingest1Again = await ingestCompletedSession(firstSessionId);
  assert(ingest1Again.duplicate, "Re-ingest first session must be duplicate");

  const after = await snapshotStore(STORE_ID);
  assert(
    after!.orders.length === orderCountBefore + 1,
    "Exactly one new order from second payment"
  );

  const sessionCounts = new Map<string, number>();
  for (const o of after!.orders) {
    if (o.externalId) {
      sessionCounts.set(o.externalId, (sessionCounts.get(o.externalId) ?? 0) + 1);
    }
  }
  for (const [sid, count] of sessionCounts) {
    assert(count === 1, `Session ${sid} must appear once, got ${count}`);
  }

  console.log("TEST 2 PASSED");
}

async function test3FreshStore() {
  console.log("\n========== TEST 3 — Fresh Store Lifecycle ==========");

  const suffix = Date.now();
  const productName = `Lean 8C Test Product ${suffix}`;

  const opportunity = await prisma.opportunity.create({
    data: {
      productName,
      productDescription: "E2E test product for Lean 8C",
      category: "Test",
      status: "researching",
      sellingPrice: "£49.99",
      opportunityScore: 85,
      riskRating: 3,
      competition: 25,
      profitMargin: "70%",
    },
  });

  console.log(`Created opportunity #${opportunity.id} (researching)`);

  const validated = await updateOpportunityStatus({
    opportunityId: opportunity.id,
    newStatus: "validated",
    actor: "validator",
  });
  assert(validated.success, "Must validate");
  console.log("→ validated");

  const launchReady = await updateOpportunityStatus({
    opportunityId: opportunity.id,
    newStatus: "launch_ready",
    actor: "ceo",
  });
  assert(launchReady.success, "Must reach launch_ready");
  console.log("→ launch_ready");

  const store = await ensureStoreForOpportunity(opportunity);
  const buildTask = await prisma.task.create({
    data: {
      title: `${TASK_TITLE_PREFIX.BUILD_STORE}${productName}`,
      agent: "Store Builder",
      status: TASK_STATUSES.PENDING,
      result: "",
      opportunityId: opportunity.id,
    },
  });

  const agent = await findAgentByRole(AGENT_ROLES.STORE_BUILDER);
  await executeBuildStoreTask({
    task: buildTask,
    opportunity,
    agent: agent!,
  });
  console.log(`→ building (store #${store.id})`);

  const marketingTask = await prisma.task.create({
    data: {
      title: `${TASK_TITLE_PREFIX.MARKETING_PLAN}${productName}`,
      agent: "Marketing Manager",
      status: TASK_STATUSES.PENDING,
      result: "",
      opportunityId: opportunity.id,
    },
  });

  const marketingAgent = await findAgentByRole(AGENT_ROLES.MARKETING_MANAGER);
  const refreshedOpp = await prisma.opportunity.findUniqueOrThrow({
    where: { id: opportunity.id },
  });
  await executeMarketingPlanTask({
    task: marketingTask,
    opportunity: refreshedOpp,
    agent: marketingAgent!,
  });
  console.log("→ launched + product created");

  const launchedStore = await prisma.store.findFirst({
    where: { opportunityId: opportunity.id },
    include: { products: true, opportunity: true },
  });
  assert(launchedStore && launchedStore.products.length > 0, "Store must have product");

  const revenueBefore = launchedStore.revenue;
  const { url, sessionId } = await createStripeCheckoutSession({
    storeId: launchedStore.id,
    customerEmail: `fresh-${suffix}@example.com`,
  });

  console.log(`Checkout URL: ${url}`);
  await completeCheckoutInBrowser(url);
  await waitForSessionPaid(sessionId);

  const ingest = await ingestCompletedSession(sessionId);
  assert(!ingest.duplicate, "Fresh store order ingested");

  const final = await prisma.store.findUnique({
    where: { id: launchedStore.id },
    include: {
      opportunity: true,
      orders: { where: { source: "stripe" }, include: { revenues: true } },
    },
  });

  assert(final!.orders.length >= 1, "Order created on fresh store");
  assert(final!.revenue > revenueBefore, "Revenue increased");
  assert(final!.orders[0].revenues.length >= 1, "Revenue linked");
  console.log(
    `Final: store #${final!.id} status=${final!.status}, opp status=${final!.opportunity?.status}`
  );
  console.log("TEST 3 PASSED");
}

async function main() {
  const skipFresh = process.argv.includes("--skip-fresh");

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error(
      "STRIPE_SECRET_KEY is not set. Add sk_test_... to .env before running E2E tests."
    );
    process.exit(1);
  }

  const sessionId1 = await test1RealCheckout();
  await test2DuplicateProtection(sessionId1);

  if (!skipFresh) {
    await test3FreshStore();
  }

  console.log("\n========== ALL TESTS PASSED ==========");
}

main()
  .catch((err) => {
    console.error("\nTEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

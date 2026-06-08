/**
 * Lean 8C duplicate replay test — re-processes an existing Stripe session id.
 * Usage: npx tsx scripts/lean-8c-duplicate-replay.ts [externalId]
 */
import "dotenv/config";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { processStripeCheckoutSession } from "../lib/commerce/process-stripe-checkout";

async function main() {
  const externalId =
    process.argv[2] ??
    (
      await prisma.order.findFirst({
        where: { storeId: 36, source: "stripe" },
        orderBy: { id: "desc" },
        select: { externalId: true, id: true },
      })
    )?.externalId;

  if (!externalId) {
    throw new Error("No stripe order externalId found for store 36");
  }

  const storeBefore = await prisma.store.findUnique({
    where: { id: 36 },
    select: { revenue: true },
  });
  const orderCountBefore = await prisma.order.count({
    where: { storeId: 36, source: "stripe", externalId },
  });
  const revenueCountBefore = await prisma.revenue.count({
    where: { storeId: 36, order: { externalId } },
  });

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  let session: Stripe.Checkout.Session;

  if (key && externalId.startsWith("cs_") && !externalId.includes("lean8c")) {
    const stripe = new Stripe(key);
    session = await stripe.checkout.sessions.retrieve(externalId);
  } else {
    const order = await prisma.order.findFirst({
      where: { externalId },
      include: { store: { include: { products: true } } },
    });
    if (!order) throw new Error(`Order not found for ${externalId}`);

    session = {
      id: externalId,
      object: "checkout.session",
      payment_status: "paid",
      amount_total: Math.round(order.total * 100),
      currency: "gbp",
      created: Math.floor(order.placedAt.getTime() / 1000),
      customer_email: order.customerEmail,
      customer_details: { email: order.customerEmail, name: order.customerName },
      client_reference_id: String(order.storeId),
      metadata: {
        storeId: String(order.storeId),
        customerEmail: order.customerEmail,
        lineItems: order.lineItemsJson ?? "[]",
      },
    } as Stripe.Checkout.Session;
  }

  const result = await processStripeCheckoutSession(session);

  const storeAfter = await prisma.store.findUnique({
    where: { id: 36 },
    select: { revenue: true },
  });
  const orderCountAfter = await prisma.order.count({
    where: { storeId: 36, source: "stripe", externalId },
  });
  const revenueCountAfter = await prisma.revenue.count({
    where: { storeId: 36, order: { externalId } },
  });

  console.log(
    JSON.stringify(
      {
        externalId,
        result: { duplicate: result.duplicate, orderId: result.orderId },
        orderCount: { before: orderCountBefore, after: orderCountAfter },
        revenueCount: { before: revenueCountBefore, after: revenueCountAfter },
        storeRevenue: { before: storeBefore?.revenue, after: storeAfter?.revenue },
        pass:
          result.duplicate === true &&
          orderCountAfter === orderCountBefore &&
          revenueCountAfter === revenueCountBefore &&
          storeAfter?.revenue === storeBefore?.revenue,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

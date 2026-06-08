/**
 * Lean 8C live verification — complete payment + verify pipeline.
 * Uses Stripe test pm_card_visa after checkout session is opened once.
 */
import "dotenv/config";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { createStripeCheckoutSession } from "../lib/commerce/create-stripe-checkout";
import { processStripeCheckoutSession } from "../lib/commerce/process-stripe-checkout";
import { captureLean8cSnapshot } from "./lean-8c-snapshot";

const STORE_ID = 36;
const OPP_ID = 91;
const EMAIL = "lean8c-live@example.com";

async function waitForPaid(stripe: Stripe, sessionId: string, maxMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
    if (session.payment_status === "paid") return session;

    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (pi && session.payment_status === "unpaid") {
      try {
        await stripe.paymentIntents.confirm(pi, {
          payment_method: "pm_card_visa",
          return_url: `${process.env.APP_URL}/stores/${STORE_ID}?checkout=success`,
        });
      } catch {
        // PI may already be confirming
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Session ${sessionId} not paid within ${maxMs}ms`);
}

async function postWebhook(stripe: Stripe, session: Stripe.Checkout.Session) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const payload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  });
  const header = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  const res = await fetch(`${process.env.APP_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": header,
    },
    body: payload,
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const before = await captureLean8cSnapshot(STORE_ID, OPP_ID);
  console.log("BEFORE:", JSON.stringify(before, null, 2));

  const { sessionId, url } = await createStripeCheckoutSession({
    storeId: STORE_ID,
    customerEmail: EMAIL,
  });
  console.log("SESSION:", sessionId);
  console.log("URL:", url);

  // Open session once so Stripe creates payment_intent (hosted checkout requirement)
  await fetch(url, { redirect: "manual" }).catch(() => {});

  let session = await waitForPaid(stripe, sessionId);
  console.log("PAID:", session.payment_status);

  const webhook = await postWebhook(stripe, session);
  console.log("WEBHOOK:", JSON.stringify(webhook, null, 2));

  if (!webhook.body.success || webhook.body.duplicate) {
    throw new Error(`Webhook failed: ${JSON.stringify(webhook.body)}`);
  }

  const order = await prisma.order.findFirst({
    where: { source: "stripe", externalId: sessionId },
    include: { revenues: true, customer: true },
  });

  const duplicate = await postWebhook(stripe, session);
  console.log("DUPLICATE WEBHOOK:", JSON.stringify(duplicate, null, 2));

  const after = await captureLean8cSnapshot(STORE_ID, OPP_ID);
  console.log("AFTER:", JSON.stringify(after, null, 2));

  console.log(
    JSON.stringify(
      {
        sessionId,
        orderId: order?.id ?? webhook.body.orderId,
        revenueId: order?.revenues[0]?.id ?? webhook.body.revenueId,
        revenueLinked: order?.revenues[0]?.orderId === order?.id,
        duplicateProtection: duplicate.body.duplicate === true,
        storeRevenueBefore: before.store.revenue,
        storeRevenueAfter: after.store.revenue,
        opportunityBefore: before.opportunity?.status,
        opportunityAfter: after.opportunity?.status,
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

/**
 * Complete live Lean 8C for an existing checkout session ID.
 */
import "dotenv/config";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { captureLean8cSnapshot } from "./lean-8c-snapshot";

const SESSION_ID =
  process.argv[2] ??
  "cs_test_a1MvqoTP0oELgTqfus40dRgo1WvvN4oZ3yZv8k1WoV2Eb7j9ckuvDPiZps";
const STORE_ID = 36;
const OPP_ID = 91;

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const before = await captureLean8cSnapshot(STORE_ID, OPP_ID);
  console.log("BEFORE:", JSON.stringify(before, null, 2));

  let session = await stripe.checkout.sessions.retrieve(SESSION_ID, {
    expand: ["payment_intent"],
  });
  console.log("SESSION OPEN:", session.status, session.payment_status, session.url?.slice(0, 80));

  if (session.url && session.payment_status !== "paid") {
    await fetch(session.url, { redirect: "manual" });
    await new Promise((r) => setTimeout(r, 3000));
    session = await stripe.checkout.sessions.retrieve(SESSION_ID, {
      expand: ["payment_intent"],
    });
  }

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  console.log("PAYMENT_INTENT:", piId);

  if (session.payment_status !== "paid" && piId) {
    const confirmed = await stripe.paymentIntents.confirm(piId, {
      payment_method: "pm_card_visa",
      return_url: `${process.env.APP_URL}/stores/${STORE_ID}?checkout=success`,
    });
    console.log("PI CONFIRMED:", confirmed.status);
  }

  for (let i = 0; i < 15; i++) {
    session = await stripe.checkout.sessions.retrieve(SESSION_ID);
    if (session.payment_status === "paid") break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("SESSION PAID:", session.payment_status, session.amount_total);

  const payload = JSON.stringify({
    id: `evt_live_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  });
  const sig = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });

  const webhookRes = await fetch(`${process.env.APP_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": sig },
    body: payload,
  });
  const webhookBody = await webhookRes.json();
  console.log("WEBHOOK:", webhookRes.status, JSON.stringify(webhookBody));

  const dupPayload = payload;
  const dupSig = stripe.webhooks.generateTestHeaderString({
    payload: dupPayload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const dupRes = await fetch(`${process.env.APP_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": dupSig },
    body: dupPayload,
  });
  const dupBody = await dupRes.json();
  console.log("DUPLICATE:", dupRes.status, JSON.stringify(dupBody));

  const order = await prisma.order.findFirst({
    where: { source: "stripe", externalId: SESSION_ID },
    include: { revenues: true, customer: true },
  });

  const after = await captureLean8cSnapshot(STORE_ID, OPP_ID);
  console.log("AFTER:", JSON.stringify(after, null, 2));

  console.log(
    "RESULT:",
    JSON.stringify(
      {
        sessionId: SESSION_ID,
        orderId: order?.id ?? webhookBody.orderId,
        revenueId: order?.revenues[0]?.id ?? webhookBody.revenueId,
        revenueOrderId: order?.revenues[0]?.orderId,
        duplicate: dupBody.duplicate,
        storeRevenueBefore: before.store.revenue,
        storeRevenueAfter: after.store.revenue,
        oppStatusBefore: before.opportunity?.status,
        oppStatusAfter: after.opportunity?.status,
        intelligenceBefore: before.intelligence,
        intelligenceAfter: after.intelligence,
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

/**
 * Complete a Stripe Checkout Session in test mode via PaymentIntent confirm.
 * Equivalent to paying with 4242 4242 4242 4242 in test mode.
 */
import "dotenv/config";
import Stripe from "stripe";

const sessionId = process.argv[2];
if (!sessionId) {
  console.error("Usage: npx tsx scripts/lean-8c-complete-payment.ts <sessionId>");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  let session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  console.log("Session status:", session.payment_status, session.status);

  if (session.payment_status === "paid") {
    console.log(JSON.stringify({ alreadyPaid: true, sessionId }, null, 2));
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    throw new Error("No payment_intent on session yet — open checkout URL first");
  }

  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: "pm_card_visa",
    return_url: `${process.env.APP_URL ?? "http://localhost:3000"}/stores/36?checkout=success`,
  });

  console.log("PaymentIntent status:", confirmed.status);

  // Poll until session is paid
  for (let i = 0; i < 20; i++) {
    session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    JSON.stringify(
      {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        customerEmail: session.customer_email ?? session.customer_details?.email,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

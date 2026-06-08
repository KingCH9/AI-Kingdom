import { NextResponse } from "next/server";
import Stripe from "stripe";
import { processStripeCheckoutSession } from "@/lib/commerce/process-stripe-checkout";
import {
  logStripeWebhookIgnored,
  logStripeWebhookProcessed,
  logStripeWebhookReceived,
} from "@/lib/commerce/stripe-webhook-log";
import { getStripeWebhookSecret } from "@/lib/env";

/** Commerce pipeline — only one-time Checkout Sessions create orders today. */
const ORDER_EVENTS = new Set(["checkout.session.completed"]);

/** Subscription/invoice events Stripe may send; acknowledged but not ingested. */
const ACKNOWLEDGED_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "payment_intent.succeeded",
]);

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    console.error("[stripe] webhook rejected — STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { success: false, message: "Stripe webhook is not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { success: false, message: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe] signature verification failed:", error);
    return NextResponse.json(
      { success: false, message: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  logStripeWebhookReceived(event);

  if (ORDER_EVENTS.has(event.type)) {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      const result = await processStripeCheckoutSession(session);

      logStripeWebhookProcessed(event.type, {
        order: result.orderId,
        duplicate: result.duplicate,
        revenue: result.revenueId,
        store: result.storeId,
      });

      return NextResponse.json(
        {
          success: true,
          duplicate: result.duplicate,
          orderId: result.orderId,
          revenueId: result.revenueId,
          storeStatus: result.storeStatus,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("[stripe] webhook processing failed:", error);
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error ? error.message : "Webhook processing failed",
        },
        { status: 422 }
      );
    }
  }

  if (ACKNOWLEDGED_EVENTS.has(event.type)) {
    logStripeWebhookIgnored(event.type);
    return NextResponse.json(
      { success: true, acknowledged: true, type: event.type },
      { status: 200 }
    );
  }

  logStripeWebhookIgnored(event.type);
  return NextResponse.json(
    { success: true, ignored: true, type: event.type },
    { status: 200 }
  );
}

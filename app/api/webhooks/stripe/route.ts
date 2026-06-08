import { NextResponse } from "next/server";
import Stripe from "stripe";
import { processStripeCheckoutSession } from "@/lib/commerce/process-stripe-checkout";
import { getStripeWebhookSecret } from "@/lib/env";

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
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
    console.error("[stripe webhook] signature verification failed:", error);
    return NextResponse.json(
      { success: false, message: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ success: true, ignored: true, type: event.type });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await processStripeCheckoutSession(session);

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      orderId: result.orderId,
      revenueId: result.revenueId,
      storeStatus: result.storeStatus,
    });
  } catch (error) {
    console.error("[stripe webhook] processing failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 422 }
    );
  }
}

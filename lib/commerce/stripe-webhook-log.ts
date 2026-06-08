import type Stripe from "stripe";

const LOG_PREFIX = "[stripe]";

function asRecord(obj: Stripe.Event.Data.Object): Record<string, unknown> | null {
  if (!obj || typeof obj !== "object") return null;
  return obj as Record<string, unknown>;
}

function readCustomerId(obj: Stripe.Event.Data.Object): string | undefined {
  const record = asRecord(obj);
  if (!record) return undefined;
  if (typeof record.customer === "string") return record.customer;
  if (
    record.customer &&
    typeof record.customer === "object" &&
    "id" in record.customer &&
    typeof (record.customer as { id: unknown }).id === "string"
  ) {
    return (record.customer as { id: string }).id;
  }
  return undefined;
}

function readSubscriptionId(obj: Stripe.Event.Data.Object): string | undefined {
  const record = asRecord(obj);
  if (!record) return undefined;
  if (typeof record.subscription === "string") return record.subscription;
  if (
    record.subscription &&
    typeof record.subscription === "object" &&
    "id" in record.subscription
  ) {
    return String((record.subscription as { id: unknown }).id);
  }
  if (typeof record.id === "string" && record.object === "subscription") {
    return record.id;
  }
  return undefined;
}

function readPaymentIntentId(obj: Stripe.Event.Data.Object): string | undefined {
  const record = asRecord(obj);
  if (!record) return undefined;
  if (typeof record.payment_intent === "string") return record.payment_intent;
  if (
    record.payment_intent &&
    typeof record.payment_intent === "object" &&
    "id" in record.payment_intent &&
    typeof (record.payment_intent as { id: unknown }).id === "string"
  ) {
    return (record.payment_intent as { id: string }).id;
  }
  if (typeof record.id === "string" && record.object === "payment_intent") {
    return record.id;
  }
  return undefined;
}

function readCheckoutSessionId(obj: Stripe.Event.Data.Object): string | undefined {
  const record = asRecord(obj);
  if (!record) return undefined;
  if (typeof record.id === "string" && record.object === "checkout.session") {
    return record.id;
  }
  return undefined;
}

function readPaymentStatus(obj: Stripe.Event.Data.Object): string | undefined {
  const record = asRecord(obj);
  if (!record) return undefined;
  if (typeof record.payment_status === "string") return record.payment_status;
  if (typeof record.status === "string") return record.status;
  return undefined;
}

/** Structured log line for every inbound Stripe webhook event. */
export function logStripeWebhookReceived(event: Stripe.Event): void {
  const obj = event.data.object;
  const customerId = readCustomerId(obj);
  const subscriptionId = readSubscriptionId(obj);
  const paymentIntentId = readPaymentIntentId(obj);
  const checkoutSessionId = readCheckoutSessionId(obj);
  const paymentStatus = readPaymentStatus(obj);

  const parts = [
    `${LOG_PREFIX} webhook received`,
    `type=${event.type}`,
    `event=${event.id}`,
  ];

  if (customerId) parts.push(`customer=${customerId}`);
  if (subscriptionId) parts.push(`subscription=${subscriptionId}`);
  if (paymentIntentId) parts.push(`payment_intent=${paymentIntentId}`);
  if (checkoutSessionId) parts.push(`session=${checkoutSessionId}`);
  if (paymentStatus) parts.push(`status=${paymentStatus}`);

  console.log(parts.join(" "));
}

export function logStripeWebhookIgnored(eventType: string): void {
  console.log(
    `${LOG_PREFIX} webhook acknowledged (no handler) type=${eventType}`
  );
}

export function logStripeWebhookProcessed(
  eventType: string,
  details: Record<string, string | number | boolean>
): void {
  const detailStr = Object.entries(details)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`${LOG_PREFIX} webhook processed type=${eventType} ${detailStr}`);
}

import type Stripe from "stripe";
import { recordOrderRevenue } from "@/lib/commerce/record-order-revenue";

export function parseStoreIdFromStripeSession(
  session: Stripe.Checkout.Session
): number | null {
  const metadataStoreId = session.metadata?.storeId;
  if (metadataStoreId) {
    const parsed = Number.parseInt(metadataStoreId, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (session.client_reference_id) {
    const parsed = Number.parseInt(session.client_reference_id, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function parseOptionalId(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function processStripeCheckoutSession(
  session: Stripe.Checkout.Session
) {
  const storeId = parseStoreIdFromStripeSession(session);
  if (!storeId) {
    throw new Error(
      "Missing storeId — set metadata.storeId or client_reference_id on Checkout Session"
    );
  }

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.customerEmail;

  if (!email) {
    throw new Error("Checkout session missing customer email");
  }

  const amountTotal = session.amount_total;
  if (amountTotal == null || amountTotal <= 0) {
    throw new Error("Checkout session missing amount_total");
  }

  const total = amountTotal / 100;
  const currency = (session.currency ?? "gbp").toUpperCase();
  const name =
    session.customer_details?.name ?? session.metadata?.customerName ?? null;

  const lineItemsJson = (() => {
    const raw = session.metadata?.lineItems;
    if (!raw) return "[]";
    try {
      return JSON.stringify(JSON.parse(raw));
    } catch {
      return "[]";
    }
  })();

  const productId = parseOptionalId(session.metadata?.productId);
  const opportunityId = parseOptionalId(session.metadata?.opportunityId);

  const result = await recordOrderRevenue({
    storeId,
    email,
    name,
    total,
    currency,
    source: "stripe",
    externalId: session.id,
    lineItemsJson,
    placedAt: session.created ? new Date(session.created * 1000) : new Date(),
    customerExternalId:
      typeof session.customer === "string" ? session.customer : null,
    productId,
    opportunityId,
  });

  if (!result.duplicate) {
    console.log(
      `[checkout] order completed store=${storeId} order=${result.orderId} amount=${total.toFixed(2)} ${currency}`
    );
  } else {
    console.log(
      `[checkout] duplicate session store=${storeId} order=${result.orderId}`
    );
  }

  return result;
}

import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/env";

let stripeClient: Stripe | null = null;

/** Returns configured Stripe SDK client. Throws if STRIPE_SECRET_KEY is missing. */
export function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

/** True when STRIPE_SECRET_KEY is set. */
export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

/** True when using Stripe test mode keys (sk_test_). */
export function isStripeTestMode(): boolean {
  const key = getStripeSecretKey();
  return key?.startsWith("sk_test_") ?? false;
}

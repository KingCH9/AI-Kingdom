import "dotenv/config";
import Stripe from "stripe";
import { getStripeSecretKey, getStripeWebhookSecret, getAppUrl } from "../lib/env";
import { getStripeClient, isStripeConfigured, isStripeTestMode } from "../lib/stripe/client";

async function main() {
  const secretKey = getStripeSecretKey();
  const webhookSecret = getStripeWebhookSecret();
  const appUrl = getAppUrl();

  const results = {
    STRIPE_SECRET_KEY: secretKey ? `loaded (${secretKey.slice(0, 12)}...)` : "MISSING",
    STRIPE_WEBHOOK_SECRET: webhookSecret ? "loaded" : "MISSING",
    APP_URL: appUrl,
    isStripeConfigured: isStripeConfigured(),
    isStripeTestMode: isStripeTestMode(),
    sdkInit: "pending" as string,
  };

  try {
    const client = getStripeClient();
    const balance = await client.balance.retrieve();
    results.sdkInit = `ok (livemode=${balance.livemode})`;
  } catch (e) {
    results.sdkInit = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  console.log(JSON.stringify(results, null, 2));
  if (!secretKey || !webhookSecret) process.exit(1);
}

main();

import "dotenv/config";
import { createStripeCheckoutSession } from "../lib/commerce/create-stripe-checkout";

async function main() {
  const storeId = Number(process.argv[2] ?? 36);
  const email = process.argv[3] ?? "lean8c-test@example.com";

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error("STRIPE_SECRET_KEY missing");
    process.exit(1);
  }

  const session = await createStripeCheckoutSession({ storeId, customerEmail: email });
  console.log(JSON.stringify(session, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

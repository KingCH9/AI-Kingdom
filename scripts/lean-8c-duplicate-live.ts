import "dotenv/config";
import Stripe from "stripe";
import { prisma } from "../lib/prisma";
import { processStripeCheckoutSession } from "../lib/commerce/process-stripe-checkout";
import { requireStoreById } from "../lib/queries/stores";

const SESSION_ID =
  process.argv[2] ??
  "cs_test_a1wcMVd5YFzhwL4G0AtCQLrcTvs04wpJkjB3VWnFenb8Q0uPzy8mJoFa56";

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const storeBefore = await prisma.store.findUnique({
    where: { id: 36 },
    select: { revenue: true },
  });
  const orderCountBefore = await prisma.order.count({
    where: { externalId: SESSION_ID, source: "stripe" },
  });
  const revenueCountBefore = await prisma.revenue.count({
    where: { order: { externalId: SESSION_ID } },
  });

  const session = await stripe.checkout.sessions.retrieve(SESSION_ID);
  const result = await processStripeCheckoutSession(session);

  const storeAfter = await prisma.store.findUnique({
    where: { id: 36 },
    select: { revenue: true },
  });
  const orderCountAfter = await prisma.order.count({
    where: { externalId: SESSION_ID, source: "stripe" },
  });
  const revenueCountAfter = await prisma.revenue.count({
    where: { order: { externalId: SESSION_ID } },
  });

  console.log(
    JSON.stringify(
      {
        sessionId: SESSION_ID,
        duplicate: result.duplicate,
        orderId: result.orderId,
        revenueId: result.revenueId,
        orderCount: { before: orderCountBefore, after: orderCountAfter },
        revenueCount: { before: revenueCountBefore, after: revenueCountAfter },
        storeRevenue: { before: storeBefore?.revenue, after: storeAfter?.revenue },
        pass:
          result.duplicate === true &&
          orderCountAfter === orderCountBefore &&
          revenueCountAfter === revenueCountBefore &&
          storeAfter?.revenue === storeBefore?.revenue,
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

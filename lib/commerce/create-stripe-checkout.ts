import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/client";
import { normalizeStoreStatus, STORE_STATUSES } from "@/lib/store/status";

export type CreateStripeCheckoutInput = {
  storeId: number;
  customerEmail?: string;
  storeSlug?: string;
};

export type CreateStripeCheckoutResult = {
  url: string;
  sessionId: string;
};

export class StripeCheckoutError extends Error {
  constructor(
    message: string,
    readonly code:
      | "STRIPE_NOT_CONFIGURED"
      | "STORE_NOT_FOUND"
      | "STORE_KILLED"
      | "NO_PRODUCT"
      | "INVALID_PRICE"
      | "STRIPE_SESSION_FAILED"
  ) {
    super(message);
    this.name = "StripeCheckoutError";
  }
}

function toUnitAmount(price: number): number {
  return Math.round(price * 100);
}

/**
 * Creates a Stripe Checkout Session for the store's first product.
 * Session metadata is consumed by the existing webhook → recordOrderRevenue pipeline.
 */
export async function createStripeCheckoutSession(
  input: CreateStripeCheckoutInput
): Promise<CreateStripeCheckoutResult> {
  try {
    getStripeClient();
  } catch {
    throw new StripeCheckoutError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
      "STRIPE_NOT_CONFIGURED"
    );
  }

  const store = await prisma.store.findUnique({
    where: { id: input.storeId },
    include: {
      products: {
        orderBy: { id: "asc" },
        take: 1,
      },
    },
  });

  if (!store) {
    throw new StripeCheckoutError(
      `Store #${input.storeId} not found`,
      "STORE_NOT_FOUND"
    );
  }

  if (normalizeStoreStatus(store.status) === STORE_STATUSES.KILLED) {
    throw new StripeCheckoutError(
      "Cannot create checkout for a killed store",
      "STORE_KILLED"
    );
  }

  const product = store.products[0];
  if (!product) {
    throw new StripeCheckoutError(
      "This store has no products. Launch the store or add a product before accepting Stripe payments.",
      "NO_PRODUCT"
    );
  }

  const unitAmount = toUnitAmount(product.price);
  if (unitAmount <= 0) {
    throw new StripeCheckoutError(
      "Product price must be greater than zero",
      "INVALID_PRICE"
    );
  }

  const email = input.customerEmail?.trim().toLowerCase();
  const lineItems = [
    {
      name: product.name,
      price: product.price,
      quantity: 1,
      productId: product.id,
    },
  ];

  const stripe = getStripeClient();
  const baseUrl = getAppUrl();
  const slug = input.storeSlug ?? store.slug ?? String(store.id);
  const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&store=${encodeURIComponent(slug)}`;
  const cancelUrl = `${baseUrl}/checkout/cancel?store=${encodeURIComponent(slug)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: String(store.id),
    ...(email ? { customer_email: email } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: unitAmount,
          product_data: {
            name: product.name,
          },
        },
      },
    ],
    metadata: {
      storeId: String(store.id),
      productId: String(product.id),
      storeSlug: slug,
      ...(store.opportunityId
        ? { opportunityId: String(store.opportunityId) }
        : {}),
      lineItems: JSON.stringify(lineItems),
      ...(email ? { customerEmail: email } : {}),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  if (!session.url) {
    throw new StripeCheckoutError(
      "Stripe did not return a checkout URL",
      "STRIPE_SESSION_FAILED"
    );
  }

  console.log(
    `[stripe] checkout created store=${store.id} session=${session.id} product=${product.id}`
  );

  return {
    url: session.url,
    sessionId: session.id,
  };
}

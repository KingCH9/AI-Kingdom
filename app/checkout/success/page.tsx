import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

function formatPrice(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; store?: string }>;
}) {
  const { session_id: sessionId, store: storeSlug } = await searchParams;

  let orderSummary: {
    productName: string;
    total: number;
    currency: string;
    storeName: string;
    storeSlug: string | null;
  } | null = null;

  if (sessionId) {
    const order = await prisma.order.findFirst({
      where: { externalId: sessionId, source: "stripe" },
      include: {
        store: { select: { name: true, slug: true } },
        product: { select: { name: true } },
      },
    });

    if (order) {
      orderSummary = {
        productName: order.product?.name ?? "Your order",
        total: order.total,
        currency: order.currency,
        storeName: order.store.name,
        storeSlug: order.store.slug,
      };
    }
  }

  const shopSlug = orderSummary?.storeSlug ?? storeSlug ?? null;

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-stone-900 mb-3">
          Thank you for your order!
        </h1>
        <p className="text-stone-600 mb-8">
          {orderSummary
            ? `Your payment for ${orderSummary.productName} was successful.`
            : "Your payment was successful. Order confirmation will arrive by email."}
        </p>

        {orderSummary && (
          <div className="mb-8 p-6 rounded-2xl bg-white border border-stone-200 shadow-sm text-left">
            <p className="text-sm text-stone-500 uppercase tracking-wide">
              Order summary
            </p>
            <p className="mt-2 font-semibold text-stone-900">
              {orderSummary.storeName}
            </p>
            <p className="text-stone-700">{orderSummary.productName}</p>
            <p className="mt-3 text-2xl font-bold text-emerald-700">
              {formatPrice(orderSummary.total, orderSummary.currency)}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {shopSlug && (
            <Link
              href={`/shop/${shopSlug}`}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
            >
              Back to store
            </Link>
          )}
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors"
          >
            AI Empire home
          </Link>
        </div>

        {!isStripeConfigured() && (
          <p className="mt-8 text-xs text-stone-400">
            Stripe test mode — no real charge processed.
          </p>
        )}
      </div>
    </main>
  );
}

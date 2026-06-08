import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopBuyButton } from "@/components/product-page/shop-buy-button";
import { getShopPageBySlug } from "@/lib/product-page/queries";
import { isStripeConfigured } from "@/lib/stripe/client";
import { normalizeStoreStatus, STORE_STATUSES } from "@/lib/store/status";

export const dynamic = "force-dynamic";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(price);
}

function checkoutDisabledReason(
  store: { status: string; products: unknown[] },
  stripeConfigured: boolean
): string | null {
  if (!stripeConfigured) {
    return "Online checkout coming soon — contact us to order.";
  }
  if (normalizeStoreStatus(store.status) === STORE_STATUSES.KILLED) {
    return "This store is no longer accepting orders.";
  }
  if (store.products.length === 0) {
    return "Product unavailable.";
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}): Promise<Metadata> {
  const { storeSlug } = await params;
  const shop = await getShopPageBySlug(storeSlug);

  if (!shop) {
    return { title: "Store not found" };
  }

  return {
    title: shop.page.seoTitle,
    description: shop.page.seoDescription,
  };
}

export default async function ShopProductPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;
  const shop = await getShopPageBySlug(storeSlug);

  if (!shop) {
    notFound();
  }

  const { store, product, page, benefits, features, faq } = shop;
  const stripeConfigured = isStripeConfigured();
  const disabledReason = checkoutDisabledReason(store, stripeConfigured);

  return (
    <div className="min-h-full">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-500 uppercase tracking-wide">
            {store.niche}
          </span>
          <span className="text-lg font-bold text-stone-900">{product.name}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="aspect-square rounded-2xl bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center shadow-inner">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-stone-600 font-medium">Product image</p>
              <p className="text-sm text-stone-500 mt-1">Coming soon</p>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold text-stone-900 leading-tight">
              {page.heroHeadline}
            </h1>
            <p className="mt-3 text-xl text-stone-600">{page.subheadline}</p>
            <p className="mt-6 text-3xl font-bold text-emerald-700">
              {formatPrice(product.price)}
            </p>
            <div className="mt-8">
              <ShopBuyButton
                storeId={store.id}
                label={page.ctaText}
                disabledReason={disabledReason}
              />
            </div>
          </div>
        </div>

        <section className="mt-16 prose prose-stone max-w-none">
          {page.salesCopy.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="text-stone-700 leading-relaxed mb-4">
              {paragraph}
            </p>
          ))}
        </section>

        {benefits.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Why you&apos;ll love it</h2>
            <ul className="grid sm:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex gap-3 p-4 rounded-xl bg-white border border-stone-200 shadow-sm"
                >
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span className="text-stone-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {features.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">Features</h2>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3 text-stone-700">
                  <span className="text-stone-400">•</span>
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        )}

        {faq.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-stone-900 mb-6">
              Frequently asked questions
            </h2>
            <dl className="space-y-6">
              {faq.map((item) => (
                <div
                  key={item.question}
                  className="p-5 rounded-xl bg-white border border-stone-200"
                >
                  <dt className="font-semibold text-stone-900">{item.question}</dt>
                  <dd className="mt-2 text-stone-600">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-16 p-8 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
          <p className="text-2xl font-bold text-stone-900">{formatPrice(product.price)}</p>
          <div className="mt-4 flex justify-center">
            <ShopBuyButton
              storeId={store.id}
              label={page.ctaText}
              disabledReason={disabledReason}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 mt-16 py-8 text-center text-sm text-stone-500">
        Powered by AI Empire
      </footer>
    </div>
  );
}

import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: storeSlug } = await searchParams;

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-6">↩️</div>
        <h1 className="text-3xl font-bold text-stone-900 mb-3">
          Checkout cancelled
        </h1>
        <p className="text-stone-600 mb-8">
          No payment was taken. You can return to the store and try again when
          you&apos;re ready.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {storeSlug && (
            <Link
              href={`/shop/${storeSlug}`}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
            >
              Return to store
            </Link>
          )}
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors"
          >
            AI Empire home
          </Link>
        </div>
      </div>
    </main>
  );
}

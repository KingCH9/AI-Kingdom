"use client";

import { useState } from "react";

export function ShopBuyButton({
  storeId,
  storeSlug,
  label,
  disabledReason,
}: {
  storeId: number;
  storeSlug: string;
  label: string;
  disabledReason?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, storeSlug }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        url?: string;
        message?: string;
      };

      if (!response.ok || !result.success || !result.url) {
        setError(result.message ?? "Checkout unavailable");
        setLoading(false);
        return;
      }

      window.location.href = result.url;
    } catch {
      setError("Checkout unavailable. Please try again.");
      setLoading(false);
    }
  }

  const disabled = Boolean(disabledReason) || loading;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Redirecting..." : label}
      </button>
      {disabledReason && (
        <p className="text-sm text-amber-700">{disabledReason}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

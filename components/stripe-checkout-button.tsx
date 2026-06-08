"use client";

import { useState } from "react";
import { createStripeCheckoutAction } from "@/app/actions/empire-mutations";

export function StripeCheckoutButton({
  storeId,
  disabledReason,
}: {
  storeId: number;
  disabledReason?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    const result = await createStripeCheckoutAction({
      storeId,
      email: email.trim() || undefined,
    });

    if (!result.success) {
      setError(result.message ?? "Failed to start Stripe checkout");
      setLoading(false);
      return;
    }

    window.location.href = result.url;
  }

  const disabled = Boolean(disabledReason) || loading;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 uppercase mb-1">
          Customer email (optional)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Prefill on Stripe Checkout"
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={startCheckout}
        disabled={disabled}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Redirecting..." : "Pay with Stripe (Test)"}
      </button>

      {disabledReason && (
        <p className="text-sm text-amber-400">{disabledReason}</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

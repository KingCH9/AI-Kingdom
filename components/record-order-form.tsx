"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recordOrderAction } from "@/app/actions/empire-mutations";

export function RecordOrderForm({ storeId }: { storeId: number }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [total, setTotal] = useState("100");
  const [source, setSource] = useState("manual");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const parsedTotal = Number.parseFloat(total);
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      setMessage("Enter a valid order total.");
      setLoading(false);
      return;
    }

    const result = await recordOrderAction({
      storeId,
      email,
      name: name.trim() || undefined,
      total: parsedTotal,
      source: source.trim() || "manual",
    });

    if (!result.success) {
      setMessage(result.message ?? "Failed to record order.");
      setLoading(false);
      return;
    }

    setMessage(
      result.duplicate
        ? `Order already recorded — store total £${result.totalRevenue.toLocaleString()} (${result.storeStatus})`
        : `Order #${result.orderId} recorded — £${result.amount} · store total £${result.totalRevenue.toLocaleString()} (${result.storeStatus})`
    );
    setEmail("");
    setName("");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 uppercase mb-1">
          Customer email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 uppercase mb-1">
          Customer name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase mb-1">
            Order total (£)
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase mb-1">
            Source
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Recording..." : "Record order"}
      </button>
      {message && <p className="text-sm text-gray-300">{message}</p>}
    </form>
  );
}

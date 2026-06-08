"use client";

import { useEffect, useState } from "react";
import { recordStoreRevenueAction } from "@/app/actions/empire-mutations";

interface RevenueEntry {
  id: number;
  amount: number;
  source: string;
  store?: { name: string };
}

interface StoreOption {
  id: number;
  name: string;
  revenue: number;
  status: string;
}

export default function RevenuePage() {
  const [revenue, setRevenue] = useState<RevenueEntry[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number | "">("");
  const [amount, setAmount] = useState("100");
  const [message, setMessage] = useState<string | null>(null);

  const loadRevenue = async () => {
    const res = await fetch("/api/revenue");
    const data = await res.json();
    setRevenue(data);
  };

  const loadStores = async () => {
    const res = await fetch("/api/stores");
    const data = await res.json();
    setStores(data);
    if (data.length > 0 && storeId === "") {
      setStoreId(data[0].id);
    }
  };

  const recordSale = async () => {
    setMessage(null);

    if (storeId === "") {
      setMessage("Select a store first.");
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage("Enter a valid positive amount.");
      return;
    }

    const result = await recordStoreRevenueAction({
      storeId: Number(storeId),
      amount: parsedAmount,
      source: "manual_sale",
    });

    if (!result.success) {
      setMessage(result.message ?? "Failed to record revenue.");
      return;
    }

    setMessage(
      `Recorded £${result.amount} — store total £${result.totalRevenue.toLocaleString()} (${result.storeStatus})`
    );
    loadRevenue();
    loadStores();
  };

  useEffect(() => {
    loadRevenue();
    loadStores();
  }, []);

  return (
    <div className="p-10 max-w-3xl text-white">
      <h1 className="text-4xl font-bold mb-6">Revenue</h1>

      <div className="border border-gray-700 rounded-xl p-6 bg-gray-900 mb-8 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Store</label>
          <select
            value={storeId}
            onChange={(e) =>
              setStoreId(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2"
          >
            {stores.length === 0 ? (
              <option value="">No stores available</option>
            ) : (
              stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} — £{store.revenue.toLocaleString()} ({store.status})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount (£)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2"
          />
        </div>

        <button
          onClick={recordSale}
          disabled={stores.length === 0}
          className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg font-medium"
        >
          Record Sale
        </button>

        {message && <p className="text-sm text-gray-300">{message}</p>}
      </div>

      <h2 className="text-xl font-semibold mb-4">Recent Revenue</h2>
      {revenue.length === 0 ? (
        <p className="text-gray-500 text-sm">No revenue recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {revenue.map((item) => (
            <li
              key={item.id}
              className="border border-gray-800 rounded-lg p-4 bg-gray-950"
            >
              <p className="font-medium">{item.source}</p>
              <p className="text-gray-300">Amount: £{item.amount}</p>
              <p className="text-gray-400 text-sm">
                Store: {item.store?.name ?? "Unknown"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

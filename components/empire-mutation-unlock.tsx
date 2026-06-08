"use client";

import { useState } from "react";
import { authenticateEmpireSessionAction } from "@/app/actions/empire-mutations";

export function EmpireMutationUnlock() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function unlock() {
    setLoading(true);
    setMessage(null);

    try {
      const result = await authenticateEmpireSessionAction(token);

      if (!result.success) {
        setMessage(result.message ?? "Authentication failed");
        return;
      }

      setMessage("Mutations unlocked for this browser session.");
      setToken("");
    } catch {
      setMessage("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10 pt-6 border-t border-blue-800">
      <p className="text-sm text-blue-200 mb-2 font-semibold">Mutation access</p>
      <p className="text-xs text-blue-300/80 mb-3">
        Production requires API key or admin password once per session.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="API key or admin password"
        className="w-full mb-2 px-2 py-1.5 rounded bg-blue-950 border border-blue-700 text-sm"
      />
      <button
        type="button"
        onClick={unlock}
        disabled={loading || token.length === 0}
        className="w-full px-2 py-1.5 rounded bg-blue-800 hover:bg-blue-700 text-sm disabled:opacity-50"
      >
        {loading ? "Unlocking..." : "Unlock mutations"}
      </button>
      {message && <p className="text-xs text-blue-200 mt-2">{message}</p>}
    </div>
  );
}

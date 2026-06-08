"use client";

import { useEffect, useState } from "react";
import { runTrendHunterAction } from "@/app/actions/empire-mutations";

interface Agent {
  id: number;
  name: string;
  role: string;
  level: number;
  xp: number;
  status: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAgents() {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      setAgents(data);
    } catch (error) {
      console.error("Failed to load agents:", error);
    }
  }

  async function runTrendHunter() {
    try {
      setLoading(true);

      const result = await runTrendHunterAction();

      if (result.success) {
        alert("Opportunity generated!");
      } else {
        alert(result.message ?? "Failed to generate opportunity");
      }

      loadAgents();
    } catch (error) {
      console.error(error);
      alert("Error running agent");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgents();

    const interval = setInterval(() => {
      loadAgents();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <h1 className="text-5xl font-bold mb-4">
        🤖 AI Agents
      </h1>

      <p className="text-zinc-400 mb-8">
        Autonomous ecommerce intelligence team
      </p>

      <div className="flex flex-wrap gap-4 mb-8">
        <a
          href="/agents/work-queue"
          className="px-6 py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-xl font-bold"
        >
          ⚙️ Agent Work Queue
        </a>
      </div>

      <button
        onClick={runTrendHunter}
        disabled={loading}
        className="mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold disabled:opacity-50"
      >
        {loading
          ? "⏳ Running Trend Hunter..."
          : "🚀 Run Trend Hunter"}
      </button>

      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 font-bold p-4 border-b border-zinc-700">
          <div>Name</div>
          <div>Role</div>
          <div>Level</div>
          <div>XP</div>
          <div>Status</div>
        </div>

        {agents.map((agent) => (
          <div
            key={agent.id}
            className="grid grid-cols-5 p-4 border-b border-zinc-800"
          >
            <div>{agent.name}</div>

            <div>{agent.role}</div>

            <div>
              ⭐ Level {agent.level}
            </div>

            <div>
              {agent.xp}/100 XP
            </div>

            <div>{agent.status}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
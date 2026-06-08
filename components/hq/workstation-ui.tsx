import Link from "next/link";
import { formatGbp } from "@/components/hq/finance-ui";

export function TrendBadge({
  trend,
}: {
  trend: "rising" | "stable" | "early";
}) {
  const styles = {
    rising: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    stable: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    early: "bg-gray-500/20 text-gray-400 border-gray-600",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs border capitalize ${styles[trend]}`}
    >
      {trend}
    </span>
  );
}

export function AgentCard({
  agent,
  showLink = true,
}: {
  agent: {
    agentKey: string;
    name: string;
    avatarEmoji: string;
    title: string;
    departmentName: string;
    level: number;
    xp: number;
    score: number;
    rank: number;
    revenueInfluenced: number;
    performanceTrend: "rising" | "stable" | "early";
    isAggregate?: boolean;
  };
  showLink?: boolean;
}) {
  const inner = (
    <div className="p-4 rounded-xl border border-gray-700 bg-gray-900 hover:border-gray-600 transition-colors h-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-2xl">{agent.avatarEmoji}</span>
        <span className="text-xs text-gray-500">#{agent.rank}</span>
      </div>
      <p className="font-semibold">{agent.name}</p>
      <p className="text-xs text-gray-500">{agent.title}</p>
      <p className="text-xs text-gray-600 mt-1">{agent.departmentName}</p>
      <div className="flex flex-wrap gap-2 mt-3 text-sm">
        <span className="text-amber-300">Score {agent.score}</span>
        <span className="text-gray-500">·</span>
        <span>L{agent.level}</span>
        <span className="text-gray-500">·</span>
        <span>{agent.xp} XP</span>
      </div>
      <p className="text-xs text-green-400 mt-2">
        {formatGbp(agent.revenueInfluenced)} influenced
      </p>
      <div className="mt-2">
        <TrendBadge trend={agent.performanceTrend} />
      </div>
    </div>
  );

  if (showLink) {
    return (
      <Link href={`/hq/agents/${agent.agentKey}`} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function ScoutCard({
  scout,
  showLink = true,
}: {
  scout: {
    scoutKey: string;
    name: string;
    level: number;
    xp: number;
    score: number;
    rank: number;
    revenueGenerated: number;
    successRate: number;
    performanceTrend: "rising" | "stable" | "early";
  };
  showLink?: boolean;
}) {
  const inner = (
    <div className="p-4 rounded-xl border border-emerald-500/20 bg-gray-900 hover:border-emerald-500/40 transition-colors h-full">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-2xl">🔎</span>
        <span className="text-xs text-gray-500">#{scout.rank}</span>
      </div>
      <p className="font-semibold text-emerald-300">{scout.name}</p>
      <div className="flex flex-wrap gap-2 mt-2 text-sm">
        <span className="text-emerald-300">Score {scout.score}</span>
        <span className="text-gray-500">·</span>
        <span>L{scout.level}</span>
        <span className="text-gray-500">·</span>
        <span>{scout.xp} XP</span>
      </div>
      <p className="text-xs text-green-400 mt-2">
        {formatGbp(scout.revenueGenerated)} revenue
      </p>
      <p className="text-xs text-gray-500 mt-1">{scout.successRate}% success</p>
      <div className="mt-2">
        <TrendBadge trend={scout.performanceTrend} />
      </div>
    </div>
  );

  if (showLink) {
    return (
      <Link href={`/hq/scouts/${scout.scoutKey}`} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

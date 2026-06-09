export type LeaderboardEntry = {
  rank: number;
  key: string;
  name: string;
  xp: number;
  level: number;
  score: number;
  revenue: number;
  department?: string;
};

export type VentureLeaderboardEntry = {
  rank: number;
  ventureTypeKey: string;
  name: string;
  missionCount: number;
  revenue: number;
  score: number;
};

export type LeaderboardSnapshot = {
  topAgents: LeaderboardEntry[];
  topScouts: LeaderboardEntry[];
  topDepartments: LeaderboardEntry[];
  topVentures: VentureLeaderboardEntry[];
};

type AgentRow = {
  agentKey: string;
  department: string;
  xp: number;
  level: number;
  score: number;
  revenueInfluenced: number;
};

type ScoutRow = {
  scoutKey: string;
  xp: number;
  level: number;
  score: number;
  revenueGenerated: number;
};

type DepartmentRow = {
  key: string;
  name: string;
  xp: number;
  level: number;
  score: number;
  revenue: number;
};

type VentureRow = {
  ventureTypeKey: string;
  missionCount: number;
  revenue: number;
};

const VENTURE_LABELS: Record<string, string> = {
  shopify: "Shopify",
  etsy: "Etsy",
  affiliate: "Affiliate",
  content: "Content",
  saas: "SaaS",
  amazon: "Amazon",
};

export function buildLeaderboards(input: {
  agents: AgentRow[];
  scouts: ScoutRow[];
  departments: DepartmentRow[];
  ventures: VentureRow[];
}): LeaderboardSnapshot {
  const topAgents = [...input.agents]
    .sort((a, b) => b.score - a.score || b.xp - a.xp || b.revenueInfluenced - a.revenueInfluenced)
    .slice(0, 10)
    .map((a, i) => ({
      rank: i + 1,
      key: a.agentKey,
      name: formatAgentName(a.agentKey),
      xp: a.xp,
      level: a.level,
      score: a.score,
      revenue: a.revenueInfluenced,
      department: a.department,
    }));

  const topScouts = [...input.scouts]
    .sort((a, b) => b.score - a.score || b.xp - a.xp || b.revenueGenerated - a.revenueGenerated)
    .slice(0, 10)
    .map((s, i) => ({
      rank: i + 1,
      key: s.scoutKey,
      name: formatScoutName(s.scoutKey),
      xp: s.xp,
      level: s.level,
      score: s.score,
      revenue: s.revenueGenerated,
    }));

  const topDepartments = [...input.departments]
    .sort((a, b) => b.score - a.score || b.xp - a.xp || b.revenue - a.revenue)
    .slice(0, 5)
    .map((d, i) => ({
      rank: i + 1,
      key: d.key,
      name: d.name,
      xp: d.xp,
      level: d.level,
      score: d.score,
      revenue: d.revenue,
    }));

  const topVentures = [...input.ventures]
    .sort((a, b) => b.revenue - a.revenue || b.missionCount - a.missionCount)
    .slice(0, 10)
    .map((v, i) => ({
      rank: i + 1,
      ventureTypeKey: v.ventureTypeKey,
      name: VENTURE_LABELS[v.ventureTypeKey] ?? v.ventureTypeKey,
      missionCount: v.missionCount,
      revenue: v.revenue,
      score: v.revenue * 0.5 + v.missionCount * 50,
    }));

  return { topAgents, topScouts, topDepartments, topVentures };
}

function formatAgentName(agentKey: string): string {
  return agentKey
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatScoutName(scoutKey: string): string {
  return scoutKey
    .replace(/_scout$/, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") + " Scout";
}

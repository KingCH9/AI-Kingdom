import { ALL_AGENT_PROFILE_DEFINITIONS } from "../workstations/agent-profiles";
import {
  FORGE_BUILDER_AGENTS,
  computeForgeBuildMetrics,
  type ForgeRawMission,
} from "../forge/build-engine";
import {
  computeForgeAgentScore,
  computeForgeLevel,
  computeForgeXp,
} from "../forge/agent-xp";
import {
  NOVA_GROWTH_AGENTS,
  computeNovaAgentMetrics,
  computePortfolioGrowthStats,
  type NovaRawMission,
} from "../nova/growth-engine";
import {
  computeGrowthScore,
  computeNovaLevel,
  computeNovaXp,
} from "../nova/agent-xp";
import {
  MERCURY_AGENTS,
  computeMercuryAgentMetrics,
  computeMercuryAgentScore,
  computeMercuryLevel,
  computeMercuryXp,
  type MissionProfitability,
} from "../mercury/profitability-engine";
import { computeAverageRoi } from "../mercury/roi-analysis";
import { levelFromXp } from "../performance/performance-sync";

export type AgentRevenueContribution = {
  agentKey: string;
  name: string;
  department: string;
  departmentName: string;
  avatarEmoji: string;
  xp: number;
  level: number;
  score: number;
  revenueContributed: number;
  missionsContributed: number;
  contributionSummary: string;
};

function atlasContribution(
  ventures: MissionProfitability[],
  scaleCount: number,
  killCount: number
): AgentRevenueContribution {
  const revenue = ventures.reduce((s, v) => s + v.revenueGbp, 0);
  const xp =
    scaleCount * 25 + killCount * 10 + Math.floor(revenue);
  const score = Math.min(
    100,
    Math.round(scaleCount * 15 + Math.min(revenue, 50))
  );

  return {
    agentKey: "atlas",
    name: "Atlas",
    department: "ceo_office",
    departmentName: "CEO Office",
    avatarEmoji: "👔",
    xp,
    level: levelFromXp(xp),
    score,
    revenueContributed: round(revenue),
    missionsContributed: ventures.length,
    contributionSummary: `${scaleCount} scale · ${killCount} kill recommendations`,
  };
}

function athenaContribution(scoutRevenue: number, oppsFound: number): AgentRevenueContribution {
  const xp = oppsFound * 5 + Math.floor(scoutRevenue);
  return {
    agentKey: "athena",
    name: "Athena",
    department: "research_lab",
    departmentName: "Research Lab",
    avatarEmoji: "🔬",
    xp,
    level: levelFromXp(xp),
    score: Math.min(100, Math.round(oppsFound * 2 + scoutRevenue * 0.2)),
    revenueContributed: round(scoutRevenue),
    missionsContributed: oppsFound,
    contributionSummary: `${oppsFound} opportunities · scout pipeline revenue`,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Read-time agent revenue contributions — no persistence writes. */
export function buildAgentRevenueContributions(input: {
  forgeMissions: ForgeRawMission[];
  novaMissions: NovaRawMission[];
  profitability: MissionProfitability[];
  spendEventCount: number;
  fundRecommendationCount: number;
  scoutRevenue: number;
  opportunitiesFound: number;
  scaleCount: number;
  killCount: number;
}): AgentRevenueContribution[] {
  const portfolioSize = input.novaMissions.length || 1;
  const records: AgentRevenueContribution[] = [];

  records.push(
    atlasContribution(input.profitability, input.scaleCount, input.killCount)
  );
  records.push(
    athenaContribution(input.scoutRevenue, input.opportunitiesFound)
  );

  for (const agent of FORGE_BUILDER_AGENTS) {
    const metrics = computeForgeBuildMetrics(agent, input.forgeMissions);
    const xpBreakdown = computeForgeXp(metrics);
    const levelInfo = computeForgeLevel(xpBreakdown.total);
    records.push({
      agentKey: agent.key,
      name: agent.name,
      department: "builder_workshop",
      departmentName: "Builder Workshop",
      avatarEmoji: "🔨",
      xp: levelInfo.xp,
      level: levelInfo.level,
      score: computeForgeAgentScore(metrics),
      revenueContributed: metrics.revenueGenerated,
      missionsContributed: metrics.missionsBuilt,
      contributionSummary: `${metrics.storesLaunched} stores · ${metrics.missionsLaunched} launches`,
    });
  }

  const forgeRevenue = records
    .filter((r) => r.department === "builder_workshop")
    .reduce((s, r) => s + r.revenueContributed, 0);
  const forgeXp = records
    .filter((r) => r.department === "builder_workshop")
    .reduce((s, r) => s + r.xp, 0);
  records.push({
    agentKey: "forge",
    name: "Forge",
    department: "builder_workshop",
    departmentName: "Builder Workshop",
    avatarEmoji: "🔨",
    xp: forgeXp,
    level: levelFromXp(forgeXp),
    score: Math.round(
      records
        .filter((r) => r.department === "builder_workshop" && r.agentKey !== "forge")
        .reduce((s, r) => s + r.score, 0) /
        Math.max(FORGE_BUILDER_AGENTS.length, 1)
    ),
    revenueContributed: round(forgeRevenue),
    missionsContributed: input.forgeMissions.length,
    contributionSummary: "Builder team aggregate",
  });

  const portfolio = computePortfolioGrowthStats(input.novaMissions);
  const novaAgentRecords = NOVA_GROWTH_AGENTS.map((agent) => {
    const metrics = computeNovaAgentMetrics(
      agent,
      input.novaMissions,
      portfolioSize
    );
    const xpBreakdown = computeNovaXp(metrics);
    const levelInfo = computeNovaLevel(xpBreakdown.total);
    return {
      agentKey: agent.key,
      name: agent.name,
      level: levelInfo.level,
      xp: levelInfo.xp,
      score: computeGrowthScore(metrics),
      revenueContributed: metrics.revenueGenerated,
      missionsContributed: metrics.trackedMissions,
      contributionSummary: `${metrics.launchedMissions} launched · ${metrics.profitableMissions} profitable`,
      department: "growth",
      departmentName: "Growth",
      avatarEmoji: "📈" as const,
    };
  });
  records.push(...novaAgentRecords);

  const novaRevenue = novaAgentRecords.reduce(
    (s, r) => s + r.revenueContributed,
    0
  );
  const novaXp = novaAgentRecords.reduce((s, r) => s + r.xp, 0);
  const portfolioGrowthScore =
    novaAgentRecords.length > 0
      ? Math.round(
          (novaAgentRecords.reduce((s, a) => s + a.score, 0) /
            novaAgentRecords.length) *
            10
        ) / 10
      : 0;
  records.push({
    agentKey: "nova",
    name: "Nova",
    department: "growth",
    departmentName: "Growth",
    avatarEmoji: "📈",
    xp: novaXp,
    level: levelFromXp(novaXp),
    score: portfolioGrowthScore,
    revenueContributed: round(novaRevenue),
    missionsContributed: portfolio.trackedMissions,
    contributionSummary: "Growth team aggregate",
  });

  const avgRoi = computeAverageRoi(input.profitability);

  for (const agent of MERCURY_AGENTS) {
    const metrics = computeMercuryAgentMetrics(
      agent.key,
      input.profitability,
      input.spendEventCount,
      input.fundRecommendationCount
    );
    const xpBreakdown = computeMercuryXp(metrics);
    const levelInfo = computeMercuryLevel(xpBreakdown.total);
    records.push({
      agentKey: agent.key,
      name: agent.name,
      department: "finance",
      departmentName: "Finance",
      avatarEmoji: "💰",
      xp: levelInfo.xp,
      level: levelInfo.level,
      score: computeMercuryAgentScore(metrics, avgRoi),
      revenueContributed: metrics.totalProfitGbp,
      missionsContributed: metrics.missionsAnalyzed,
      contributionSummary: `${metrics.profitableMissions} profitable · ${metrics.fundRecommendations} fund recs`,
    });
  }

  const mercuryRevenue = records
    .filter((r) => r.department === "finance" && r.agentKey !== "mercury")
    .reduce((s, r) => s + r.revenueContributed, 0);
  const mercuryXp = records
    .filter((r) => r.department === "finance" && r.agentKey !== "mercury")
    .reduce((s, r) => s + r.xp, 0);
  records.push({
    agentKey: "mercury",
    name: "Mercury",
    department: "finance",
    departmentName: "Finance",
    avatarEmoji: "💰",
    xp: mercuryXp,
    level: levelFromXp(mercuryXp),
    score: Math.round(
      records
        .filter((r) => r.department === "finance" && r.agentKey !== "mercury")
        .reduce((s, r) => s + r.score, 0) / Math.max(MERCURY_AGENTS.length, 1)
    ),
    revenueContributed: round(mercuryRevenue),
    missionsContributed: input.profitability.length,
    contributionSummary: "Finance team aggregate",
  });

  const knownKeys = new Set(records.map((r) => r.agentKey));
  for (const def of ALL_AGENT_PROFILE_DEFINITIONS) {
    if (!knownKeys.has(def.agentKey) && !def.isAggregate) {
      records.push({
        agentKey: def.agentKey,
        name: def.name,
        department: def.department,
        departmentName: def.departmentName,
        avatarEmoji: def.avatarEmoji,
        xp: 0,
        level: 1,
        score: 0,
        revenueContributed: 0,
        missionsContributed: 0,
        contributionSummary: "Awaiting mission attribution",
      });
    }
  }

  return records.sort((a, b) => b.revenueContributed - a.revenueContributed);
}

export function topAgentContributors(
  agents: AgentRevenueContribution[],
  n = 10
): AgentRevenueContribution[] {
  return [...agents]
    .filter((a) => !["forge", "nova", "mercury", "athena"].includes(a.agentKey))
    .sort((a, b) => b.revenueContributed - a.revenueContributed)
    .slice(0, n);
}

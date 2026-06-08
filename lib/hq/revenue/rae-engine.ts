import type { VentureRecord } from "./venture-metrics";
import type { DepartmentRevenueRecord } from "./department-metrics";
import type { AgentRevenueContribution } from "./agent-contributions";

export type RaeEngineInsight = {
  engine: "atlas" | "athena" | "forge" | "nova" | "mercury";
  title: string;
  summary: string;
  href: string;
  metrics: Record<string, number | string>;
};

export function buildRaeEngineInsights(input: {
  ventures: VentureRecord[];
  departments: DepartmentRevenueRecord[];
  agents: AgentRevenueContribution[];
  opportunitiesFound: number;
  avgBuildDays: number | null;
  portfolioGrowthScore: number;
  averageRoi: number | null;
}): RaeEngineInsight[] {
  const scaleCount = input.ventures.filter((v) => v.atlasAction === "scale").length;
  const killCount = input.ventures.filter((v) => v.atlasAction === "kill").length;
  const flaggedCount = input.ventures.filter((v) => v.flagged).length;
  const topRevenue = [...input.ventures].sort(
    (a, b) => b.revenueGbp - a.revenueGbp
  )[0];

  const forgeAgents = input.agents.filter((a) => a.department === "builder_workshop");
  const forgeLaunches = forgeAgents.reduce((s, a) => s + a.missionsContributed, 0);

  const novaAgent = input.agents.find((a) => a.agentKey === "nova");
  const mercuryAgent = input.agents.find((a) => a.agentKey === "mercury");

  return [
    {
      engine: "atlas",
      title: "Atlas CEO Advisory",
      summary: `${scaleCount} ventures recommended to scale · ${flaggedCount} flagged for review`,
      href: "/hq/atlas",
      metrics: {
        scaleRecommendations: scaleCount,
        killRecommendations: killCount,
        flaggedVentures: flaggedCount,
        topVenture: topRevenue?.title ?? "—",
      },
    },
    {
      engine: "athena",
      title: "Athena Opportunity Engine",
      summary: `${input.opportunitiesFound} opportunities tracked across venture types`,
      href: "/hq/scouts",
      metrics: {
        opportunitiesFound: input.opportunitiesFound,
        pipelineFeed: "advisory",
      },
    },
    {
      engine: "forge",
      title: "Forge Builder Engine",
      summary:
        input.avgBuildDays != null
          ? `Avg build time ${input.avgBuildDays} days · ${forgeLaunches} build attributions`
          : "Build metrics computed from mission tasks",
      href: "/hq/forge",
      metrics: {
        avgBuildDays: input.avgBuildDays ?? "—",
        builderAgents: forgeAgents.length,
      },
    },
    {
      engine: "nova",
      title: "Nova Growth Engine",
      summary: `Portfolio growth score ${input.portfolioGrowthScore} · conversion-led scaling`,
      href: "/hq/nova",
      metrics: {
        growthScore: input.portfolioGrowthScore,
        revenueContributed: novaAgent?.revenueContributed ?? 0,
      },
    },
    {
      engine: "mercury",
      title: "Mercury Profitability Engine",
      summary:
        input.averageRoi != null
          ? `Portfolio avg ROI ${input.averageRoi}% · ${flaggedCount} underperformers flagged 7d+`
          : "ROI tracking across all ventures",
      href: "/hq/mercury",
      metrics: {
        averageRoi: input.averageRoi ?? "—",
        flaggedUnderperformers: flaggedCount,
        netProfitTracked: mercuryAgent?.revenueContributed ?? 0,
      },
    },
  ];
}

import { prisma } from "@/lib/prisma";
import { MISSION_EVENT_ACTIONS } from "../events/mission-events";
import { VENTURE_TEMPLATE_KEYS } from "../constants";
import {
  computeForgeBuildMetrics,
  computeTemplateBuildMetrics,
  FORGE_BUILDER_AGENTS,
  isForgeBuildPhase,
  type ForgeBuildMetrics,
  type ForgeRawMission,
  type ForgeTemplateMetrics,
} from "./build-engine";
import {
  computeForgeAgentScore,
  computeForgeLevel,
  computeForgeXp,
  type ForgeXpBreakdown,
} from "./agent-xp";

export type ForgeAgentRecord = {
  agentKey: string;
  name: string;
  level: number;
  xp: number;
  nextLevelXp: number | null;
  xpToNextLevel: number | null;
  score: number;
  buildsStarted: number;
  buildsCompleted: number;
  missionsBuilt: number;
  storesLaunched: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
  templateUsage: number;
  xpBreakdown: ForgeXpBreakdown;
};

export type ForgeMissionBuildRecord = {
  missionId: number;
  title: string;
  status: string;
  templateKey: string | null;
  templateName: string | null;
  storeLinked: boolean;
  forgeTasksCompleted: number;
  forgeTasksTotal: number;
  revenueGbp: number;
};

export type ForgeWorkstationSnapshot = {
  generatedAt: string;
  agents: ForgeAgentRecord[];
  topAgents: ForgeAgentRecord[];
  templates: ForgeTemplateMetrics[];
  topTemplates: ForgeTemplateMetrics[];
  missionBuilds: ForgeMissionBuildRecord[];
  summary: {
    totalBuildsCompleted: number;
    totalMissionsBuilt: number;
    totalStoresLaunched: number;
    averageAgentScore: number;
    topAgent: ForgeAgentRecord | null;
    topTemplate: ForgeTemplateMetrics | null;
    totalForgeRevenue: number;
    averageLevel: number;
  };
};

async function loadForgeRawData(): Promise<ForgeRawMission[]> {
  const [missions, buildEvents, revenueByStore] = await Promise.all([
    prisma.mission.findMany({
      include: {
        ventureTemplate: { select: { key: true, name: true } },
        store: { select: { id: true, revenue: true } },
        missionTasks: {
          select: {
            id: true,
            missionId: true,
            phase: true,
            title: true,
            status: true,
            ownerPersona: true,
            completedAt: true,
          },
        },
      },
    }),
    prisma.missionEvent.groupBy({
      by: ["missionId"],
      where: { action: MISSION_EVENT_ACTIONS.BUILD_COMPLETED },
      _count: { missionId: true },
    }),
    prisma.revenue.groupBy({
      by: ["storeId"],
      _sum: { amount: true },
    }),
  ]);

  const buildEventCount = new Map(
    buildEvents.map((e) => [e.missionId, e._count.missionId])
  );
  const revenueMap = new Map(
    revenueByStore.map((r) => [r.storeId, r._sum.amount ?? 0])
  );

  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    storeId: m.storeId,
    templateKey: m.ventureTemplate?.key ?? null,
    templateName: m.ventureTemplate?.name ?? null,
    revenueGbp:
      (m.storeId ? revenueMap.get(m.storeId) : undefined) ??
      m.store?.revenue ??
      0,
    forgeTasks: m.missionTasks.filter(
      (t) => t.ownerPersona === "forge" || isForgeBuildPhase(t.phase)
    ),
    buildCompletedEvents: buildEventCount.get(m.id) ?? 0,
  }));
}

function buildAgentRecord(metrics: ForgeBuildMetrics): ForgeAgentRecord {
  const xpBreakdown = computeForgeXp(metrics);
  const levelInfo = computeForgeLevel(xpBreakdown.total);

  return {
    agentKey: metrics.agentKey,
    name: metrics.name,
    level: levelInfo.level,
    xp: levelInfo.xp,
    nextLevelXp: levelInfo.nextLevelXp,
    xpToNextLevel: levelInfo.xpToNextLevel,
    score: computeForgeAgentScore(metrics),
    buildsStarted: metrics.buildsStarted,
    buildsCompleted: metrics.buildsCompleted,
    missionsBuilt: metrics.missionsBuilt,
    storesLaunched: metrics.storesLaunched,
    missionsLaunched: metrics.missionsLaunched,
    revenueGenerated: metrics.revenueGenerated,
    successRate: metrics.successRate,
    templateUsage: metrics.templateUsage,
    xpBreakdown,
  };
}

function buildMissionBuildRecords(
  missions: ForgeRawMission[]
): ForgeMissionBuildRecord[] {
  return missions
    .filter((m) =>
      m.forgeTasks.length > 0 ||
      m.buildCompletedEvents > 0 ||
      m.storeId != null
    )
    .map((m) => ({
      missionId: m.id,
      title: m.title,
      status: m.status,
      templateKey: m.templateKey,
      templateName: m.templateName,
      storeLinked: m.storeId != null,
      forgeTasksCompleted: m.forgeTasks.filter((t) => t.status === "completed")
        .length,
      forgeTasksTotal: m.forgeTasks.length,
      revenueGbp: m.revenueGbp,
    }))
    .sort((a, b) => b.forgeTasksCompleted - a.forgeTasksCompleted)
    .slice(0, 20);
}

const TEMPLATE_DEFINITIONS = [
  {
    key: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
    name: "Shopify Store",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE,
    name: "Etsy Printable",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE,
    name: "Affiliate Site",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.CONTENT_SITE,
    name: "Content Site",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.SAAS_MVP,
    name: "SaaS MVP",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.AMAZON_FBA,
    name: "Amazon FBA",
  },
];

/** Full Forge workstation snapshot — computed from existing HQ data. */
export async function getForgeWorkstationSnapshot(): Promise<ForgeWorkstationSnapshot> {
  const missions = await loadForgeRawData();

  const agents = FORGE_BUILDER_AGENTS.map((agent) =>
    buildAgentRecord(computeForgeBuildMetrics(agent, missions))
  ).sort((a, b) => b.score - a.score);

  const templates = TEMPLATE_DEFINITIONS.map((t) =>
    computeTemplateBuildMetrics(t.key, t.name, missions)
  ).sort((a, b) => b.efficiencyScore - a.efficiencyScore);

  const topAgents = agents.slice(0, 3);
  const topTemplates = templates.slice(0, 3);
  const missionBuilds = buildMissionBuildRecords(missions);

  const forgeMissions = missions.filter(
    (m) =>
      m.forgeTasks.some(
        (t) => t.status === "completed" && isForgeBuildPhase(t.phase)
      ) ||
      m.buildCompletedEvents > 0 ||
      m.storeId != null
  );

  const totalBuildsCompleted = agents.reduce(
    (sum, a) => sum + a.buildsCompleted,
    0
  );
  const totalMissionsBuilt = forgeMissions.length;
  const totalStoresLaunched = forgeMissions.filter((m) => m.storeId != null).length;
  const totalForgeRevenue = forgeMissions.reduce(
    (sum, m) => sum + m.revenueGbp,
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    agents,
    topAgents,
    templates,
    topTemplates,
    missionBuilds,
    summary: {
      totalBuildsCompleted,
      totalMissionsBuilt,
      totalStoresLaunched,
      averageAgentScore:
        agents.length > 0
          ? Math.round(
              (agents.reduce((sum, a) => sum + a.score, 0) / agents.length) * 10
            ) / 10
          : 0,
      topAgent: agents[0] ?? null,
      topTemplate: templates[0] ?? null,
      totalForgeRevenue: Math.round(totalForgeRevenue * 100) / 100,
      averageLevel:
        agents.length > 0
          ? Math.round(
              (agents.reduce((sum, a) => sum + a.level, 0) / agents.length) * 10
            ) / 10
          : 0,
    },
  };
}

/** Compact summary for HQ dashboard widget. */
export async function getForgeWorkstationSummary() {
  const snapshot = await getForgeWorkstationSnapshot();
  return snapshot.summary;
}

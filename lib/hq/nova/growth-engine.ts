import { HQ_PERSONAS, MISSION_STATUSES, VENTURE_TEMPLATE_KEYS } from "../constants";
import { revenueStreamToVentureTypeKey } from "../seed/venture-engine";

/** Mission statuses that contribute to Nova growth analytics. */
export const NOVA_GROWTH_STATUSES: Set<string> = new Set([
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

/** Phases owned by Nova across venture templates. */
export const NOVA_GROWTH_PHASES = new Set([
  "launch",
  "grow",
  "content",
  "monetize",
  "beta",
]);

export type NovaGrowthAgent = {
  key: string;
  name: string;
  growthPhases: readonly string[];
  primaryStatus: string | null;
};

export const NOVA_GROWTH_AGENTS: NovaGrowthAgent[] = [
  {
    key: "seo_specialist",
    name: "SEO Specialist",
    growthPhases: ["launch", "grow"],
    primaryStatus: MISSION_STATUSES.LAUNCHING,
  },
  {
    key: "content_marketer",
    name: "Content Marketer",
    growthPhases: ["content", "launch"],
    primaryStatus: null,
  },
  {
    key: "social_media_manager",
    name: "Social Media Manager",
    growthPhases: ["grow", "monetize"],
    primaryStatus: MISSION_STATUSES.GROWING,
  },
  {
    key: "campaign_manager",
    name: "Campaign Manager",
    growthPhases: ["launch", "monetize", "beta"],
    primaryStatus: MISSION_STATUSES.PROFITABLE,
  },
  {
    key: "analytics_manager",
    name: "Analytics Manager",
    growthPhases: [],
    primaryStatus: null,
  },
];

export type NovaRawTask = {
  phase: string;
  title: string;
  status: string;
  ownerPersona: string;
};

export type NovaRawMission = {
  id: number;
  title: string;
  status: string;
  storeId: number | null;
  templateKey: string | null;
  ventureTypeKey: string | null;
  revenueGbp: number;
  novaTasks: NovaRawTask[];
};

export type NovaAgentMetrics = {
  agentKey: string;
  name: string;
  launchedMissions: number;
  growingMissions: number;
  profitableMissions: number;
  contentMissions: number;
  trackedMissions: number;
  revenueGenerated: number;
  ventureDiversity: number;
};

export function isNovaGrowthPhase(phase: string): boolean {
  return NOVA_GROWTH_PHASES.has(phase);
}

export function isNovaGrowthTask(task: {
  phase: string;
  ownerPersona: string;
}): boolean {
  return task.ownerPersona === HQ_PERSONAS.NOVA || isNovaGrowthPhase(task.phase);
}

/** Growth-eligible mission — analytics only. */
export function isNovaGrowthMission(mission: NovaRawMission): boolean {
  if (!NOVA_GROWTH_STATUSES.has(mission.status)) return false;
  return mission.storeId != null || mission.novaTasks.length > 0;
}

export function isContentMission(mission: NovaRawMission): boolean {
  if (
    mission.templateKey === VENTURE_TEMPLATE_KEYS.CONTENT_SITE ||
    mission.templateKey === VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE
  ) {
    return true;
  }
  if (mission.ventureTypeKey === "content" || mission.ventureTypeKey === "affiliate") {
    return true;
  }
  return mission.novaTasks.some(
    (t) => t.phase === "content" || t.title.toLowerCase().includes("content")
  );
}

/** Primary growth agent for mission-level revenue attribution. */
export function resolvePrimaryGrowthAgent(mission: NovaRawMission): string {
  if (mission.status === MISSION_STATUSES.PROFITABLE) return "campaign_manager";
  if (mission.status === MISSION_STATUSES.GROWING) return "social_media_manager";
  if (isContentMission(mission)) return "content_marketer";
  if (mission.status === MISSION_STATUSES.LAUNCHING) return "seo_specialist";
  return "analytics_manager";
}

function countVentureTypes(missions: NovaRawMission[]): number {
  const types = new Set(
    missions.map((m) => m.ventureTypeKey ?? m.templateKey ?? "unknown")
  );
  return types.size;
}

/** Compute per-agent Nova growth metrics — no persistence. */
export function computeNovaAgentMetrics(
  agent: NovaGrowthAgent,
  missions: NovaRawMission[],
  portfolioSize: number
): NovaAgentMetrics {
  const growthMissions = missions.filter(isNovaGrowthMission);

  let launchedMissions = 0;
  let growingMissions = 0;
  let profitableMissions = 0;
  let contentMissions = 0;
  let trackedMissions = 0;
  let revenueGenerated = 0;
  const attributed: NovaRawMission[] = [];

  for (const mission of growthMissions) {
    let countsForAgent = false;

    switch (agent.key) {
      case "seo_specialist":
        countsForAgent = mission.status === MISSION_STATUSES.LAUNCHING;
        break;
      case "content_marketer":
        countsForAgent = isContentMission(mission);
        break;
      case "social_media_manager":
        countsForAgent = mission.status === MISSION_STATUSES.GROWING;
        break;
      case "campaign_manager":
        countsForAgent = mission.status === MISSION_STATUSES.PROFITABLE;
        break;
      case "analytics_manager":
        countsForAgent = true;
        break;
    }

    if (!countsForAgent) continue;

    attributed.push(mission);
    trackedMissions += 1;
    revenueGenerated += mission.revenueGbp;

    if (mission.status === MISSION_STATUSES.LAUNCHING) launchedMissions += 1;
    if (mission.status === MISSION_STATUSES.GROWING) growingMissions += 1;
    if (mission.status === MISSION_STATUSES.PROFITABLE) profitableMissions += 1;
    if (isContentMission(mission)) contentMissions += 1;
  }

  const ventureDiversity =
    portfolioSize > 0
      ? Math.round((countVentureTypes(attributed) / portfolioSize) * 1000) / 10
      : 0;

  return {
    agentKey: agent.key,
    name: agent.name,
    launchedMissions,
    growingMissions,
    profitableMissions,
    contentMissions,
    trackedMissions,
    revenueGenerated: Math.round(revenueGenerated * 100) / 100,
    ventureDiversity,
  };
}

/** Portfolio-level growth counts — analytics only. */
export function computePortfolioGrowthStats(missions: NovaRawMission[]) {
  const growthMissions = missions.filter(isNovaGrowthMission);
  const ventureTypes = new Set(
    growthMissions.map((m) => m.ventureTypeKey ?? m.templateKey ?? "unknown")
  );

  return {
    launchedMissions: growthMissions.filter(
      (m) => m.status === MISSION_STATUSES.LAUNCHING
    ).length,
    growingMissions: growthMissions.filter(
      (m) => m.status === MISSION_STATUSES.GROWING
    ).length,
    profitableMissions: growthMissions.filter(
      (m) => m.status === MISSION_STATUSES.PROFITABLE
    ).length,
    totalRevenue: Math.round(
      growthMissions.reduce((sum, m) => sum + m.revenueGbp, 0) * 100
    ) / 100,
    trackedMissions: growthMissions.length,
    ventureDiversity: ventureTypes.size,
  };
}

export function resolveMissionVentureTypeKey(input: {
  ventureTypeKey: string | null;
  revenueStream: string;
}): string {
  return input.ventureTypeKey ?? revenueStreamToVentureTypeKey(input.revenueStream);
}

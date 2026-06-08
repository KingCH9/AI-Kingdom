import { HQ_PERSONAS, MISSION_STATUSES, VENTURE_TEMPLATE_KEYS } from "../constants";
import {
  createMissionEventWithCost,
  MISSION_EVENT_ACTIONS,
} from "../events/mission-events";

/** Phases owned by Forge across venture templates. */
export const FORGE_BUILD_PHASES = new Set([
  "build",
  "create_assets",
  "publish",
  "build_site",
  "build_mvp",
  "source",
]);

export type ForgeBuilderAgent = {
  key: string;
  name: string;
  phases: readonly string[];
  templateKeys: readonly string[];
};

/** Forge sub-agents — mirrors agent-registry Forge subAgents. */
export const FORGE_BUILDER_AGENTS: ForgeBuilderAgent[] = [
  {
    key: "store_builder",
    name: "Store Builder",
    phases: ["build", "source"],
    templateKeys: [
      VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
      VENTURE_TEMPLATE_KEYS.AMAZON_FBA,
    ],
  },
  {
    key: "listing_builder",
    name: "Listing Builder",
    phases: ["create_assets", "publish"],
    templateKeys: [VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE],
  },
  {
    key: "landing_page_builder",
    name: "Landing Page Builder",
    phases: ["build_site"],
    templateKeys: [
      VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE,
      VENTURE_TEMPLATE_KEYS.CONTENT_SITE,
    ],
  },
  {
    key: "saas_builder",
    name: "SaaS Builder",
    phases: ["build_mvp"],
    templateKeys: [VENTURE_TEMPLATE_KEYS.SAAS_MVP],
  },
  {
    key: "qa_inspector",
    name: "QA Inspector",
    phases: [],
    templateKeys: [],
  },
];

export type ForgeRawTask = {
  id: number;
  missionId: number;
  phase: string;
  title: string;
  status: string;
  ownerPersona: string;
  completedAt: Date | null;
};

export type ForgeRawMission = {
  id: number;
  title: string;
  status: string;
  storeId: number | null;
  templateKey: string | null;
  templateName: string | null;
  revenueGbp: number;
  forgeTasks: ForgeRawTask[];
  buildCompletedEvents: number;
};

export type ForgeBuildMetrics = {
  agentKey: string;
  name: string;
  buildsStarted: number;
  buildsCompleted: number;
  missionsBuilt: number;
  storesLaunched: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
  templateUsage: number;
};

export type ForgeTemplateMetrics = {
  templateKey: string;
  templateName: string;
  missionsUsed: number;
  buildsCompleted: number;
  storesLaunched: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
  efficiencyScore: number;
};

const LAUNCHED_STATUSES = new Set([
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

const POST_BUILD_TERMINAL = new Set([
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
  MISSION_STATUSES.KILLED,
]);

export function isForgeBuildPhase(phase: string): boolean {
  return FORGE_BUILD_PHASES.has(phase);
}

export function isForgeBuildTask(task: {
  phase: string;
  ownerPersona: string;
}): boolean {
  return (
    task.ownerPersona === HQ_PERSONAS.FORGE || isForgeBuildPhase(task.phase)
  );
}

/** Resolve builder sub-agent from task phase and template — analytics only. */
export function resolveBuilderAgentKey(
  task: Pick<ForgeRawTask, "phase" | "title">,
  templateKey: string | null
): string {
  if (task.title.toLowerCase().includes("qa")) {
    return "qa_inspector";
  }

  if (task.phase === "build" && templateKey === VENTURE_TEMPLATE_KEYS.CONTENT_SITE) {
    return "landing_page_builder";
  }

  for (const agent of FORGE_BUILDER_AGENTS) {
    if (agent.phases.includes(task.phase)) {
      return agent.key;
    }
  }

  if (templateKey) {
    const byTemplate = FORGE_BUILDER_AGENTS.find((a) =>
      a.templateKeys.includes(templateKey)
    );
    if (byTemplate) return byTemplate.key;
  }

  return "store_builder";
}

function missionHasCompletedForgeBuild(mission: ForgeRawMission): boolean {
  if (mission.buildCompletedEvents > 0) return true;
  return mission.forgeTasks.some(
    (t) => t.status === "completed" && isForgeBuildPhase(t.phase)
  );
}

function missionForgeBuildsComplete(mission: ForgeRawMission): boolean {
  const forgeBuildTasks = mission.forgeTasks.filter((t) =>
    isForgeBuildPhase(t.phase)
  );
  if (forgeBuildTasks.length === 0) return false;
  return forgeBuildTasks.every((t) => t.status === "completed");
}

function resolveMissionPrimaryBuilder(mission: ForgeRawMission): string {
  const completedForge = mission.forgeTasks
    .filter((t) => t.status === "completed" && isForgeBuildPhase(t.phase))
    .sort((a, b) => a.id - b.id);

  if (completedForge.length > 0) {
    return resolveBuilderAgentKey(completedForge[0], mission.templateKey);
  }

  const forgeTasks = mission.forgeTasks.filter((t) => isForgeBuildPhase(t.phase));
  if (forgeTasks.length > 0) {
    return resolveBuilderAgentKey(forgeTasks[0], mission.templateKey);
  }

  if (mission.templateKey) {
    const byTemplate = FORGE_BUILDER_AGENTS.find((a) =>
      a.templateKeys.includes(mission.templateKey!)
    );
    if (byTemplate) return byTemplate.key;
  }

  return "store_builder";
}

/** Compute per-agent build metrics from raw data — no persistence. */
export function computeForgeBuildMetrics(
  agent: ForgeBuilderAgent,
  missions: ForgeRawMission[]
): ForgeBuildMetrics {
  let buildsStarted = 0;
  let buildsCompleted = 0;
  let missionsBuilt = 0;
  let storesLaunched = 0;
  let missionsLaunched = 0;
  let revenueGenerated = 0;
  let templateUsage = 0;
  let profitable = 0;
  let failed = 0;

  for (const mission of missions) {
    const agentTasks = mission.forgeTasks.filter(
      (t) =>
        resolveBuilderAgentKey(t, mission.templateKey) === agent.key &&
        isForgeBuildPhase(t.phase)
    );

    const isPrimaryBuilder = resolveMissionPrimaryBuilder(mission) === agent.key;
    const qaMission =
      agent.key === "qa_inspector" &&
      missionForgeBuildsComplete(mission) &&
      mission.storeId != null;

    if (agentTasks.length > 0) {
      buildsStarted += agentTasks.length;
      buildsCompleted += agentTasks.filter((t) => t.status === "completed").length;
    }

    if (qaMission) {
      buildsCompleted += 1;
    }

    const countsMission =
      (isPrimaryBuilder && missionHasCompletedForgeBuild(mission)) || qaMission;

    if (!countsMission && agentTasks.length === 0) continue;

    if (countsMission) {
      missionsBuilt += 1;
      if (agent.templateKeys.includes(mission.templateKey ?? "")) {
        templateUsage += 1;
      }
      if (mission.storeId != null) storesLaunched += 1;
      if (LAUNCHED_STATUSES.has(mission.status as typeof MISSION_STATUSES.LAUNCHING)) {
        missionsLaunched += 1;
      }
      if (isPrimaryBuilder || qaMission) {
        revenueGenerated += mission.revenueGbp;
      }

      if (POST_BUILD_TERMINAL.has(mission.status as typeof MISSION_STATUSES.KILLED)) {
        if (mission.status === MISSION_STATUSES.PROFITABLE) profitable += 1;
        else if (mission.status === MISSION_STATUSES.KILLED) failed += 1;
      }
    }
  }

  const terminal = profitable + failed;
  const successRate =
    terminal > 0 ? Math.round((profitable / terminal) * 1000) / 10 : 0;

  return {
    agentKey: agent.key,
    name: agent.name,
    buildsStarted,
    buildsCompleted,
    missionsBuilt,
    storesLaunched,
    missionsLaunched,
    revenueGenerated: Math.round(revenueGenerated * 100) / 100,
    successRate,
    templateUsage,
  };
}

/** Compute per-template build efficiency — analytics only. */
export function computeTemplateBuildMetrics(
  templateKey: string,
  templateName: string,
  missions: ForgeRawMission[]
): ForgeTemplateMetrics {
  const templateMissions = missions.filter((m) => m.templateKey === templateKey);
  let buildsCompleted = 0;
  let storesLaunched = 0;
  let missionsLaunched = 0;
  let revenueGenerated = 0;
  let profitable = 0;
  let failed = 0;

  for (const mission of templateMissions) {
    const taskBuilds = mission.forgeTasks.filter(
      (t) => t.status === "completed" && isForgeBuildPhase(t.phase)
    ).length;
    buildsCompleted += Math.max(taskBuilds, mission.buildCompletedEvents);

    if (mission.storeId != null) storesLaunched += 1;
    if (LAUNCHED_STATUSES.has(mission.status as typeof MISSION_STATUSES.LAUNCHING)) {
      missionsLaunched += 1;
    }
    revenueGenerated += mission.revenueGbp;

    if (POST_BUILD_TERMINAL.has(mission.status as typeof MISSION_STATUSES.KILLED)) {
      if (mission.status === MISSION_STATUSES.PROFITABLE) profitable += 1;
      else if (mission.status === MISSION_STATUSES.KILLED) failed += 1;
    }
  }

  const terminal = profitable + failed;
  const successRate =
    terminal > 0 ? Math.round((profitable / terminal) * 1000) / 10 : 0;

  const launchRate =
    templateMissions.length > 0
      ? Math.round((missionsLaunched / templateMissions.length) * 1000) / 10
      : 0;

  const efficiencyScore = Math.round(
    Math.min(successRate * 0.5 + launchRate * 0.5, 100)
  );

  return {
    templateKey,
    templateName,
    missionsUsed: templateMissions.length,
    buildsCompleted,
    storesLaunched,
    missionsLaunched,
    revenueGenerated: Math.round(revenueGenerated * 100) / 100,
    successRate,
    efficiencyScore,
  };
}

/** Log build completion — advisory event only, no mission advancement. */
export async function recordBuildComplete(input: {
  missionId: number;
  taskId: number;
  taskTitle: string;
  taskPhase: string;
  agentPersona?: string | null;
}) {
  return createMissionEventWithCost({
    missionId: input.missionId,
    action: MISSION_EVENT_ACTIONS.BUILD_COMPLETED,
    detail: `Build completed: ${input.taskTitle} (phase: ${input.taskPhase}, task #${input.taskId})`,
    agentPersona: input.agentPersona ?? HQ_PERSONAS.FORGE,
    estimatedCostGbp: 0,
    syncMissionCost: false,
  });
}

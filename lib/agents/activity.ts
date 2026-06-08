import type { Agent } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_XP_GAIN = 10;

/** Optional FK links for AgentLog traceability. */
export type AgentLogLinks = {
  opportunityId?: number;
  taskId?: number;
  storeId?: number;
};

export type AgentActivityInput = {
  agent: Pick<Agent, "id" | "name" | "xp" | "level">;
  action: string;
  xpGain?: number;
  /** When false, only writes the log entry (e.g. failed tasks). */
  awardXp?: boolean;
} & AgentLogLinks;

function buildLogData(
  agentName: string,
  action: string,
  links?: AgentLogLinks
) {
  return {
    agentName,
    action,
    opportunityId: links?.opportunityId ?? null,
    taskId: links?.taskId ?? null,
    storeId: links?.storeId ?? null,
  };
}

/**
 * Single service for agent XP, leveling, and activity logging.
 * All agent actions must go through this function.
 */
export async function recordAgentActivity({
  agent,
  action,
  xpGain = DEFAULT_XP_GAIN,
  awardXp = true,
  opportunityId,
  taskId,
  storeId,
}: AgentActivityInput): Promise<void> {
  if (awardXp) {
    let xp = agent.xp + xpGain;
    let level = agent.level;

    if (xp >= 100) {
      xp -= 100;
      level += 1;
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { xp, level },
    });
  }

  await prisma.agentLog.create({
    data: buildLogData(agent.name, action, {
      opportunityId,
      taskId,
      storeId,
    }),
  });
}

/** Writes an activity log without XP (e.g. operator-initiated transitions). */
export async function logAgentAction(
  agentName: string,
  action: string,
  links?: AgentLogLinks
): Promise<void> {
  await prisma.agentLog.create({
    data: buildLogData(agentName, action, links),
  });
}

/** Extracts storeId from build-store task result JSON when present. */
export function parseStoreIdFromTaskResult(result: string): number | undefined {
  try {
    const parsed = JSON.parse(result) as { storeId?: number };
    if (typeof parsed.storeId === "number") {
      return parsed.storeId;
    }
  } catch {
    // Not JSON — ignore
  }
  return undefined;
}

/** Builds FK links for task execution logs. */
export function buildTaskActivityLinks(
  task: { id: number; opportunityId: number | null },
  opportunity: { id: number } | null,
  result?: string
): AgentLogLinks {
  const links: AgentLogLinks = {
    taskId: task.id,
    opportunityId: task.opportunityId ?? opportunity?.id,
  };

  if (result) {
    const storeId = parseStoreIdFromTaskResult(result);
    if (storeId) {
      links.storeId = storeId;
    }
  }

  return links;
}

/** Resolves store ID from a linked opportunity for activity logging. */
export async function resolveStoreIdForOpportunity(
  opportunityId: number
): Promise<number | undefined> {
  const store = await prisma.store.findFirst({
    where: { opportunityId },
    select: { id: true },
  });

  return store?.id;
}

import { prisma } from "@/lib/prisma";
import { syncMissionActualCost } from "../finance/cost-aggregation";

export const MISSION_EVENT_ACTIONS = {
  MISSION_CREATED: "mission_created",
  MISSION_UPDATED: "mission_updated",
  TASK_COMPLETED: "task_completed",
  RULE_VIOLATION: "rule_violation",
  HUMAN_OVERRIDE: "human_override",
  SPEND_RECORDED: "spend_recorded",
  AI_COST: "ai_cost",
  ORCHESTRATION_HANDOFF: "orchestration_handoff",
} as const;

export type MissionEventAction =
  (typeof MISSION_EVENT_ACTIONS)[keyof typeof MISSION_EVENT_ACTIONS];

export type CreateMissionEventInput = {
  missionId: number;
  action: MissionEventAction | string;
  detail?: string | null;
  agentPersona?: string | null;
  estimatedCostGbp?: number;
  /** When true (default), roll up event costs onto mission.actualCostGbp. */
  syncMissionCost?: boolean;
};

/** Adapter layer — logs HQ activity without touching AgentLog. */
export async function createMissionEvent(input: CreateMissionEventInput) {
  return prisma.missionEvent.create({
    data: {
      missionId: input.missionId,
      action: input.action,
      detail: input.detail ?? null,
      agentPersona: input.agentPersona ?? null,
      estimatedCostGbp: input.estimatedCostGbp ?? 0,
    },
  });
}

/**
 * Cost-aware event adapter — records MissionEvent and optionally syncs
 * mission.actualCostGbp from event totals. Separate from AgentLog.
 */
export async function createMissionEventWithCost(input: CreateMissionEventInput) {
  const event = await createMissionEvent(input);

  const shouldSync = input.syncMissionCost !== false;
  if (shouldSync && (input.estimatedCostGbp ?? 0) > 0) {
    await syncMissionActualCost(input.missionId);
  }

  return event;
}

export async function getLatestMissionEvents(
  missionIds: number[],
  takePerMission = 3
) {
  if (missionIds.length === 0) {
    return new Map<
      number,
      Awaited<ReturnType<typeof prisma.missionEvent.findMany>>
    >();
  }

  const events = await prisma.missionEvent.findMany({
    where: { missionId: { in: missionIds } },
    orderBy: { createdAt: "desc" },
  });

  const grouped = new Map<number, typeof events>();
  for (const event of events) {
    const list = grouped.get(event.missionId) ?? [];
    if (list.length < takePerMission) {
      list.push(event);
      grouped.set(event.missionId, list);
    }
  }

  return grouped;
}

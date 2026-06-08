"use server";

import {
  assertAuthorizedMutation,
  UnauthorizedMutationError,
} from "@/lib/auth/server-action-guard";
import type { MissionStatus } from "@/lib/hq/constants";
import {
  completeMissionTask,
  createMission,
  updateMission,
} from "@/lib/hq/missions/mission-service";

type MutationFailure = { success: false; message: string };

async function runAuthorizedMutation<T>(
  action: () => Promise<T>,
  scope: string
): Promise<T | MutationFailure> {
  try {
    await assertAuthorizedMutation();
    console.log(`[hq-mutation:${scope}] authorized — running`);
    const result = await action();
    console.log(`[hq-mutation:${scope}] completed`);
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedMutationError) {
      console.warn(`[hq-mutation:${scope}] unauthorized`);
      return { success: false, message: error.message };
    }

    const message =
      error instanceof Error ? error.message : "Mutation failed unexpectedly";
    console.error(`[hq-mutation:${scope}] error:`, message);
    return { success: false, message };
  }
}

export async function createMissionAction(input: {
  title: string;
  description?: string;
  departmentId: number;
  ownerPersona: string;
  revenueStream?: string;
  opportunityId?: number;
}) {
  return runAuthorizedMutation(async () => {
    const result = await createMission({
      ...input,
      agentPersona: "operator",
    });

    if (!result.success) {
      return { success: false as const, message: result.message };
    }

    return { success: true as const, missionId: result.mission.id };
  }, "createMission");
}

export async function updateMissionAction(input: {
  missionId: number;
  status?: MissionStatus;
  humanOverride?: boolean;
  overrideReason?: string | null;
}) {
  return runAuthorizedMutation(async () => {
    const result = await updateMission(input.missionId, {
      status: input.status,
      humanOverride: input.humanOverride,
      overrideReason: input.overrideReason,
      agentPersona: "operator",
    });

    if (!result.success) {
      return { success: false as const, message: result.message };
    }

    return { success: true as const };
  }, "updateMission");
}

export async function completeMissionTaskAction(input: {
  missionId: number;
  taskId: number;
}) {
  return runAuthorizedMutation(async () => {
    const result = await completeMissionTask(
      input.missionId,
      input.taskId,
      "operator"
    );

    if (!result.success) {
      return { success: false as const, message: result.message };
    }

    return { success: true as const };
  }, "completeMissionTask");
}

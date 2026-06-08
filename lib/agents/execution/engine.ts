import type { Task } from "@prisma/client";
import {
  buildTaskActivityLinks,
  recordAgentActivity,
  resolveStoreIdForOpportunity,
} from "@/lib/agents/activity";
import { findAgentByRole } from "@/lib/agents/queries";
import { AGENT_ROLES } from "@/lib/types";
import { getTaskExecutionBlockReason } from "@/lib/tasks/dependencies";
import { findOpportunityForTask } from "@/lib/tasks/find-opportunity";
import { TASK_STATUSES, TASK_TITLE_PREFIX } from "@/lib/tasks/constants";
import { prisma } from "@/lib/prisma";
import type { TaskExecutionContext } from "./context";
import { executeBuildStoreTask } from "./handlers/build-store";
import { executeMarketingPlanTask } from "./handlers/marketing-plan";
import type { TaskExecutionResult } from "./types";

type TaskHandler = (ctx: TaskExecutionContext) => Promise<string>;

async function resolveAgentForTask(task: Task) {
  const byName = await prisma.agent.findFirst({
    where: { name: task.agent },
  });

  if (byName) {
    return byName;
  }

  if (task.title.startsWith(TASK_TITLE_PREFIX.BUILD_STORE)) {
    return findAgentByRole(AGENT_ROLES.STORE_BUILDER);
  }

  if (task.title.startsWith(TASK_TITLE_PREFIX.MARKETING_PLAN)) {
    return findAgentByRole(AGENT_ROLES.MARKETING_MANAGER);
  }

  return null;
}

function resolveHandler(task: Task): TaskHandler | null {
  if (task.title.startsWith(TASK_TITLE_PREFIX.BUILD_STORE)) {
    return executeBuildStoreTask;
  }

  if (task.title.startsWith(TASK_TITLE_PREFIX.MARKETING_PLAN)) {
    return executeMarketingPlanTask;
  }

  return null;
}

/** Claims a pending task for execution. */
export async function claimTask(taskId: number): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task || task.status !== TASK_STATUSES.PENDING) {
    return null;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { status: TASK_STATUSES.IN_PROGRESS },
  });
}

/** Executes a single task through the agent execution engine. */
export async function executeTask(taskId: number): Promise<TaskExecutionResult> {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });

  if (!existing) {
    throw new Error(`Task #${taskId} not found`);
  }

  if (
    existing.status !== TASK_STATUSES.PENDING &&
    existing.status !== TASK_STATUSES.IN_PROGRESS
  ) {
    return {
      success: false,
      task: existing,
      error: `Task is already ${existing.status}`,
    };
  }

  const blockReason = await getTaskExecutionBlockReason(existing);
  if (blockReason && existing.status === TASK_STATUSES.PENDING) {
    return {
      success: false,
      task: existing,
      error: blockReason,
      deferred: true,
    };
  }

  const task =
    existing.status === TASK_STATUSES.PENDING
      ? await claimTask(taskId)
      : existing;

  if (!task) {
    return {
      success: false,
      task: existing,
      error: "Task could not be claimed",
    };
  }

  const handler = resolveHandler(task);

  if (!handler) {
    const failed = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TASK_STATUSES.FAILED,
        result: "No execution handler registered for this task type",
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      task: failed,
      error: "No execution handler registered for this task type",
    };
  }

  const agent = await resolveAgentForTask(task);

  if (!agent) {
    const failed = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TASK_STATUSES.FAILED,
        result: `Assigned agent "${task.agent}" not found`,
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      task: failed,
      error: `Assigned agent "${task.agent}" not found`,
    };
  }

  const opportunity = await findOpportunityForTask(task);
  const activityLinks = buildTaskActivityLinks(task, opportunity);

  try {
    const result = await handler({ task, agent, opportunity });

    const completed = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TASK_STATUSES.COMPLETED,
        result,
        completedAt: new Date(),
      },
    });

    const activityLinks = {
      ...buildTaskActivityLinks(task, opportunity, result),
    };

    if (!activityLinks.storeId && opportunity) {
      const storeId = await resolveStoreIdForOpportunity(opportunity.id);
      if (storeId) {
        activityLinks.storeId = storeId;
      }
    }

    await recordAgentActivity({
      agent,
      action: `${agent.name} completed task: ${task.title}`,
      ...activityLinks,
    });

    return { success: true, task: completed, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    const failed = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TASK_STATUSES.FAILED,
        result: message,
        completedAt: new Date(),
      },
    });

    await recordAgentActivity({
      agent,
      action: `${agent.name} failed task: ${task.title} — ${message}`,
      awardXp: false,
      ...activityLinks,
    });

    return { success: false, task: failed, error: message };
  }
}

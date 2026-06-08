import type { Task } from "@prisma/client";
import { findOpportunityForTask } from "@/lib/tasks/find-opportunity";
import { TASK_STATUSES, TASK_TITLE_PREFIX } from "@/lib/tasks/constants";
import { prisma } from "@/lib/prisma";

const TASK_TYPE_ORDER: Record<string, number> = {
  [TASK_TITLE_PREFIX.BUILD_STORE]: 0,
  [TASK_TITLE_PREFIX.MARKETING_PLAN]: 1,
};

function taskTypeOrder(title: string): number {
  for (const [prefix, order] of Object.entries(TASK_TYPE_ORDER)) {
    if (title.startsWith(prefix)) {
      return order;
    }
  }
  return 99;
}

/** Sorts pending tasks: build-store before marketing-plan, then oldest first. */
export function sortPendingTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const orderDiff = taskTypeOrder(a.title) - taskTypeOrder(b.title);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/** Returns a block reason when marketing must wait for store build. */
export async function getTaskExecutionBlockReason(
  task: Task
): Promise<string | null> {
  if (!task.title.startsWith(TASK_TITLE_PREFIX.MARKETING_PLAN)) {
    return null;
  }

  const opportunity = await findOpportunityForTask(task);
  if (!opportunity) {
    return null;
  }

  const incompleteBuild = await prisma.task.findFirst({
    where: {
      id: { not: task.id },
      status: { in: [TASK_STATUSES.PENDING, TASK_STATUSES.IN_PROGRESS] },
      OR: [
        {
          opportunityId: opportunity.id,
          title: { startsWith: TASK_TITLE_PREFIX.BUILD_STORE },
        },
        {
          title: `${TASK_TITLE_PREFIX.BUILD_STORE}${opportunity.productName}`,
        },
      ],
    },
  });

  if (incompleteBuild) {
    return `Waiting for store build task (#${incompleteBuild.id}) to complete`;
  }

  return null;
}

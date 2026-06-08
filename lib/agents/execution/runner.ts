import { sortPendingTasks } from "@/lib/tasks/dependencies";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import { prisma } from "@/lib/prisma";
import { executeTask } from "./engine";
import type { TaskExecutionResult } from "./types";

export type TaskWorkerCycleResult = {
  executed: number;
  succeeded: number;
  failed: number;
  deferred: number;
  results: TaskExecutionResult[];
  startedAt: Date;
  finishedAt: Date;
};

export type TaskWorkerCycleOptions = {
  /** Max pending tasks to attempt this cycle. */
  limit?: number;
};

/**
 * Runs one background worker cycle through the domain execution engine.
 * Orders build-store before marketing-plan and defers tasks with unmet dependencies.
 */
export async function runTaskWorkerCycle(
  options: TaskWorkerCycleOptions = {}
): Promise<TaskWorkerCycleResult> {
  const startedAt = new Date();
  const limit = options.limit ?? 10;

  console.log("[task-worker] cycle start");

  const pending = await prisma.task.findMany({
    where: { status: TASK_STATUSES.PENDING },
    orderBy: { createdAt: "asc" },
  });

  const ordered = sortPendingTasks(pending).slice(0, limit);
  const results: TaskExecutionResult[] = [];

  let succeeded = 0;
  let failed = 0;
  let deferred = 0;

  for (const task of ordered) {
    console.log(
      `[task-worker] executing task #${task.id} "${task.title}" (agent=${task.agent})`
    );

    const result = await executeTask(task.id);
    results.push(result);

    if (result.success) {
      succeeded += 1;
      console.log(
        `[task-worker] completed task #${task.id} "${task.title}"`
      );
    } else if ("deferred" in result && result.deferred) {
      deferred += 1;
      console.log(
        `[task-worker] deferred task #${task.id} "${task.title}" — ${result.error ?? "dependency not met"}`
      );
    } else {
      failed += 1;
      console.log(
        `[task-worker] failed task #${task.id} "${task.title}" — ${result.error ?? "unknown error"}`
      );
    }
  }

  const finishedAt = new Date();
  console.log(
    `[task-worker] cycle complete in ${finishedAt.getTime() - startedAt.getTime()}ms — ` +
      `executed=${results.length} succeeded=${succeeded} failed=${failed} deferred=${deferred}`
  );

  return {
    executed: results.length,
    succeeded,
    failed,
    deferred,
    results,
    startedAt,
    finishedAt,
  };
}

/** Executes pending tasks — delegates to runTaskWorkerCycle. */
export async function executePendingTasks(limit = 10) {
  const cycle = await runTaskWorkerCycle({ limit });
  return cycle.results;
}

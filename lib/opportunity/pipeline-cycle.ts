import { runTaskWorkerCycle } from "@/lib/agents/execution/runner";
import type { TaskWorkerCycleResult } from "@/lib/agents/execution/runner";
import { getPipelineBatchSize } from "@/lib/env";
import { runCeoCycle, type CeoCycleResult } from "./ceo-cycle";
import { runValidatorCycle, type ValidatorCycleResult } from "./validator-cycle";

export type EmpirePipelineCycleResult = {
  validator: ValidatorCycleResult;
  ceo: CeoCycleResult;
  tasks: TaskWorkerCycleResult;
  startedAt: Date;
  finishedAt: Date;
};

export type EmpirePipelineCycleOptions = {
  limit?: number;
  skipValidator?: boolean;
  skipCeo?: boolean;
};

/**
 * Full empire pipeline:
 * researching → validated/killed (Atlas) → launch_ready/killed (Alpha) → task execution.
 */
export async function runEmpirePipelineCycle(
  options: EmpirePipelineCycleOptions = {}
): Promise<EmpirePipelineCycleResult> {
  const startedAt = new Date();
  const limit = options.limit ?? getPipelineBatchSize();

  console.log(`[pipeline] empire cycle start (batch limit=${limit})`);

  const validator = options.skipValidator
    ? emptyValidatorResult(startedAt)
    : await runValidatorCycle({ limit });

  const ceo = options.skipCeo
    ? emptyCeoResult(startedAt)
    : await runCeoCycle({ limit });

  const tasks = await runTaskWorkerCycle({ limit });

  const finishedAt = new Date();
  console.log(
    `[pipeline] empire cycle done in ${finishedAt.getTime() - startedAt.getTime()}ms — ` +
      `validator(approved=${validator.approved}, rejected=${validator.rejected}) ` +
      `ceo(approved=${ceo.approved}, rejected=${ceo.rejected}) ` +
      `tasks(succeeded=${tasks.succeeded}, failed=${tasks.failed}, deferred=${tasks.deferred})`
  );

  return { validator, ceo, tasks, startedAt, finishedAt };
}

function emptyValidatorResult(startedAt: Date): ValidatorCycleResult {
  return {
    processed: 0,
    approved: 0,
    rejected: 0,
    failed: 0,
    results: [],
    startedAt,
    finishedAt: new Date(),
  };
}

function emptyCeoResult(startedAt: Date): CeoCycleResult {
  return {
    processed: 0,
    approved: 0,
    rejected: 0,
    held: 0,
    failed: 0,
    results: [],
    startedAt,
    finishedAt: new Date(),
  };
}

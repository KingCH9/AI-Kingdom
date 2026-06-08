import { getPipelineBatchSize } from "@/lib/env";
import { runCeoCycle, type CeoCycleResult } from "./ceo-cycle";
import { runValidatorCycle, type ValidatorCycleResult } from "./validator-cycle";

export type EmpirePipelineCycleResult = {
  validator: ValidatorCycleResult;
  ceo: CeoCycleResult;
  startedAt: Date;
  finishedAt: Date;
};

export type EmpirePipelineCycleOptions = {
  limit?: number;
  skipValidator?: boolean;
  skipCeo?: boolean;
};

/**
 * Full opportunity status pipeline:
 * researching → validated/killed (Atlas) → launch_ready/killed (Alpha).
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

  const finishedAt = new Date();
  console.log(
    `[pipeline] empire cycle done in ${finishedAt.getTime() - startedAt.getTime()}ms — ` +
      `validator(approved=${validator.approved}, rejected=${validator.rejected}) ` +
      `ceo(approved=${ceo.approved}, rejected=${ceo.rejected})`
  );

  return { validator, ceo, startedAt, finishedAt };
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
    failed: 0,
    results: [],
    startedAt,
    finishedAt: new Date(),
  };
}

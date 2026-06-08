import {
  getTaskWorkerBatchSize,
  getValidatorBatchSize,
  isValidatorAutomationEnabled,
} from "@/lib/env";
import { runTaskWorkerCycle } from "./runner";
import { runValidatorCycle } from "@/lib/opportunity/validator-cycle";
import { refreshIntelligenceSnapshot } from "@/lib/intelligence";

export interface EmpireWorkerCycleResult {
  validator: {
    processed: number;
    approved: number;
    rejected: number;
    failed: number;
  } | null;
  tasks: Awaited<ReturnType<typeof runTaskWorkerCycle>>;
  intelligence: {
    generatedAt: string;
    opportunityCount: number;
    storeCount: number;
    recommendationCount: number;
  };
  startedAt: Date;
  finishedAt: Date;
}

/** Full empire automation cycle — validator, tasks, intelligence refresh. */
export async function runEmpireWorkerCycle(options?: {
  taskLimit?: number;
  validatorLimit?: number;
  skipValidator?: boolean;
  skipIntelligence?: boolean;
}): Promise<EmpireWorkerCycleResult> {
  const startedAt = new Date();
  let validatorResult: EmpireWorkerCycleResult["validator"] = null;

  if (
    !options?.skipValidator &&
    isValidatorAutomationEnabled()
  ) {
    const validation = await runValidatorCycle({
      limit: options?.validatorLimit ?? getValidatorBatchSize(),
    });

    validatorResult = {
      processed: validation.processed,
      approved: validation.approved,
      rejected: validation.rejected,
      failed: validation.failed,
    };
  }

  const tasks = await runTaskWorkerCycle({
    limit: options?.taskLimit ?? getTaskWorkerBatchSize(),
  });

  let intelligenceSummary: EmpireWorkerCycleResult["intelligence"] = {
    generatedAt: new Date().toISOString(),
    opportunityCount: 0,
    storeCount: 0,
    recommendationCount: 0,
  };

  if (!options?.skipIntelligence) {
    const snapshot = await refreshIntelligenceSnapshot();
    intelligenceSummary = {
      generatedAt: snapshot.generatedAt,
      opportunityCount: snapshot.opportunityCount,
      storeCount: snapshot.storeCount,
      recommendationCount: snapshot.analysis.recommendations.length,
    };
  }

  return {
    validator: validatorResult,
    tasks,
    intelligence: intelligenceSummary,
    startedAt,
    finishedAt: new Date(),
  };
}

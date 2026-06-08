import type { Opportunity } from "@prisma/client";
import { normalizeOpportunityStatus } from "./status";

export interface EmpireQueueStats {
  researchQueue: number;
  validatorQueue: number;
  ceoQueue: number;
  launchReady: number;
  activeTasks: number;
}

/** Computes command-centre queue counts for the empire dashboard. */
export function computeEmpireQueueStats(
  opportunities: Opportunity[],
  taskCounts: { pending: number; inProgress: number }
): EmpireQueueStats {
  const researching = opportunities.filter(
    (item) => normalizeOpportunityStatus(item.status) === "researching"
  ).length;

  return {
    researchQueue: researching,
    validatorQueue: researching,
    ceoQueue: opportunities.filter(
      (item) => normalizeOpportunityStatus(item.status) === "validated"
    ).length,
    launchReady: opportunities.filter(
      (item) => normalizeOpportunityStatus(item.status) === "launch_ready"
    ).length,
    activeTasks: taskCounts.pending + taskCounts.inProgress,
  };
}

import { prisma } from "@/lib/prisma";
import { syncAllPerformance } from "./performance-sync";

export type BackfillResult = {
  agentsCreated: number;
  scoutsCreated: number;
  agentsUpserted: number;
  scoutsUpserted: number;
};

/**
 * Idempotent startup backfill — creates rows for all agents/scouts from computed metrics.
 * Safe to run on every bootstrap; upserts overwrite snapshots only.
 */
export async function backfillPerformanceSnapshots(): Promise<BackfillResult> {
  const beforeAgents = await prisma.agentPerformance.count();
  const beforeScouts = await prisma.scoutPerformance.count();

  const syncResult = await syncAllPerformance();

  const afterAgents = await prisma.agentPerformance.count();
  const afterScouts = await prisma.scoutPerformance.count();

  return {
    agentsCreated: Math.max(afterAgents - beforeAgents, 0),
    scoutsCreated: Math.max(afterScouts - beforeScouts, 0),
    agentsUpserted: syncResult.agentsUpserted,
    scoutsUpserted: syncResult.scoutsUpserted,
  };
}

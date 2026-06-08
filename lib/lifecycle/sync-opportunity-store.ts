import { logAgentAction } from "@/lib/agents/activity";
import type { OpportunityStatus } from "@/lib/types";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { prisma } from "@/lib/prisma";
import type { DbClient } from "@/lib/prisma/db-client";
import { normalizeStoreStatus } from "@/lib/store/status";
import { STORE_STATUSES, syncStoreStatusForOpportunity } from "@/lib/store/sync-lifecycle";
import {
  isOpportunityLifecycleUpgrade,
  mapStoreStatusToOpportunityStatus,
} from "./store-to-opportunity";

const SYSTEM_AGENT = "Empire System";

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

/**
 * Single source of truth: store lifecycle → linked opportunity lifecycle.
 * Called after revenue promotions, store kills, and lifecycle reconciliation.
 */
export async function syncOpportunityFromStore(
  storeId: number,
  db: DbClient = prisma
) {
  const store = await db.store.findUnique({
    where: { id: storeId },
    include: { opportunity: true },
  });

  if (!store?.opportunityId || !store.opportunity) {
    return null;
  }

  const storeStatus = normalizeStoreStatus(store.status);
  const targetStatus = mapStoreStatusToOpportunityStatus(storeStatus);

  if (!targetStatus) {
    return store.opportunity;
  }

  const currentStatus = normalizeOpportunityStatus(store.opportunity.status);

  if (currentStatus === targetStatus) {
    return store.opportunity;
  }

  if (!isOpportunityLifecycleUpgrade(currentStatus, targetStatus)) {
    return store.opportunity;
  }

  const opportunity = await db.opportunity.update({
    where: { id: store.opportunityId },
    data: { status: targetStatus },
  });

  const action =
    targetStatus === "killed"
      ? `Empire lifecycle sync killed opportunity #${opportunity.id} (${opportunity.productName}) — linked store #${storeId} killed`
      : `Empire lifecycle sync: opportunity #${opportunity.id} (${opportunity.productName}) ${formatStatusLabel(currentStatus)} → ${formatStatusLabel(targetStatus)} (store #${storeId} at ${storeStatus})`;

  if (db === prisma) {
    await logAgentAction(SYSTEM_AGENT, action, {
      opportunityId: opportunity.id,
      storeId,
    });
  } else {
    await db.agentLog.create({
      data: {
        agentName: SYSTEM_AGENT,
        action,
        opportunityId: opportunity.id,
        taskId: null,
        storeId,
      },
    });
  }

  return opportunity;
}

/**
 * Propagates opportunity kill to linked store.
 * Called from updateOpportunityStatus when an opportunity is killed.
 */
export async function syncStoreFromOpportunityKill(opportunityId: number) {
  return syncStoreStatusForOpportunity(opportunityId, STORE_STATUSES.KILLED);
}

/**
 * Reconciles all store→opportunity lifecycle pairs.
 * Used by the background worker intelligence refresh cycle.
 */
export async function reconcileAllStoreOpportunityLifecycle() {
  const stores = await prisma.store.findMany({
    where: { opportunityId: { not: null } },
    select: { id: true },
  });

  let synced = 0;

  for (const store of stores) {
    const before = await prisma.store.findUnique({
      where: { id: store.id },
      include: { opportunity: true },
    });

    const after = await syncOpportunityFromStore(store.id);

    if (
      after &&
      before?.opportunity &&
      normalizeOpportunityStatus(before.opportunity.status) !==
        normalizeOpportunityStatus(after.status)
    ) {
      synced += 1;
    }
  }

  return { checked: stores.length, synced };
}

export type { OpportunityStatus };

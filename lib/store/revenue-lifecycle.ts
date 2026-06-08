import type { StoreStatus } from "@/lib/types/store";
import { prisma } from "@/lib/prisma";
import type { DbClient } from "@/lib/prisma/db-client";
import { normalizeStoreStatus, STORE_STATUSES } from "./status";
import { STORE_REVENUE_THRESHOLDS } from "./thresholds";

const LIFECYCLE_RANK: Record<StoreStatus, number> = {
  draft: 0,
  building: 1,
  launched: 2,
  scaling: 3,
  profitable: 4,
  killed: -1,
};

/** Determines target lifecycle status from cumulative store revenue. */
export function evaluateStoreStatusFromRevenue(
  totalRevenue: number
): StoreStatus {
  const { SCALING_MIN_REVENUE, PROFITABLE_MIN_REVENUE } =
    STORE_REVENUE_THRESHOLDS;

  if (totalRevenue >= PROFITABLE_MIN_REVENUE) {
    return STORE_STATUSES.PROFITABLE;
  }

  if (totalRevenue >= SCALING_MIN_REVENUE) {
    return STORE_STATUSES.SCALING;
  }

  return STORE_STATUSES.LAUNCHED;
}

/** Promotes store lifecycle when revenue thresholds are met. Never downgrades. */
export async function syncStoreLifecycleFromRevenue(
  storeId: number,
  db: DbClient = prisma
) {
  const store = await db.store.findUnique({ where: { id: storeId } });

  if (!store || normalizeStoreStatus(store.status) === STORE_STATUSES.KILLED) {
    return null;
  }

  const current = normalizeStoreStatus(store.status);
  const currentRank = LIFECYCLE_RANK[current];

  const target = evaluateStoreStatusFromRevenue(store.revenue);
  const targetRank = LIFECYCLE_RANK[target];

  if (targetRank <= currentRank) {
    return store;
  }

  return db.store.update({
    where: { id: storeId },
    data: { status: target },
  });
}

import { prisma } from "@/lib/prisma";
import type { DbClient } from "@/lib/prisma/db-client";
import { syncOpportunityFromStore } from "@/lib/lifecycle";
import { syncStoreLifecycleFromRevenue } from "./revenue-lifecycle";

export type RecordStoreRevenueInput = {
  storeId: number;
  amount: number;
  source: string;
  orderId?: number;
};

export type RecordStoreRevenueResult = {
  revenueId: number;
  storeId: number;
  amount: number;
  totalRevenue: number;
  storeStatus: string;
};

/**
 * Records store revenue and lifecycle side-effects using the supplied DB client.
 * Call inside `prisma.$transaction` for atomic order ingestion.
 */
export async function recordStoreRevenueTx(
  db: DbClient,
  input: RecordStoreRevenueInput
): Promise<RecordStoreRevenueResult> {
  if (input.amount <= 0) {
    throw new Error("Revenue amount must be positive");
  }

  const store = await db.store.findUnique({
    where: { id: input.storeId },
  });

  if (!store) {
    throw new Error(`Store #${input.storeId} not found`);
  }

  const revenue = await db.revenue.create({
    data: {
      amount: input.amount,
      source: input.source,
      storeId: input.storeId,
      orderId: input.orderId ?? null,
    },
  });

  const updated = await db.store.update({
    where: { id: input.storeId },
    data: {
      revenue: { increment: input.amount },
    },
  });

  const afterLifecycle = await syncStoreLifecycleFromRevenue(input.storeId, db);
  const finalStore = afterLifecycle ?? updated;

  await syncOpportunityFromStore(input.storeId, db);

  const refreshedStore = await db.store.findUnique({
    where: { id: input.storeId },
  });

  return {
    revenueId: revenue.id,
    storeId: finalStore.id,
    amount: input.amount,
    totalRevenue: refreshedStore?.revenue ?? finalStore.revenue,
    storeStatus: refreshedStore?.status ?? finalStore.status,
  };
}

/**
 * Single entry point for recording store revenue.
 * Updates store total and promotes lifecycle when thresholds are met.
 */
export async function recordStoreRevenue(
  input: RecordStoreRevenueInput
): Promise<RecordStoreRevenueResult> {
  return prisma.$transaction((tx) => recordStoreRevenueTx(tx, input));
}

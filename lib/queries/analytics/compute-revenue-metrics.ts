import type { StoreListItem } from "@/lib/queries/stores/types";

export interface RevenueMetrics {
  totalRevenue: number;
  averageRevenuePerStore: number;
  topStore: { id: number; name: string; revenue: number } | null;
  revenueEntryCount: number;
}

/** Computes empire-wide revenue metrics from store list. */
export function computeRevenueMetrics(
  stores: StoreListItem[],
  revenueEntryCount: number
): RevenueMetrics {
  const totalRevenue = stores.reduce((sum, store) => sum + store.revenue, 0);

  const topStore =
    stores.length > 0
      ? stores.reduce((prev, current) =>
          prev.revenue > current.revenue ? prev : current
        )
      : null;

  return {
    totalRevenue,
    averageRevenuePerStore:
      stores.length > 0 ? Math.round(totalRevenue / stores.length) : 0,
    topStore: topStore
      ? { id: topStore.id, name: topStore.name, revenue: topStore.revenue }
      : null,
    revenueEntryCount,
  };
}

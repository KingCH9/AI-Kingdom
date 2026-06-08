import type { StoreDashboardStats } from "@/lib/queries/stores/types";

export interface StoreLifecycleMetrics extends StoreDashboardStats {
  draft: number;
  killed: number;
  launchRate: number;
  profitabilityRate: number;
}

/** Extends store dashboard stats with lifecycle conversion rates. */
export function computeStoreLifecycleMetrics(
  stats: StoreDashboardStats & { draft?: number; killed?: number }
): StoreLifecycleMetrics {
  const draft = stats.draft ?? 0;
  const killed = stats.killed ?? 0;
  const launchedOrBeyond =
    stats.launched + stats.scaling + stats.profitable;

  const launchRate =
    stats.total > 0
      ? Math.round((launchedOrBeyond / stats.total) * 100)
      : 0;

  const profitabilityRate =
    launchedOrBeyond > 0
      ? Math.round((stats.profitable / launchedOrBeyond) * 100)
      : 0;

  return {
    ...stats,
    draft,
    killed,
    launchRate,
    profitabilityRate,
  };
}

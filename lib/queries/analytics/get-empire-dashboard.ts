import { prisma } from "@/lib/prisma";
import { computeEmpireQueueStats, computeOpportunityStats } from "@/lib/opportunity";
import { getIntelligenceSnapshot } from "@/lib/intelligence";
import {
  getStoreDashboardStats,
  getStores,
  type StoreListItem,
} from "@/lib/queries/stores";
import { normalizeStoreStatus } from "@/lib/store/status";
import { computeEmpireFunnel } from "./compute-funnel";
import { computeRevenueMetrics } from "./compute-revenue-metrics";
import { computeStoreLifecycleMetrics } from "./compute-store-lifecycle-metrics";
import type { EmpireFunnelStats } from "./compute-funnel";
import type { RevenueMetrics } from "./compute-revenue-metrics";
import type { StoreLifecycleMetrics } from "./compute-store-lifecycle-metrics";
import type { IntelligenceSnapshot } from "@/lib/intelligence/types";
import type { OpportunityDashboardStats } from "@/lib/opportunity/compute-stats";

export interface RecentLaunch {
  id: number;
  name: string;
  niche: string;
  opportunityId: number | null;
  opportunityName: string | null;
  createdAt: Date;
}

export interface RecentProfitableStore {
  id: number;
  name: string;
  niche: string;
  revenue: number;
  opportunityId: number | null;
}

export interface EmpireDashboardData {
  funnel: EmpireFunnelStats;
  revenue: RevenueMetrics;
  storeLifecycle: StoreLifecycleMetrics;
  opportunityStats: OpportunityDashboardStats;
  queueStats: ReturnType<typeof computeEmpireQueueStats>;
  intelligence: IntelligenceSnapshot;
  recentLaunches: RecentLaunch[];
  recentProfitableStores: RecentProfitableStore[];
  recentOpportunities: Array<{
    id: number;
    productName: string;
    status: string;
    opportunityScore: number | null;
  }>;
  recentLogs: Array<{
    id: number;
    agentName: string;
    action: string;
    createdAt: Date;
  }>;
  agentCount: number;
  pendingTasks: number;
  stores: StoreListItem[];
}

/** Unified empire command centre data — no direct Prisma in pages. */
export async function getEmpireDashboard(): Promise<EmpireDashboardData> {
  const [
    stores,
    opportunities,
    agentCount,
    pendingTasks,
    inProgressTasks,
    recentLogs,
    recentOpportunities,
    revenueEntryCount,
    storeStatsRaw,
    intelligence,
  ] = await Promise.all([
    getStores(),
    prisma.opportunity.findMany(),
    prisma.agent.count(),
    prisma.task.count({ where: { status: "pending" } }),
    prisma.task.count({ where: { status: "in_progress" } }),
    prisma.agentLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.opportunity.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        productName: true,
        status: true,
        opportunityScore: true,
      },
    }),
    prisma.revenue.count(),
    getStoreDashboardStats(),
    getIntelligenceSnapshot(),
  ]);

  const allStoreStatuses = await prisma.store.findMany({
    select: { status: true },
  });

  const draft = allStoreStatuses.filter(
    (store) => normalizeStoreStatus(store.status) === "draft"
  ).length;

  const killed = allStoreStatuses.filter(
    (store) => normalizeStoreStatus(store.status) === "killed"
  ).length;

  const recentLaunches: RecentLaunch[] = stores
    .filter((store) => {
      const status = store.status;
      return status === "launched" || status === "scaling" || status === "profitable";
    })
    .slice(0, 5)
    .map((store) => ({
      id: store.id,
      name: store.name,
      niche: store.niche,
      opportunityId: store.opportunityId,
      opportunityName: store.opportunityName,
      createdAt: store.createdAt,
    }));

  const recentProfitableStores: RecentProfitableStore[] = stores
    .filter((store) => store.status === "profitable")
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((store) => ({
      id: store.id,
      name: store.name,
      niche: store.niche,
      revenue: store.revenue,
      opportunityId: store.opportunityId,
    }));

  return {
    funnel: computeEmpireFunnel(opportunities),
    revenue: computeRevenueMetrics(stores, revenueEntryCount),
    storeLifecycle: computeStoreLifecycleMetrics({
      ...storeStatsRaw,
      draft,
      killed,
    }),
    opportunityStats: computeOpportunityStats(opportunities),
    queueStats: computeEmpireQueueStats(opportunities, {
      pending: pendingTasks,
      inProgress: inProgressTasks,
    }),
    intelligence,
    recentLaunches,
    recentProfitableStores,
    recentOpportunities,
    recentLogs,
    agentCount,
    pendingTasks,
    stores,
  };
}

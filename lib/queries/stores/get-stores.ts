import { prisma } from "@/lib/prisma";
import { normalizeStoreStatus } from "@/lib/store/status";
import type { StoreDashboardStats, StoreListItem } from "./types";

export async function getStores(): Promise<StoreListItem[]> {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: {
        select: {
          id: true,
          productName: true,
          opportunityScore: true,
        },
      },
    },
  });

  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    niche: store.niche,
    revenue: store.revenue,
    status: normalizeStoreStatus(store.status),
    rawStatus: store.status,
    opportunityId: store.opportunityId,
    opportunityName: store.opportunity?.productName ?? null,
    opportunityScore: store.opportunity?.opportunityScore ?? null,
    createdAt: store.createdAt,
  }));
}

export async function getStoreDashboardStats(): Promise<StoreDashboardStats> {
  const stores = await prisma.store.findMany({
    select: { status: true },
  });

  const normalized = stores.map((store) => normalizeStoreStatus(store.status));

  return {
    total: stores.length,
    building: normalized.filter((status) => status === "building").length,
    launched: normalized.filter((status) => status === "launched").length,
    scaling: normalized.filter((status) => status === "scaling").length,
    profitable: normalized.filter((status) => status === "profitable").length,
  };
}

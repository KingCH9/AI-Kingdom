import type { Opportunity, Store } from "@prisma/client";
import { reconcileAllStoreOpportunityLifecycle, syncOpportunityFromStore } from "@/lib/lifecycle";
import { OPPORTUNITY_LIFECYCLE_RANK } from "@/lib/lifecycle/store-to-opportunity";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { prisma } from "@/lib/prisma";
import { STORE_STATUSES } from "./status";

/** Normalizes store/opportunity names for safe matching. */
export function normalizeLinkName(name: string): string {
  return name.trim().toLowerCase();
}

export type StoreOpportunityLinkResult = {
  storeId: number;
  storeName: string;
  opportunityId: number;
  opportunityName: string;
  opportunityStatusBefore: string;
  opportunityStatusAfter: string;
};

export type StoreOpportunityLinkSkip = {
  storeId?: number;
  storeName?: string;
  opportunityId?: number;
  opportunityName?: string;
  reason: string;
};

export type RepairStoreOpportunityLinksReport = {
  linked: StoreOpportunityLinkResult[];
  skipped: StoreOpportunityLinkSkip[];
  reconciled: { checked: number; synced: number };
};

function rankOrphanStore(a: Store, b: Store): number {
  if (b.revenue !== a.revenue) {
    return b.revenue - a.revenue;
  }
  return b.id - a.id;
}

function rankOpportunityForLink(a: Opportunity, b: Opportunity): number {
  const rankA =
    OPPORTUNITY_LIFECYCLE_RANK[normalizeOpportunityStatus(a.status)] ?? 0;
  const rankB =
    OPPORTUNITY_LIFECYCLE_RANK[normalizeOpportunityStatus(b.status)] ?? 0;

  if (rankB !== rankA) {
    return rankB - rankA;
  }

  const scoreA = a.opportunityScore ?? 0;
  const scoreB = b.opportunityScore ?? 0;
  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  return a.id - b.id;
}

/** Returns true when a store can be linked to an opportunity. */
export function canLinkStoreToOpportunity(
  store: Pick<Store, "id" | "opportunityId">,
  opportunityId: number,
  opportunityAlreadyLinkedStoreId: number | null
): boolean {
  if (store.opportunityId != null && store.opportunityId !== opportunityId) {
    return false;
  }

  if (
    opportunityAlreadyLinkedStoreId != null &&
    opportunityAlreadyLinkedStoreId !== store.id
  ) {
    return false;
  }

  return true;
}

/** Links a store to an opportunity when safe. Returns null when blocked. */
export async function linkStoreToOpportunity(
  storeId: number,
  opportunityId: number
): Promise<Store | null> {
  const [store, opportunity, linkedStore] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.opportunity.findUnique({ where: { id: opportunityId } }),
    prisma.store.findFirst({ where: { opportunityId } }),
  ]);

  if (!store || !opportunity) {
    return null;
  }

  if (
    !canLinkStoreToOpportunity(
      store,
      opportunityId,
      linkedStore?.id ?? null
    )
  ) {
    return null;
  }

  if (store.opportunityId === opportunityId) {
    return store;
  }

  return prisma.store.update({
    where: { id: storeId },
    data: { opportunityId },
  });
}

/**
 * Ensures a store exists and is linked to the opportunity.
 * Reuses an existing orphan store with a matching name before creating a new one.
 */
export async function ensureStoreForOpportunity(
  opportunity: Opportunity
): Promise<Store> {
  const linked = await prisma.store.findFirst({
    where: { opportunityId: opportunity.id },
  });

  if (linked) {
    return linked;
  }

  const orphans = await prisma.store.findMany({
    where: { opportunityId: null },
  });

  const matchingOrphans = orphans
    .filter(
      (store) =>
        normalizeLinkName(store.name) ===
        normalizeLinkName(opportunity.productName)
    )
    .sort(rankOrphanStore);

  if (matchingOrphans.length > 0) {
    const linkedStore = await linkStoreToOpportunity(
      matchingOrphans[0].id,
      opportunity.id
    );

    if (linkedStore) {
      return linkedStore;
    }
  }

  return prisma.store.create({
    data: {
      name: opportunity.productName,
      niche: opportunity.category || "General",
      revenue: 0,
      status: STORE_STATUSES.DRAFT,
      opportunityId: opportunity.id,
    },
  });
}

/**
 * Repairs orphan stores by matching name to unlinked opportunities,
 * then reconciles opportunity lifecycle from store state.
 */
export async function repairStoreOpportunityLinks(): Promise<RepairStoreOpportunityLinksReport> {
  const [stores, opportunities] = await Promise.all([
    prisma.store.findMany(),
    prisma.opportunity.findMany(),
  ]);

  const linkedOpportunityIds = new Set(
    stores
      .map((store) => store.opportunityId)
      .filter((id): id is number => id != null)
  );

  const linkedStoreIds = new Set<number>();
  const linked: StoreOpportunityLinkResult[] = [];
  const skipped: StoreOpportunityLinkSkip[] = [];

  const orphans = stores.filter((store) => store.opportunityId == null);
  const orphansByName = new Map<string, Store[]>();

  for (const store of orphans) {
    const key = normalizeLinkName(store.name);
    const group = orphansByName.get(key) ?? [];
    group.push(store);
    orphansByName.set(key, group);
  }

  const opportunitiesByName = new Map<string, Opportunity[]>();

  for (const opportunity of opportunities) {
    const key = normalizeLinkName(opportunity.productName);
    const group = opportunitiesByName.get(key) ?? [];
    group.push(opportunity);
    opportunitiesByName.set(key, group);
  }

  for (const [name, orphanGroup] of orphansByName) {
    const opportunityGroup = opportunitiesByName.get(name);
    if (!opportunityGroup?.length) {
      continue;
    }

    const availableOpportunities = opportunityGroup
      .filter((opportunity) => !linkedOpportunityIds.has(opportunity.id))
      .sort(rankOpportunityForLink);

    const availableStores = orphanGroup
      .filter((store) => !linkedStoreIds.has(store.id))
      .sort(rankOrphanStore);

    if (availableOpportunities.length === 0) {
      for (const store of availableStores) {
        skipped.push({
          storeId: store.id,
          storeName: store.name,
          reason: "Matching opportunity already linked to another store",
        });
      }
      continue;
    }

    if (availableStores.length === 0) {
      continue;
    }

    const store = availableStores[0];
    const opportunity = availableOpportunities[0];

    const linkedStore = await linkStoreToOpportunity(store.id, opportunity.id);
    if (!linkedStore) {
      skipped.push({
        storeId: store.id,
        storeName: store.name,
        opportunityId: opportunity.id,
        opportunityName: opportunity.productName,
        reason: "Link blocked by existing linkage conflict",
      });
      continue;
    }

    const syncedOpportunity = await syncOpportunityFromStore(linkedStore.id);
    const statusAfter =
      syncedOpportunity?.status ??
      (
        await prisma.opportunity.findUnique({
          where: { id: opportunity.id },
        })
      )?.status ??
      opportunity.status;

    linked.push({
      storeId: linkedStore.id,
      storeName: linkedStore.name,
      opportunityId: opportunity.id,
      opportunityName: opportunity.productName,
      opportunityStatusBefore: opportunity.status,
      opportunityStatusAfter: statusAfter,
    });

    linkedOpportunityIds.add(opportunity.id);
    linkedStoreIds.add(linkedStore.id);

    for (const duplicate of availableStores.slice(1)) {
      skipped.push({
        storeId: duplicate.id,
        storeName: duplicate.name,
        opportunityId: opportunity.id,
        opportunityName: opportunity.productName,
        reason: "Duplicate orphan store name — higher-priority store linked instead",
      });
    }

    for (const duplicate of availableOpportunities.slice(1)) {
      skipped.push({
        storeId: store.id,
        storeName: store.name,
        opportunityId: duplicate.id,
        opportunityName: duplicate.productName,
        reason: "Duplicate opportunity name — higher-priority opportunity linked instead",
      });
    }
  }

  const reconciled = await reconcileAllStoreOpportunityLifecycle();

  return { linked, skipped, reconciled };
}

import { prisma } from "@/lib/prisma";
import type { StoreStatus } from "@/lib/types/store";
import { STORE_STATUSES } from "./status";

/** Updates linked store status when opportunity lifecycle advances. */
export async function syncStoreStatusForOpportunity(
  opportunityId: number,
  storeStatus: StoreStatus
) {
  const store = await prisma.store.findFirst({
    where: { opportunityId },
  });

  if (!store) {
    return null;
  }

  return prisma.store.update({
    where: { id: store.id },
    data: { status: storeStatus },
  });
}

export { STORE_STATUSES };

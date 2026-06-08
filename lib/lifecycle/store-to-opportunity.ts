import type { StoreStatus } from "@/lib/types/store";
import type { OpportunityStatus } from "@/lib/types";
import { STORE_STATUSES } from "@/lib/store/status";

/** Lifecycle rank for opportunity statuses — higher means further along the pipeline. */
export const OPPORTUNITY_LIFECYCLE_RANK: Record<OpportunityStatus, number> = {
  researching: 0,
  validated: 1,
  launch_ready: 2,
  sourcing: 3,
  building: 4,
  launched: 5,
  scaling: 6,
  profitable: 7,
  killed: -1,
};

/** Maps store lifecycle status to the linked opportunity status. */
export function mapStoreStatusToOpportunityStatus(
  storeStatus: StoreStatus
): OpportunityStatus | null {
  switch (storeStatus) {
    case STORE_STATUSES.BUILDING:
      return "building";
    case STORE_STATUSES.LAUNCHED:
      return "launched";
    case STORE_STATUSES.SCALING:
      return "scaling";
    case STORE_STATUSES.PROFITABLE:
      return "profitable";
    case STORE_STATUSES.KILLED:
      return "killed";
    default:
      return null;
  }
}

/** Returns true when the target opportunity status is an upgrade from current. */
export function isOpportunityLifecycleUpgrade(
  current: OpportunityStatus,
  target: OpportunityStatus
): boolean {
  if (target === "killed") {
    return current !== "killed";
  }

  if (current === "killed") {
    return false;
  }

  return (
    OPPORTUNITY_LIFECYCLE_RANK[target] > OPPORTUNITY_LIFECYCLE_RANK[current]
  );
}

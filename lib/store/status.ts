import type { AnyStoreStatus, StoreStatus } from "@/lib/types/store";

/** Single source of truth for store lifecycle status values. */
export const STORE_STATUSES = {
  DRAFT: "draft",
  BUILDING: "building",
  LAUNCHED: "launched",
  SCALING: "scaling",
  PROFITABLE: "profitable",
  KILLED: "killed",
} as const satisfies Record<string, StoreStatus>;

export const STORE_STATUS_LIST: StoreStatus[] = [
  STORE_STATUSES.DRAFT,
  STORE_STATUSES.BUILDING,
  STORE_STATUSES.LAUNCHED,
  STORE_STATUSES.SCALING,
  STORE_STATUSES.PROFITABLE,
  STORE_STATUSES.KILLED,
];

const LEGACY_STATUS_MAP: Record<string, StoreStatus> = {
  Launching: STORE_STATUSES.DRAFT,
  launching: STORE_STATUSES.DRAFT,
  Building: STORE_STATUSES.BUILDING,
  building: STORE_STATUSES.BUILDING,
  active: STORE_STATUSES.LAUNCHED,
  Active: STORE_STATUSES.LAUNCHED,
  Launched: STORE_STATUSES.LAUNCHED,
  launched: STORE_STATUSES.LAUNCHED,
  Scaling: STORE_STATUSES.SCALING,
  scaling: STORE_STATUSES.SCALING,
  Profitable: STORE_STATUSES.PROFITABLE,
  profitable: STORE_STATUSES.PROFITABLE,
  Killed: STORE_STATUSES.KILLED,
  killed: STORE_STATUSES.KILLED,
};

/** Maps persisted store status strings to canonical lifecycle values. */
export function normalizeStoreStatus(status: AnyStoreStatus): StoreStatus {
  if (STORE_STATUS_LIST.includes(status as StoreStatus)) {
    return status as StoreStatus;
  }

  return LEGACY_STATUS_MAP[status] ?? STORE_STATUSES.DRAFT;
}

export function isStoreStatus(value: string): value is StoreStatus {
  return STORE_STATUS_LIST.includes(value as StoreStatus);
}

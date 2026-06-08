/**
 * Canonical store lifecycle statuses for AI Empire.
 */
export type StoreStatus =
  | "draft"
  | "building"
  | "launched"
  | "scaling"
  | "profitable"
  | "killed";

/** Legacy statuses persisted before Phase 5 — normalized at read time. */
export type LegacyStoreStatus =
  | "Launching"
  | "Building"
  | "active"
  | "Active";

export type AnyStoreStatus = StoreStatus | LegacyStoreStatus | string;

export interface StoreRecord {
  id: number;
  name: string;
  niche: string;
  revenue: number;
  status: string;
  opportunityId: number | null;
  createdAt: Date;
}

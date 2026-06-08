import { revenueStreamToVentureTypeKey } from "../seed/venture-engine";
import { SCOUT_REGISTRY } from "../scouts";
import { VENTURE_TYPE_KEYS, type VentureTypeKey } from "../constants";
import { isScoutOpportunityCategory } from "../scouts/opportunity-generator";
import type { ScoutDefinition } from "../scouts/types";
import type { ScoutRawMission, ScoutRawOpportunity } from "./scout-metrics";

export function scoutKeyFromCategory(
  category: string | null | undefined
): string | null {
  if (!isScoutOpportunityCategory(category)) return null;
  return category!.slice("hq_scout:".length);
}

/** Venture types with a dedicated Athena scout — analytics attribution only. */
export const SCOUT_VENTURE_TYPE_KEYS: Set<string> = new Set([
  VENTURE_TYPE_KEYS.SHOPIFY,
  VENTURE_TYPE_KEYS.ETSY,
  VENTURE_TYPE_KEYS.AFFILIATE,
  VENTURE_TYPE_KEYS.CONTENT,
  VENTURE_TYPE_KEYS.SAAS,
  VENTURE_TYPE_KEYS.AMAZON,
]);

/** Resolve venture type for analytics when mission.ventureTypeId is unset. */
export function resolveMissionVentureTypeKey(input: {
  ventureTypeKey: string | null | undefined;
  revenueStream: string;
}): VentureTypeKey {
  if (input.ventureTypeKey && SCOUT_VENTURE_TYPE_KEYS.has(input.ventureTypeKey)) {
    return input.ventureTypeKey as VentureTypeKey;
  }
  return revenueStreamToVentureTypeKey(input.revenueStream) as VentureTypeKey;
}

export function getScoutForVentureType(
  ventureTypeKey: string
): ScoutDefinition | undefined {
  return SCOUT_REGISTRY.find((s) => s.ventureTypeKey === ventureTypeKey);
}

/**
 * Analytics-only mission → scout attribution.
 * Uses explicit scout opportunity tags first, then venture type (including revenueStream backfill).
 */
export function missionBelongsToScoutForAnalytics(
  mission: ScoutRawMission,
  scout: ScoutDefinition,
  opportunity: ScoutRawOpportunity | undefined
): boolean {
  const explicitScoutKey = opportunity
    ? scoutKeyFromCategory(opportunity.category)
    : null;
  if (explicitScoutKey != null) {
    return explicitScoutKey === scout.key;
  }

  return mission.ventureTypeKey === scout.ventureTypeKey;
}

/**
 * Analytics-only opportunity → scout attribution.
 * Counts scout-tagged opps and opps linked to missions of the scout's venture type.
 */
export function opportunityBelongsToScoutForAnalytics(
  opportunity: ScoutRawOpportunity,
  scout: ScoutDefinition,
  missionForOpp: ScoutRawMission | undefined
): boolean {
  const explicitScoutKey = scoutKeyFromCategory(opportunity.category);
  if (explicitScoutKey != null) {
    return explicitScoutKey === scout.key;
  }

  if (missionForOpp?.ventureTypeKey === scout.ventureTypeKey) {
    return true;
  }

  return false;
}

export { isScoutOpportunityCategory };

import { AFFILIATE_SCOUT } from "./affiliate-scout";
import { AMAZON_SCOUT } from "./amazon-scout";
import { CONTENT_SCOUT } from "./content-scout";
import { ETSY_SCOUT } from "./etsy-scout";
import { SAAS_SCOUT } from "./saas-scout";
import { SHOPIFY_SCOUT } from "./shopify-scout";
import type { ScoutDefinition, ScoutSnapshot } from "./types";
import { SCOUT_STATUSES } from "../constants";
import type { VentureTypeKey } from "../constants";

export const SCOUT_REGISTRY: ScoutDefinition[] = [
  SHOPIFY_SCOUT,
  ETSY_SCOUT,
  AFFILIATE_SCOUT,
  CONTENT_SCOUT,
  SAAS_SCOUT,
  AMAZON_SCOUT,
];

export function getScoutByVentureType(
  ventureTypeKey: VentureTypeKey
): ScoutDefinition | undefined {
  return SCOUT_REGISTRY.find((s) => s.ventureTypeKey === ventureTypeKey);
}

export function buildScoutSnapshots(input: {
  missionsByVentureType: Map<string, number>;
  opportunitiesByVentureType: Map<string, number>;
}): ScoutSnapshot[] {
  return SCOUT_REGISTRY.map((scout) => {
    const missions =
      input.missionsByVentureType.get(scout.ventureTypeKey) ?? 0;
    const opportunitiesDiscovered =
      input.opportunitiesByVentureType.get(scout.ventureTypeKey) ?? 0;

    let status = scout.defaultStatus;
    if (missions > 0) status = SCOUT_STATUSES.ACTIVE;
    else if (opportunitiesDiscovered > 0) status = SCOUT_STATUSES.RESEARCHING;

    return {
      ...scout,
      status,
      missions,
      opportunitiesDiscovered,
    };
  });
}

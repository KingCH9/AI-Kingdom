import { SCOUT_STATUSES, VENTURE_TYPE_KEYS } from "../constants";
import type { ScoutDefinition } from "./types";

export const SHOPIFY_SCOUT: ScoutDefinition = {
  key: "shopify_scout",
  displayName: "Shopify Scout",
  ventureTypeKey: VENTURE_TYPE_KEYS.SHOPIFY,
  description:
    "Discovers Shopify ecommerce opportunities — physical and digital products.",
  autonomous: false,
  defaultStatus: SCOUT_STATUSES.IDLE,
};

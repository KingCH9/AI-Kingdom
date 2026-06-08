import { SCOUT_STATUSES, VENTURE_TYPE_KEYS } from "../constants";
import type { ScoutDefinition } from "./types";

export const AFFILIATE_SCOUT: ScoutDefinition = {
  key: "affiliate_scout",
  displayName: "Affiliate Scout",
  ventureTypeKey: VENTURE_TYPE_KEYS.AFFILIATE,
  description:
    "Discovers affiliate niche sites and comparison content opportunities.",
  autonomous: false,
  defaultStatus: SCOUT_STATUSES.IDLE,
};

import { SCOUT_STATUSES, VENTURE_TYPE_KEYS } from "../constants";
import type { ScoutDefinition } from "./types";

export const AMAZON_SCOUT: ScoutDefinition = {
  key: "amazon_scout",
  displayName: "Amazon Scout",
  ventureTypeKey: VENTURE_TYPE_KEYS.AMAZON,
  description:
    "Discovers Amazon FBA and marketplace product opportunities.",
  autonomous: false,
  defaultStatus: SCOUT_STATUSES.IDLE,
};

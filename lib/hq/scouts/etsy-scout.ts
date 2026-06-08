import { SCOUT_STATUSES, VENTURE_TYPE_KEYS } from "../constants";
import type { ScoutDefinition } from "./types";

export const ETSY_SCOUT: ScoutDefinition = {
  key: "etsy_scout",
  displayName: "Etsy Scout",
  ventureTypeKey: VENTURE_TYPE_KEYS.ETSY,
  description:
    "Discovers Etsy printable, craft, and digital download opportunities.",
  autonomous: false,
  defaultStatus: SCOUT_STATUSES.IDLE,
};

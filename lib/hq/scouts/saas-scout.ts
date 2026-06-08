import { SCOUT_STATUSES, VENTURE_TYPE_KEYS } from "../constants";
import type { ScoutDefinition } from "./types";

export const SAAS_SCOUT: ScoutDefinition = {
  key: "saas_scout",
  displayName: "SaaS Scout",
  ventureTypeKey: VENTURE_TYPE_KEYS.SAAS,
  description:
    "Discovers micro-SaaS and tool-based software venture opportunities.",
  autonomous: false,
  defaultStatus: SCOUT_STATUSES.IDLE,
};

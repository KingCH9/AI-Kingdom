import { SCOUT_STATUSES, VENTURE_TYPE_KEYS } from "../constants";
import type { ScoutDefinition } from "./types";

export const CONTENT_SCOUT: ScoutDefinition = {
  key: "content_scout",
  displayName: "Content Scout",
  ventureTypeKey: VENTURE_TYPE_KEYS.CONTENT,
  description:
    "Discovers content-led ventures — blogs, newsletters, and media properties.",
  autonomous: false,
  defaultStatus: SCOUT_STATUSES.IDLE,
};

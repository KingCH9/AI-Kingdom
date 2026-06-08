import { SCOUT_STATUSES, type ScoutStatus, type VentureTypeKey } from "../constants";

export type ScoutDefinition = {
  key: string;
  displayName: string;
  ventureTypeKey: VentureTypeKey;
  description: string;
  /** Registry-only in Phase 2A — no autonomous execution */
  autonomous: false;
  defaultStatus: ScoutStatus;
};

export type ScoutSnapshot = ScoutDefinition & {
  status: ScoutStatus;
  missions: number;
  opportunitiesDiscovered: number;
};

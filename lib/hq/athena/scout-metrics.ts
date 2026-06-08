import { MISSION_STATUSES } from "../constants";
import { scoutCategory } from "../scouts/opportunity-generator";
import type { ScoutDefinition } from "../scouts/types";
import {
  missionBelongsToScoutForAnalytics,
  opportunityBelongsToScoutForAnalytics,
  scoutKeyFromCategory,
} from "./scout-attribution";

export type ScoutRawMission = {
  id: number;
  status: string;
  opportunityId: number | null;
  ventureTypeKey: string | null;
  revenueGbp: number;
};

export type ScoutRawOpportunity = {
  id: number;
  category: string | null;
  status: string;
};

const APPROVED_OPPORTUNITY_STATUSES = new Set([
  "validated",
  "launch_ready",
  "sourcing",
  "building",
  "launched",
  "scaling",
  "profitable",
]);

const LAUNCHED_MISSION_STATUSES = new Set([
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

const APPROVED_MISSION_STATUSES = new Set([
  MISSION_STATUSES.APPROVED,
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
  MISSION_STATUSES.PROFITABLE,
]);

export type ScoutMetrics = {
  scoutKey: string;
  name: string;
  ventureTypeKey: string;
  opportunitiesFound: number;
  opportunitiesApproved: number;
  missionsCreated: number;
  missionsLaunched: number;
  revenueGenerated: number;
  successRate: number;
};

export { scoutKeyFromCategory } from "./scout-attribution";

export function opportunityBelongsToScout(
  opportunity: ScoutRawOpportunity,
  scout: ScoutDefinition,
  missionForOpp: ScoutRawMission | undefined
): boolean {
  return opportunityBelongsToScoutForAnalytics(
    opportunity,
    scout,
    missionForOpp
  );
}

export function missionBelongsToScout(
  mission: ScoutRawMission,
  scout: ScoutDefinition,
  opportunity: ScoutRawOpportunity | undefined
): boolean {
  return missionBelongsToScoutForAnalytics(mission, scout, opportunity);
}

/** Compute scout performance metrics from raw HQ data — no persistence. */
export function computeScoutMetrics(
  scout: ScoutDefinition,
  opportunities: ScoutRawOpportunity[],
  missions: ScoutRawMission[]
): ScoutMetrics {
  const missionByOppId = new Map(
    missions
      .filter((m) => m.opportunityId != null)
      .map((m) => [m.opportunityId!, m])
  );

  const scoutOpportunities = opportunities.filter((opp) =>
    opportunityBelongsToScout(opp, scout, missionByOppId.get(opp.id))
  );

  const scoutMissions = missions.filter((m) => {
    const opp = m.opportunityId
      ? opportunities.find((o) => o.id === m.opportunityId)
      : undefined;
    return missionBelongsToScout(m, scout, opp);
  });

  const opportunitiesApproved = scoutOpportunities.filter((o) =>
    APPROVED_OPPORTUNITY_STATUSES.has(o.status)
  ).length;

  const missionsCreated = scoutMissions.length;
  const missionsLaunched = scoutMissions.filter((m) =>
    LAUNCHED_MISSION_STATUSES.has(m.status as typeof MISSION_STATUSES.LAUNCHING)
  ).length;

  const revenueGenerated = Math.round(
    scoutMissions.reduce((sum, m) => sum + m.revenueGbp, 0) * 100
  ) / 100;

  const profitable = scoutMissions.filter(
    (m) => m.status === MISSION_STATUSES.PROFITABLE
  ).length;
  const killed = scoutMissions.filter(
    (m) => m.status === MISSION_STATUSES.KILLED
  ).length;
  const terminal = profitable + killed;
  const successRate =
    terminal > 0 ? Math.round((profitable / terminal) * 1000) / 10 : 0;

  return {
    scoutKey: scout.key,
    name: scout.displayName,
    ventureTypeKey: scout.ventureTypeKey,
    opportunitiesFound: scoutOpportunities.length,
    opportunitiesApproved,
    missionsCreated,
    missionsLaunched,
    revenueGenerated,
    successRate,
  };
}

export function countApprovedMissions(missions: ScoutRawMission[]): number {
  return missions.filter((m) =>
    APPROVED_MISSION_STATUSES.has(m.status as typeof MISSION_STATUSES.APPROVED)
  ).length;
}

export { scoutCategory };

import { MISSION_STATUSES } from "../constants";
import {
  computeMissionProfitability,
  type MissionProfitability,
} from "../mercury/profitability-engine";

export type VentureTraffic = {
  pageViews: number;
  orders: number;
  conversionRate: number;
};

export type VentureRecord = MissionProfitability & {
  missionId: number;
  title: string;
  status: string;
  departmentKey: string;
  departmentName: string;
  ventureTypeName: string | null;
  targetRoi: number | null;
  revenueMonthlyGbp: number;
  buildDays: number | null;
  launchDays: number | null;
  traffic: VentureTraffic;
  growthScore: number;
  raeScore: number;
  daysSinceUpdate: number;
  flagged: boolean;
  flagReason: string | null;
  atlasAction: "scale" | "maintain" | "kill" | "review";
};

export type RawVentureInput = {
  missionId: number;
  title: string;
  status: string;
  storeId: number | null;
  ventureTypeKey: string | null;
  ventureTypeName: string | null;
  departmentKey: string;
  departmentName: string;
  targetRoi: number | null;
  revenueGbp: number;
  revenueMonthlyGbp: number;
  costGbp: number;
  createdAt: Date;
  updatedAt: Date;
  buildDays: number | null;
  launchDays: number | null;
  pageViews: number;
  orders: number;
};

function daysBetween(start: Date, end: Date): number {
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function computeConversionRate(pageViews: number, orders: number): number {
  if (pageViews <= 0) return 0;
  return Math.round((orders / pageViews) * 1000) / 10;
}

/** Growth score: revenue velocity × conversion — advisory only. */
export function computeVentureGrowthScore(input: {
  revenueMonthlyGbp: number;
  revenueGbp: number;
  daysActive: number;
  conversionRate: number;
  status: string;
}): number {
  const velocity =
    input.revenueMonthlyGbp > 0
      ? input.revenueMonthlyGbp
      : input.daysActive > 0
        ? input.revenueGbp / input.daysActive
        : 0;

  let statusBoost = 0;
  if (input.status === MISSION_STATUSES.PROFITABLE) statusBoost = 30;
  else if (input.status === MISSION_STATUSES.GROWING) statusBoost = 20;
  else if (input.status === MISSION_STATUSES.LAUNCHING) statusBoost = 10;

  const raw =
    Math.min(velocity, 50) * 0.5 +
    Math.min(input.conversionRate, 10) * 3 +
    statusBoost;

  return Math.round(Math.min(Math.max(raw, 0), 100));
}

function deriveAtlasAction(
  profitability: MissionProfitability,
  growthScore: number
): VentureRecord["atlasAction"] {
  if (
    profitability.status === MISSION_STATUSES.KILLED ||
    (profitability.roi != null && profitability.roi < -20)
  ) {
    return "kill";
  }
  if (
    profitability.profitabilityClass === "profitable" ||
    (profitability.roi != null && profitability.roi >= 50)
  ) {
    return "scale";
  }
  if (growthScore >= 40 || profitability.profitabilityClass === "break_even") {
    return "maintain";
  }
  return "review";
}

function deriveFlag(
  input: RawVentureInput,
  profitability: MissionProfitability,
  now: Date
): { flagged: boolean; flagReason: string | null } {
  if (input.status === MISSION_STATUSES.KILLED) {
    return { flagged: false, flagReason: null };
  }

  const daysSinceUpdate = daysBetween(input.updatedAt, now);
  if (daysSinceUpdate < 7) {
    return { flagged: false, flagReason: null };
  }

  const roiBelowTarget =
    input.targetRoi != null &&
    profitability.roi != null &&
    profitability.roi < input.targetRoi;

  if (roiBelowTarget) {
    return {
      flagged: true,
      flagReason: `ROI ${profitability.roi}% below target ${input.targetRoi}% for ${daysSinceUpdate}+ days`,
    };
  }

  if (profitability.roi != null && profitability.roi < 0 && profitability.costGbp > 0) {
    return {
      flagged: true,
      flagReason: `Negative ROI for ${daysSinceUpdate}+ days — Atlas review advised`,
    };
  }

  const liveWithoutRevenue =
    (input.status === MISSION_STATUSES.LAUNCHING ||
      input.status === MISSION_STATUSES.GROWING) &&
    profitability.revenueGbp === 0;

  if (liveWithoutRevenue) {
    return {
      flagged: true,
      flagReason: `No revenue after ${daysSinceUpdate}+ days live — review recommended`,
    };
  }

  return { flagged: false, flagReason: null };
}

export function buildVentureRecord(
  input: RawVentureInput,
  now: Date = new Date()
): VentureRecord {
  const profitability = computeMissionProfitability({
    missionId: input.missionId,
    title: input.title,
    status: input.status,
    storeId: input.storeId,
    ventureTypeKey: input.ventureTypeKey,
    revenueGbp: input.revenueGbp,
    costGbp: input.costGbp,
  });

  const conversionRate = computeConversionRate(input.pageViews, input.orders);
  const daysActive = daysBetween(input.createdAt, now);
  const growthScore = computeVentureGrowthScore({
    revenueMonthlyGbp: input.revenueMonthlyGbp,
    revenueGbp: input.revenueGbp,
    daysActive,
    conversionRate,
    status: input.status,
  });

  const roiComponent = profitability.roi ?? 0;
  const raeScore = Math.round(
    Math.min(
      profitability.revenueGbp * 0.3 +
        Math.max(roiComponent, 0) * 0.3 +
        growthScore * 0.4,
      100
    )
  );

  const { flagged, flagReason } = deriveFlag(input, profitability, now);
  const daysSinceUpdate = daysBetween(input.updatedAt, now);

  return {
    ...profitability,
    departmentKey: input.departmentKey,
    departmentName: input.departmentName,
    ventureTypeName: input.ventureTypeName,
    targetRoi: input.targetRoi,
    revenueMonthlyGbp: input.revenueMonthlyGbp,
    buildDays: input.buildDays,
    launchDays: input.launchDays,
    traffic: {
      pageViews: input.pageViews,
      orders: input.orders,
      conversionRate,
    },
    growthScore,
    raeScore,
    daysSinceUpdate,
    flagged,
    flagReason,
    atlasAction: deriveAtlasAction(profitability, growthScore),
  };
}

export function rankVenturesByRevenue(ventures: VentureRecord[]): VentureRecord[] {
  return [...ventures].sort(
    (a, b) => b.revenueGbp - a.revenueGbp || b.raeScore - a.raeScore
  );
}

export function rankVenturesByRoi(ventures: VentureRecord[]): VentureRecord[] {
  return [...ventures]
    .filter((v) => v.roi != null)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0) || b.revenueGbp - a.revenueGbp);
}

export function getFlaggedVentures(ventures: VentureRecord[]): VentureRecord[] {
  return ventures
    .filter((v) => v.flagged)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

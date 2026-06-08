import {
  MISSION_STATUSES,
  type MissionStatus,
} from "../constants";

export type AtlasRecommendation =
  | "fund"
  | "accelerate"
  | "review"
  | "hold"
  | "kill";

export type AtlasMissionInput = {
  id: number;
  title: string;
  status: string;
  ownerPersona: string;
  departmentKey: string;
  ventureTypeKey: string | null;
  opportunityScore: number;
  revenueGbp: number;
  actualCostGbp: number;
  targetRoi: number | null;
  createdAt: Date;
  departmentActiveMissions: number;
};

export type MissionPriorityResult = {
  missionId: number;
  title: string;
  status: string;
  priorityScore: number;
  recommendation: AtlasRecommendation;
  factors: {
    opportunityScore: number;
    statusWeight: number;
    revenueBonus: number;
    roiBonus: number;
    costPenalty: number;
    ageDays: number;
    workloadAdjustment: number;
  };
};

const STATUS_WEIGHTS: Record<MissionStatus, number> = {
  [MISSION_STATUSES.RESEARCHING]: 35,
  [MISSION_STATUSES.VALIDATING]: 50,
  [MISSION_STATUSES.APPROVED]: 65,
  [MISSION_STATUSES.BUILDING]: 60,
  [MISSION_STATUSES.LAUNCHING]: 70,
  [MISSION_STATUSES.GROWING]: 75,
  [MISSION_STATUSES.PROFITABLE]: 85,
  [MISSION_STATUSES.KILLED]: 0,
  [MISSION_STATUSES.BLOCKED]: 15,
};

function statusWeight(status: string): number {
  return STATUS_WEIGHTS[status as MissionStatus] ?? 25;
}

function ageInDays(createdAt: Date): number {
  const ms = Date.now() - createdAt.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function computeRoiBonus(input: AtlasMissionInput): number {
  if (input.targetRoi != null && input.targetRoi > 0) {
    return Math.min(input.targetRoi * 8, 20);
  }
  if (input.actualCostGbp > 0 && input.revenueGbp > 0) {
    const roi = ((input.revenueGbp - input.actualCostGbp) / input.actualCostGbp) * 100;
    return Math.min(Math.max(roi * 0.08, 0), 20);
  }
  return 0;
}

function computeCostPenalty(input: AtlasMissionInput): number {
  if (input.actualCostGbp <= 0) return 0;
  if (input.revenueGbp === 0 && input.actualCostGbp > 50) return 15;
  if (input.revenueGbp > 0 && input.actualCostGbp > input.revenueGbp * 2) return 10;
  return Math.min(input.actualCostGbp / 20, 8);
}

function workloadAdjustment(activeMissions: number): number {
  if (activeMissions >= 6) return -8;
  if (activeMissions >= 4) return -4;
  if (activeMissions <= 1) return 4;
  return 0;
}

/** Deterministic Atlas recommendation from priority score and mission state. */
export function deriveRecommendation(input: {
  status: string;
  opportunityScore: number;
  priorityScore: number;
  revenueGbp: number;
  actualCostGbp: number;
  ageDays: number;
}): AtlasRecommendation {
  if (input.status === MISSION_STATUSES.KILLED) return "kill";
  if (input.status === MISSION_STATUSES.BLOCKED) return "hold";

  if (
    input.opportunityScore < 45 &&
    (input.status === MISSION_STATUSES.RESEARCHING ||
      input.status === MISSION_STATUSES.VALIDATING)
  ) {
    return "kill";
  }

  if (
    input.actualCostGbp > 100 &&
    input.revenueGbp === 0 &&
    input.ageDays > 30 &&
    input.status !== MISSION_STATUSES.PROFITABLE
  ) {
    return "kill";
  }

  if (
    input.opportunityScore >= 75 &&
    (input.status === MISSION_STATUSES.APPROVED ||
      input.status === MISSION_STATUSES.VALIDATING)
  ) {
    return "fund";
  }

  if (
    (input.status === MISSION_STATUSES.LAUNCHING ||
      input.status === MISSION_STATUSES.GROWING ||
      input.status === MISSION_STATUSES.BUILDING) &&
    input.priorityScore >= 60
  ) {
    return "accelerate";
  }

  if (
    input.status === MISSION_STATUSES.VALIDATING ||
    input.status === MISSION_STATUSES.APPROVED ||
    input.status === MISSION_STATUSES.RESEARCHING
  ) {
    if (input.opportunityScore >= 55 && input.opportunityScore < 75) {
      return "review";
    }
  }

  if (input.priorityScore < 50 || input.status === MISSION_STATUSES.BLOCKED) {
    return "hold";
  }

  if (input.priorityScore >= 70) return "accelerate";
  if (input.priorityScore >= 55) return "review";

  return "hold";
}

/** Compute Atlas mission priority score — advisory only, no side effects. */
export function computeMissionPriority(
  input: AtlasMissionInput
): MissionPriorityResult {
  const opp = Math.min(Math.max(input.opportunityScore, 0), 100);
  const sw = statusWeight(input.status);
  const revenueBonus = Math.min(input.revenueGbp / 5, 20);
  const roiBonus = computeRoiBonus(input);
  const costPenalty = computeCostPenalty(input);
  const ageDays = ageInDays(input.createdAt);
  const agePenalty = ageDays > 14 ? Math.min((ageDays - 14) * 0.3, 10) : 0;
  const wlAdj = workloadAdjustment(input.departmentActiveMissions);

  const raw =
    opp * 0.35 +
    sw * 0.2 +
    revenueBonus +
    roiBonus -
    costPenalty -
    agePenalty +
    wlAdj;

  const priorityScore = Math.round(Math.min(Math.max(raw, 0), 100));

  const recommendation = deriveRecommendation({
    status: input.status,
    opportunityScore: opp,
    priorityScore,
    revenueGbp: input.revenueGbp,
    actualCostGbp: input.actualCostGbp,
    ageDays,
  });

  return {
    missionId: input.id,
    title: input.title,
    status: input.status,
    priorityScore,
    recommendation,
    factors: {
      opportunityScore: opp,
      statusWeight: sw,
      revenueBonus: Math.round(revenueBonus * 10) / 10,
      roiBonus: Math.round(roiBonus * 10) / 10,
      costPenalty: Math.round(costPenalty * 10) / 10,
      ageDays,
      workloadAdjustment: wlAdj,
    },
  };
}

export function computeAllMissionPriorities(
  missions: AtlasMissionInput[]
): MissionPriorityResult[] {
  return missions
    .map(computeMissionPriority)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

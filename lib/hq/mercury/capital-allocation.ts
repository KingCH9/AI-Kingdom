import { MISSION_STATUSES } from "../constants";
import type { MissionProfitability } from "./profitability-engine";

export type CapitalRecommendationAction = "fund" | "maintain" | "review" | "reduce";

export type CapitalRecommendation = {
  missionId: number;
  title: string;
  status: string;
  action: CapitalRecommendationAction;
  roi: number | null;
  revenueGbp: number;
  costGbp: number;
  netProfitGbp: number;
  growthScoreProxy: number;
  buildScoreProxy: number;
  rationale: string;
};

function growthScoreProxy(status: string): number {
  switch (status) {
    case MISSION_STATUSES.PROFITABLE:
      return 90;
    case MISSION_STATUSES.GROWING:
      return 70;
    case MISSION_STATUSES.LAUNCHING:
      return 50;
    case MISSION_STATUSES.BUILDING:
      return 35;
    default:
      return 10;
  }
}

function buildScoreProxy(mission: MissionProfitability): number {
  let score = 0;
  if (mission.storeId != null) score += 40;
  if (mission.costGbp > 0) score += 20;
  if (mission.revenueGbp > 0) score += 20;
  if (
    mission.status === MISSION_STATUSES.LAUNCHING ||
    mission.status === MISSION_STATUSES.GROWING ||
    mission.status === MISSION_STATUSES.PROFITABLE
  ) {
    score += 20;
  }
  return Math.min(score, 100);
}

/** Advisory capital allocation — no writes, no enforcement. */
export function generateCapitalRecommendations(
  missions: MissionProfitability[]
): CapitalRecommendation[] {
  return missions
    .map((mission) => {
      const growth = growthScoreProxy(mission.status);
      const build = buildScoreProxy(mission);
      const roi = mission.roi ?? 0;

      let action: CapitalRecommendationAction = "review";
      let rationale = "Insufficient data — manual review advised.";

      if (mission.status === MISSION_STATUSES.KILLED || roi < -20) {
        action = "reduce";
        rationale = "Negative ROI or killed status — reduce capital exposure.";
      } else if (
        mission.profitabilityClass === "profitable" ||
        (roi >= 50 && mission.revenueGbp > 0)
      ) {
        action = "fund";
        rationale = "Strong ROI and revenue — candidate for additional capital.";
      } else if (
        mission.profitabilityClass === "break_even" ||
        (roi >= 0 && roi < 50 && growth >= 50)
      ) {
        action = "maintain";
        rationale = "Break-even or moderate ROI with growth momentum — maintain.";
      } else if (mission.costGbp > mission.revenueGbp && mission.costGbp > 0) {
        action = "reduce";
        rationale = "Costs exceed revenue — consider reducing spend.";
      } else if (build >= 60 && growth >= 40) {
        action = "maintain";
        rationale = "Solid build and growth signals — maintain current allocation.";
      } else {
        action = "review";
        rationale = "Mixed signals — Atlas/Mercury review recommended.";
      }

      return {
        missionId: mission.missionId,
        title: mission.title,
        status: mission.status,
        action,
        roi: mission.roi,
        revenueGbp: mission.revenueGbp,
        costGbp: mission.costGbp,
        netProfitGbp: mission.netProfitGbp,
        growthScoreProxy: growth,
        buildScoreProxy: build,
        rationale,
      };
    })
    .sort((a, b) => {
      const order: Record<CapitalRecommendationAction, number> = {
        fund: 0,
        maintain: 1,
        review: 2,
        reduce: 3,
      };
      return order[a.action] - order[b.action] || (b.roi ?? 0) - (a.roi ?? 0);
    });
}

export function countRecommendationsByAction(
  recommendations: CapitalRecommendation[]
): Record<CapitalRecommendationAction, number> {
  return recommendations.reduce(
    (acc, rec) => {
      acc[rec.action] += 1;
      return acc;
    },
    { fund: 0, maintain: 0, review: 0, reduce: 0 }
  );
}

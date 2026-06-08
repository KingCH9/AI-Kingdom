import { getRaeSnapshot } from "../revenue/rae-dashboard";
import { getCaeSnapshot } from "../capital/capital-dashboard";
import { runScalingEngine } from "./scaling-engine";
import {
  countScalingByAction,
  rankByScalingScore,
  type VentureScalingRecommendation,
} from "./scaling-recommendations";
import type { ScalingPriorityQueue, VentureGrowthLevers } from "./growth-levers";
import type { ScalingEngineInsight } from "./scaling-engine";

export type VseSnapshot = {
  generatedAt: string;
  periodMonth: string;
  summary: {
    totalVentures: number;
    activeVentures: number;
    portfolioScalingScore: number;
    scaleNowCount: number;
    scaleCautiouslyCount: number;
    optimizeFirstCount: number;
    holdCount: number;
    pauseCount: number;
    monthlyRevenueGbp: number;
    topScalingVenture: VentureScalingRecommendation | null;
    topRecommendation: VentureScalingRecommendation | null;
  };
  recommendations: VentureScalingRecommendation[];
  priorityQueue: ScalingPriorityQueue;
  growthLevers: VentureGrowthLevers[];
  engineInsights: ScalingEngineInsight[];
};

/** Full VSE snapshot — read-only, advisory only. */
export async function getVseSnapshot(): Promise<VseSnapshot> {
  const [rae, cae] = await Promise.all([getRaeSnapshot(), getCaeSnapshot()]);

  const engine = runScalingEngine({
    ventures: rae.ventures,
    capitalRecs: cae.recommendations,
  });

  const counts = countScalingByAction(engine.recommendations);
  const ranked = rankByScalingScore(engine.recommendations);
  const active = rae.ventures.filter((v) => v.status !== "killed");

  return {
    generatedAt: new Date().toISOString(),
    periodMonth: rae.periodMonth,
    summary: {
      totalVentures: rae.ventures.length,
      activeVentures: active.length,
      portfolioScalingScore: engine.portfolioScalingScore,
      scaleNowCount: counts.scale_now,
      scaleCautiouslyCount: counts.scale_cautiously,
      optimizeFirstCount: counts.optimize_first,
      holdCount: counts.hold,
      pauseCount: counts.pause,
      monthlyRevenueGbp: rae.summary.monthlyRevenueGbp,
      topScalingVenture:
        ranked.find((r) => r.recommendation === "scale_now") ??
        ranked[0] ??
        null,
      topRecommendation: ranked[0] ?? null,
    },
    recommendations: engine.recommendations,
    priorityQueue: engine.priorityQueue,
    growthLevers: engine.growthLevers,
    engineInsights: engine.engineInsights,
  };
}

/** Compact summary for HQ widget integration. */
export async function getVseSummary() {
  const snapshot = await getVseSnapshot();
  return {
    periodMonth: snapshot.periodMonth,
    portfolioScalingScore: snapshot.summary.portfolioScalingScore,
    scaleNowCount: snapshot.summary.scaleNowCount,
    scaleCautiouslyCount: snapshot.summary.scaleCautiouslyCount,
    topRecommendation: snapshot.summary.topRecommendation
      ? {
          missionId: snapshot.summary.topRecommendation.missionId,
          title: snapshot.summary.topRecommendation.title,
          scalingScore: snapshot.summary.topRecommendation.scalingScore,
          recommendation: snapshot.summary.topRecommendation.recommendation,
        }
      : null,
    topScalingVenture: snapshot.summary.topScalingVenture
      ? {
          missionId: snapshot.summary.topScalingVenture.missionId,
          title: snapshot.summary.topScalingVenture.title,
          scalingScore: snapshot.summary.topScalingVenture.scalingScore,
        }
      : null,
  };
}

/** API payload for GET /api/hq/ventures */
export async function getVsePayload() {
  const snapshot = await getVseSnapshot();
  return {
    summary: snapshot.summary,
    recommendations: snapshot.recommendations,
    priorityQueue: snapshot.priorityQueue,
    growthLevers: snapshot.growthLevers,
    engineInsights: snapshot.engineInsights,
    generatedAt: snapshot.generatedAt,
  };
}

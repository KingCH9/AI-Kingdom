import type { VentureRecord } from "../revenue/venture-metrics";
import type { VentureScalingRecommendation } from "./scaling-recommendations";

export type GrowthLever =
  | "traffic_acquisition"
  | "conversion_optimization"
  | "paid_ads"
  | "seo_content"
  | "social_growth"
  | "email_retention";

export type GrowthLeverInsight = {
  lever: GrowthLever;
  label: string;
  priority: "high" | "medium" | "low";
  impactScore: number;
  rationale: string;
};

export type VentureGrowthLevers = {
  missionId: number;
  title: string;
  levers: GrowthLeverInsight[];
  primaryLever: GrowthLever | null;
};

const LEVER_LABELS: Record<GrowthLever, string> = {
  traffic_acquisition: "Traffic Acquisition",
  conversion_optimization: "Conversion Optimization",
  paid_ads: "Paid Ads Scale",
  seo_content: "SEO & Content",
  social_growth: "Social Growth",
  email_retention: "Email & Retention",
};

function lever(
  key: GrowthLever,
  priority: GrowthLeverInsight["priority"],
  impactScore: number,
  rationale: string
): GrowthLeverInsight {
  return {
    lever: key,
    label: LEVER_LABELS[key],
    priority,
    impactScore,
    rationale,
  };
}

/** Advisory growth levers per venture — no automatic campaigns. */
export function deriveGrowthLevers(venture: VentureRecord): GrowthLeverInsight[] {
  const levers: GrowthLeverInsight[] = [];
  const { pageViews, orders, conversionRate } = venture.traffic;

  if (pageViews < 50 && venture.revenueGbp === 0) {
    levers.push(
      lever(
        "traffic_acquisition",
        "high",
        85,
        "Low traffic — prioritize awareness and top-of-funnel acquisition."
      )
    );
  } else if (pageViews >= 50 && conversionRate < 2) {
    levers.push(
      lever(
        "conversion_optimization",
        "high",
        80,
        `Traffic present (${pageViews} views) but conversion ${conversionRate}% — optimize product page and checkout.`
      )
    );
  }

  if (
    venture.growthScore >= 50 &&
    venture.revenueMonthlyGbp > 0 &&
    conversionRate >= 2
  ) {
    levers.push(
      lever(
        "paid_ads",
        "high",
        75,
        "Positive unit economics — test paid ad scale with small budget increments."
      )
    );
  }

  if (pageViews >= 20 && pageViews < 200) {
    levers.push(
      lever(
        "seo_content",
        "medium",
        60,
        "Build organic traffic through SEO landing pages and content marketing."
      )
    );
  }

  if (venture.status === "growing" || venture.status === "launching") {
    levers.push(
      lever(
        "social_growth",
        "medium",
        55,
        "Social channels can amplify launch momentum and drive referral traffic."
      )
    );
  }

  if (orders >= 1) {
    levers.push(
      lever(
        "email_retention",
        "medium",
        50,
        "Existing buyers — email flows can lift repeat purchase rate."
      )
    );
  }

  if (levers.length === 0) {
    levers.push(
      lever(
        "traffic_acquisition",
        "low",
        30,
        "Insufficient data — gather baseline traffic before scaling."
      )
    );
  }

  return levers.sort((a, b) => b.impactScore - a.impactScore).slice(0, 4);
}

export function buildVentureGrowthLevers(
  venture: VentureRecord
): VentureGrowthLevers {
  const levers = deriveGrowthLevers(venture);
  return {
    missionId: venture.missionId,
    title: venture.title,
    levers,
    primaryLever: levers[0]?.lever ?? null,
  };
}

export function buildGrowthLeversForRecommendations(
  ventures: VentureRecord[],
  recommendations: VentureScalingRecommendation[]
): VentureGrowthLevers[] {
  const ventureMap = new Map(ventures.map((v) => [v.missionId, v]));
  return recommendations
    .filter(
      (r) =>
        r.recommendation === "scale_now" ||
        r.recommendation === "scale_cautiously" ||
        r.recommendation === "optimize_first"
    )
    .slice(0, 10)
    .map((rec) => {
      const venture = ventureMap.get(rec.missionId);
      if (!venture) {
        return {
          missionId: rec.missionId,
          title: rec.title,
          levers: [],
          primaryLever: null,
        };
      }
      return buildVentureGrowthLevers(venture);
    });
}

export type ScalingPriorityQueue = {
  scaleNow: VentureScalingRecommendation[];
  scaleCautiously: VentureScalingRecommendation[];
  optimizeFirst: VentureScalingRecommendation[];
  hold: VentureScalingRecommendation[];
  pause: VentureScalingRecommendation[];
};

export function buildScalingPriorityQueue(
  recommendations: VentureScalingRecommendation[]
): ScalingPriorityQueue {
  return {
    scaleNow: recommendations
      .filter((r) => r.recommendation === "scale_now")
      .slice(0, 5),
    scaleCautiously: recommendations
      .filter((r) => r.recommendation === "scale_cautiously")
      .slice(0, 5),
    optimizeFirst: recommendations
      .filter((r) => r.recommendation === "optimize_first")
      .slice(0, 5),
    hold: recommendations.filter((r) => r.recommendation === "hold").slice(0, 5),
    pause: recommendations.filter((r) => r.recommendation === "pause").slice(0, 5),
  };
}

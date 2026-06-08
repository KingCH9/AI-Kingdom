import type { AtlasRecommendation, MissionPriorityResult } from "./priority-engine";

export type AtlasRecommendations = {
  fund: MissionPriorityResult[];
  accelerate: MissionPriorityResult[];
  hold: MissionPriorityResult[];
  kill: MissionPriorityResult[];
  review: MissionPriorityResult[];
};

/** Group prioritized missions into executive recommendation buckets. */
export function buildAtlasRecommendations(
  priorities: MissionPriorityResult[]
): AtlasRecommendations {
  const buckets: AtlasRecommendations = {
    fund: [],
    accelerate: [],
    hold: [],
    kill: [],
    review: [],
  };

  for (const mission of priorities) {
    buckets[mission.recommendation].push(mission);
  }

  for (const key of Object.keys(buckets) as (keyof AtlasRecommendations)[]) {
    buckets[key].sort((a, b) => b.priorityScore - a.priorityScore);
  }

  return buckets;
}

export function recommendationSummary(
  recommendations: AtlasRecommendations
): Record<AtlasRecommendation, number> {
  return {
    fund: recommendations.fund.length,
    accelerate: recommendations.accelerate.length,
    hold: recommendations.hold.length,
    kill: recommendations.kill.length,
    review: recommendations.review.length,
  };
}

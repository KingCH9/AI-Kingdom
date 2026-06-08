import { MISSION_STATUSES } from "../constants";
import {
  isNovaGrowthMission,
  type NovaRawMission,
} from "./growth-engine";
import { computeGrowthScore } from "./agent-xp";

export type CampaignPerformance = {
  campaignKey: string;
  campaignName: string;
  missions: number;
  launching: number;
  growing: number;
  profitable: number;
  revenueGbp: number;
  growthScore: number;
};

function campaignLabel(mission: NovaRawMission): {
  key: string;
  name: string;
} {
  if (mission.templateKey && mission.templateKey.length > 0) {
    return {
      key: mission.templateKey,
      name: mission.templateKey.replace(/_/g, " "),
    };
  }
  if (mission.ventureTypeKey) {
    return {
      key: mission.ventureTypeKey,
      name: mission.ventureTypeKey,
    };
  }
  return { key: "unknown", name: "Unknown Campaign" };
}

/** Analyze campaign performance by venture template/type — read-only. */
export function analyzeCampaignPerformance(
  missions: NovaRawMission[]
): CampaignPerformance[] {
  const growthMissions = missions.filter(isNovaGrowthMission);
  const byCampaign = new Map<string, CampaignPerformance>();

  for (const mission of growthMissions) {
    const { key, name } = campaignLabel(mission);
    const row =
      byCampaign.get(key) ??
      ({
        campaignKey: key,
        campaignName: name,
        missions: 0,
        launching: 0,
        growing: 0,
        profitable: 0,
        revenueGbp: 0,
        growthScore: 0,
      } satisfies CampaignPerformance);

    row.missions += 1;
    if (mission.status === MISSION_STATUSES.LAUNCHING) row.launching += 1;
    if (mission.status === MISSION_STATUSES.GROWING) row.growing += 1;
    if (mission.status === MISSION_STATUSES.PROFITABLE) row.profitable += 1;
    row.revenueGbp += mission.revenueGbp;

    byCampaign.set(key, row);
  }

  return [...byCampaign.values()]
    .map((row) => {
      const growthScore = computeGrowthScore({
        agentKey: "campaign",
        name: row.campaignName,
        launchedMissions: row.launching,
        growingMissions: row.growing,
        profitableMissions: row.profitable,
        contentMissions: 0,
        trackedMissions: row.missions,
        revenueGenerated: row.revenueGbp,
        ventureDiversity: 0,
      });
      return {
        ...row,
        revenueGbp: Math.round(row.revenueGbp * 100) / 100,
        growthScore,
      };
    })
    .sort((a, b) => b.growthScore - a.growthScore);
}

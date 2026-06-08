import type { AtlasMissionInput } from "./priority-engine";
import type { MissionPriorityResult } from "./priority-engine";

export type PortfolioRankedMission = {
  missionId: number;
  title: string;
  status: string;
  ventureTypeKey: string | null;
  value: number;
  label: string;
};

export type PortfolioRanking = {
  topOpportunities: PortfolioRankedMission[];
  topRevenueProducers: PortfolioRankedMission[];
  highestRoi: PortfolioRankedMission[];
  highestPotential: PortfolioRankedMission[];
  lowestPerforming: PortfolioRankedMission[];
};

function toRanked(
  mission: AtlasMissionInput,
  value: number,
  label: string
): PortfolioRankedMission {
  return {
    missionId: mission.id,
    title: mission.title,
    status: mission.status,
    ventureTypeKey: mission.ventureTypeKey,
    value: Math.round(value * 10) / 10,
    label,
  };
}

function computeMissionRoi(m: AtlasMissionInput): number {
  if (m.targetRoi != null) return m.targetRoi;
  if (m.actualCostGbp <= 0) return 0;
  return ((m.revenueGbp - m.actualCostGbp) / m.actualCostGbp) * 100;
}

/** Rank missions across portfolio dimensions — deterministic, data-driven. */
export function buildPortfolioRanking(
  missions: AtlasMissionInput[],
  priorities: MissionPriorityResult[]
): PortfolioRanking {
  const priorityById = new Map(priorities.map((p) => [p.missionId, p]));
  const active = missions.filter((m) => m.status !== "killed");

  const topOpportunities = [...active]
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 5)
    .map((m) => toRanked(m, m.opportunityScore, "Opportunity score"));

  const topRevenueProducers = [...active]
    .filter((m) => m.revenueGbp > 0)
    .sort((a, b) => b.revenueGbp - a.revenueGbp)
    .slice(0, 5)
    .map((m) => toRanked(m, m.revenueGbp, "Revenue GBP"));

  const highestRoi = [...active]
    .map((m) => ({ m, roi: computeMissionRoi(m) }))
    .filter((row) => row.roi > 0)
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5)
    .map(({ m, roi }) => toRanked(m, roi, "ROI %"));

  const highestPotential = [...active]
    .sort(
      (a, b) =>
        (priorityById.get(b.id)?.priorityScore ?? 0) -
        (priorityById.get(a.id)?.priorityScore ?? 0)
    )
    .slice(0, 5)
    .map((m) =>
      toRanked(
        m,
        priorityById.get(m.id)?.priorityScore ?? 0,
        "Atlas priority score"
      )
    );

  const lowestPerforming = [...active]
    .sort(
      (a, b) =>
        (priorityById.get(a.id)?.priorityScore ?? 0) -
        (priorityById.get(b.id)?.priorityScore ?? 0)
    )
    .slice(0, 5)
    .map((m) =>
      toRanked(
        m,
        priorityById.get(m.id)?.priorityScore ?? 0,
        "Atlas priority score"
      )
    );

  return {
    topOpportunities,
    topRevenueProducers,
    highestRoi,
    highestPotential,
    lowestPerforming,
  };
}

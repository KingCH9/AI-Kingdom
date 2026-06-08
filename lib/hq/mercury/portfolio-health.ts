import type { MissionProfitability } from "./profitability-engine";
import { computeAverageRoi } from "./roi-analysis";

export type PortfolioHealth = {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  averageRoi: number | null;
  profitableMissions: number;
  unprofitableMissions: number;
  breakEvenMissions: number;
  unknownMissions: number;
  portfolioHealthScore: number;
  missionCount: number;
};

/** Portfolio health score 0–100 — advisory only. */
export function computePortfolioHealth(
  missions: MissionProfitability[]
): PortfolioHealth {
  const totalRevenue = Math.round(
    missions.reduce((sum, m) => sum + m.revenueGbp, 0) * 100
  ) / 100;
  const totalCosts = Math.round(
    missions.reduce((sum, m) => sum + m.costGbp, 0) * 100
  ) / 100;
  const netProfit = Math.round((totalRevenue - totalCosts) * 100) / 100;

  const profitableMissions = missions.filter(
    (m) => m.profitabilityClass === "profitable"
  ).length;
  const unprofitableMissions = missions.filter(
    (m) => m.profitabilityClass === "unprofitable"
  ).length;
  const breakEvenMissions = missions.filter(
    (m) => m.profitabilityClass === "break_even"
  ).length;
  const unknownMissions = missions.filter(
    (m) => m.profitabilityClass === "unknown"
  ).length;

  const averageRoi = computeAverageRoi(missions);
  const classified = profitableMissions + unprofitableMissions + breakEvenMissions;
  const profitRatio =
    classified > 0 ? (profitableMissions / classified) * 100 : 0;
  const marginRatio =
    totalRevenue > 0
      ? Math.min((netProfit / totalRevenue) * 100, 100)
      : 0;
  const roiComponent =
    averageRoi != null ? Math.min(Math.max(averageRoi, 0), 100) : 0;

  const portfolioHealthScore = Math.round(
    Math.min(
      profitRatio * 0.4 +
        Math.max(marginRatio, 0) * 0.3 +
        roiComponent * 0.3,
      100
    )
  );

  return {
    totalRevenue,
    totalCosts,
    netProfit,
    averageRoi,
    profitableMissions,
    unprofitableMissions,
    breakEvenMissions,
    unknownMissions,
    portfolioHealthScore,
    missionCount: missions.length,
  };
}

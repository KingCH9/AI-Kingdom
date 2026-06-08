import type { MissionProfitability } from "./profitability-engine";

export function rankByProfit(
  missions: MissionProfitability[],
  limit = 10
): MissionProfitability[] {
  return [...missions]
    .sort((a, b) => b.netProfitGbp - a.netProfitGbp)
    .slice(0, limit);
}

export function rankByRoi(
  missions: MissionProfitability[],
  limit = 10
): MissionProfitability[] {
  return [...missions]
    .filter((m) => m.roi != null && m.costGbp > 0)
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
    .slice(0, limit);
}

export function computeAverageRoi(
  missions: MissionProfitability[]
): number | null {
  const withRoi = missions.filter((m) => m.roi != null && m.costGbp > 0);
  if (withRoi.length === 0) return null;
  const sum = withRoi.reduce((acc, m) => acc + (m.roi ?? 0), 0);
  return Math.round((sum / withRoi.length) * 10) / 10;
}

export function analyzeRoiDistribution(missions: MissionProfitability[]) {
  const positive = missions.filter((m) => m.roi != null && m.roi > 0).length;
  const negative = missions.filter((m) => m.roi != null && m.roi < 0).length;
  const unknown = missions.filter((m) => m.roi == null).length;

  return { positive, negative, unknown, total: missions.length };
}

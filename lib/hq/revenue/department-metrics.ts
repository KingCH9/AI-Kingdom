import { DEPARTMENT_KEYS } from "../constants";
import type { VentureRecord } from "./venture-metrics";

export type DepartmentRevenueRecord = {
  departmentKey: string;
  departmentName: string;
  totalRevenueGbp: number;
  monthlyRevenueGbp: number;
  netProfitGbp: number;
  averageRoi: number | null;
  activeMissions: number;
  totalMissions: number;
  flaggedVentures: number;
  topVenture: { missionId: number; title: string; revenueGbp: number } | null;
};

const DEPARTMENT_LABELS: Record<string, string> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: "CEO Office",
  [DEPARTMENT_KEYS.RESEARCH_LAB]: "Research Lab",
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: "Builder Workshop",
  [DEPARTMENT_KEYS.GROWTH]: "Growth",
  [DEPARTMENT_KEYS.FINANCE]: "Finance",
};

const TERMINAL_STATUSES = new Set(["killed"]);

export function buildDepartmentRevenueRecords(
  ventures: VentureRecord[]
): DepartmentRevenueRecord[] {
  return Object.entries(DEPARTMENT_LABELS).map(([departmentKey, departmentName]) => {
    const deptVentures = ventures.filter((v) => v.departmentKey === departmentKey);
    const active = deptVentures.filter((v) => !TERMINAL_STATUSES.has(v.status));

    const rois = deptVentures
      .map((v) => v.roi)
      .filter((r): r is number => r != null);

    const top =
      [...deptVentures].sort((a, b) => b.revenueGbp - a.revenueGbp)[0] ?? null;

    return {
      departmentKey,
      departmentName,
      totalRevenueGbp: round(
        deptVentures.reduce((s, v) => s + v.revenueGbp, 0)
      ),
      monthlyRevenueGbp: round(
        deptVentures.reduce((s, v) => s + v.revenueMonthlyGbp, 0)
      ),
      netProfitGbp: round(
        deptVentures.reduce((s, v) => s + v.netProfitGbp, 0)
      ),
      averageRoi:
        rois.length > 0
          ? Math.round((rois.reduce((a, b) => a + b, 0) / rois.length) * 10) / 10
          : null,
      activeMissions: active.length,
      totalMissions: deptVentures.length,
      flaggedVentures: deptVentures.filter((v) => v.flagged).length,
      topVenture: top
        ? { missionId: top.missionId, title: top.title, revenueGbp: top.revenueGbp }
        : null,
    };
  }).sort((a, b) => b.totalRevenueGbp - a.totalRevenueGbp);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

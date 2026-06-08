import { MISSION_STATUSES } from "../constants";
import type { VentureRecord } from "../revenue/venture-metrics";
import {
  computeAllocationComponents,
  computeAllocationScore,
} from "./allocation-model";
import {
  buildFundingRecommendation,
  rankByAllocationScore,
  type VentureFundingRecommendation,
} from "./funding-recommendations";
import { buildPortfolioOptimization } from "./portfolio-optimizer";

export type FundingSimulationAllocation = {
  missionId: number;
  title: string;
  amount: number;
  percentage: number;
};

export type FundingSimulation = {
  budget: number;
  allocations: FundingSimulationAllocation[];
  unallocated: number;
};

export type EngineDepartmentKey =
  | "atlas"
  | "athena"
  | "forge"
  | "nova"
  | "mercury";

export type DepartmentCapitalAllocation = {
  department: EngineDepartmentKey;
  departmentName: string;
  recommendedCapital: number;
  activeVentures: number;
  roi: number | null;
  revenue: number;
  averageAllocationScore: number;
};

const ENGINE_DEPARTMENT_MAP: Record<string, EngineDepartmentKey> = {
  ceo_office: "atlas",
  research_lab: "athena",
  builder_workshop: "forge",
  growth: "nova",
  finance: "mercury",
};

const ENGINE_NAMES: Record<EngineDepartmentKey, string> = {
  atlas: "Atlas",
  athena: "Athena",
  forge: "Forge",
  nova: "Nova",
  mercury: "Mercury",
};

const SIMULATION_BUDGETS = [100, 500, 1000, 5000] as const;

function empirePriorityForVenture(
  venture: VentureRecord,
  empireScoreV2: number | null
): number {
  const base = venture.raeScore;
  const empireBoost =
    empireScoreV2 != null ? Math.min(empireScoreV2 / 100, 1) * 20 : 10;
  return Math.min(base + empireBoost, 100);
}

export function buildVentureRecommendations(
  ventures: VentureRecord[],
  empireScoreV2: number | null
): VentureFundingRecommendation[] {
  const recommendations = ventures.map((venture) => {
    const components = computeAllocationComponents({
      venture,
      empirePriorityScore: empirePriorityForVenture(venture, empireScoreV2),
    });

    return buildFundingRecommendation({
      missionId: venture.missionId,
      title: venture.title,
      status: venture.status,
      revenueGbp: venture.revenueGbp,
      roi: venture.roi,
      growthScore: venture.growthScore,
      components,
    });
  });

  return rankByAllocationScore(recommendations);
}

/** Proportional budget simulation — no real spending. */
export function simulateFundingAllocation(
  budget: number,
  recommendations: VentureFundingRecommendation[]
): FundingSimulation {
  const eligible = recommendations.filter(
    (r) =>
      r.status !== MISSION_STATUSES.KILLED &&
      (r.recommendation === "fund_aggressively" ||
        r.recommendation === "fund" ||
        r.recommendation === "maintain")
  );

  if (eligible.length === 0 || budget <= 0) {
    return { budget, allocations: [], unallocated: budget };
  }

  const totalWeight = eligible.reduce((sum, r) => sum + r.allocationScore, 0);
  if (totalWeight <= 0) {
    return { budget, allocations: [], unallocated: budget };
  }

  let allocated = 0;
  const allocations: FundingSimulationAllocation[] = eligible.map((r) => {
    const raw = (r.allocationScore / totalWeight) * budget;
    const amount = Math.round(raw * 100) / 100;
    allocated += amount;
    return {
      missionId: r.missionId,
      title: r.title,
      amount,
      percentage: Math.round((amount / budget) * 1000) / 10,
    };
  });

  const unallocated = Math.round((budget - allocated) * 100) / 100;

  return {
    budget,
    allocations: allocations.sort((a, b) => b.amount - a.amount),
    unallocated,
  };
}

export function buildFundingSimulations(
  recommendations: VentureFundingRecommendation[]
): FundingSimulation[] {
  return SIMULATION_BUDGETS.map((budget) =>
    simulateFundingAllocation(budget, recommendations)
  );
}

export function buildDepartmentCapitalAllocations(
  ventures: VentureRecord[],
  recommendations: VentureFundingRecommendation[]
): DepartmentCapitalAllocation[] {
  const recByMission = new Map(
    recommendations.map((r) => [r.missionId, r])
  );

  const buckets = new Map<
    EngineDepartmentKey,
    {
      recommendedCapital: number;
      activeVentures: number;
      revenue: number;
      roiSum: number;
      roiCount: number;
      scoreSum: number;
      scoreCount: number;
    }
  >();

  for (const key of Object.keys(ENGINE_NAMES) as EngineDepartmentKey[]) {
    buckets.set(key, {
      recommendedCapital: 0,
      activeVentures: 0,
      revenue: 0,
      roiSum: 0,
      roiCount: 0,
      scoreSum: 0,
      scoreCount: 0,
    });
  }

  for (const venture of ventures) {
    const engineKey =
      ENGINE_DEPARTMENT_MAP[venture.departmentKey] ?? "atlas";
    const bucket = buckets.get(engineKey)!;
    const rec = recByMission.get(venture.missionId);

    bucket.revenue += venture.revenueGbp;
    if (venture.status !== MISSION_STATUSES.KILLED) {
      bucket.activeVentures += 1;
    }
    if (rec) {
      bucket.scoreSum += rec.allocationScore;
      bucket.scoreCount += 1;
      if (
        rec.recommendation === "fund_aggressively" ||
        rec.recommendation === "fund"
      ) {
        bucket.recommendedCapital += rec.allocationScore;
      }
    }
    if (venture.roi != null) {
      bucket.roiSum += venture.roi;
      bucket.roiCount += 1;
    }
  }

  return (Object.keys(ENGINE_NAMES) as EngineDepartmentKey[]).map((key) => {
    const bucket = buckets.get(key)!;
    return {
      department: key,
      departmentName: ENGINE_NAMES[key],
      recommendedCapital: Math.round(bucket.recommendedCapital),
      activeVentures: bucket.activeVentures,
      revenue: Math.round(bucket.revenue * 100) / 100,
      roi:
        bucket.roiCount > 0
          ? Math.round((bucket.roiSum / bucket.roiCount) * 10) / 10
          : null,
      averageAllocationScore:
        bucket.scoreCount > 0
          ? Math.round(bucket.scoreSum / bucket.scoreCount)
          : 0,
    };
  });
}

export function computePortfolioCapitalScore(
  recommendations: VentureFundingRecommendation[]
): number {
  const active = recommendations.filter(
    (r) => r.status !== MISSION_STATUSES.KILLED
  );
  if (active.length === 0) return 0;

  const avg =
    active.reduce((sum, r) => sum + r.allocationScore, 0) / active.length;
  const fundRatio =
    active.filter(
      (r) =>
        r.recommendation === "fund" ||
        r.recommendation === "fund_aggressively"
    ).length / active.length;

  return Math.round(Math.min(avg * 0.7 + fundRatio * 100 * 0.3, 100));
}

export function runCapitalEngine(input: {
  ventures: VentureRecord[];
  empireScoreV2: number | null;
}) {
  const recommendations = buildVentureRecommendations(
    input.ventures,
    input.empireScoreV2
  );
  const portfolioOptimization = buildPortfolioOptimization(recommendations);
  const fundingSimulations = buildFundingSimulations(recommendations);
  const departmentAllocations = buildDepartmentCapitalAllocations(
    input.ventures,
    recommendations
  );
  const portfolioCapitalScore = computePortfolioCapitalScore(recommendations);

  return {
    recommendations,
    portfolioOptimization,
    fundingSimulations,
    departmentAllocations,
    portfolioCapitalScore,
  };
}

export { computeAllocationScore };

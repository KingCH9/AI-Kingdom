import { prisma } from "@/lib/prisma";
import { getEmpireScoreSnapshot } from "../empire/queries";
import { getDepartmentWorkloads } from "../orchestration/department-coordinator";
import { MISSION_STATUSES } from "../constants";
import {
  computeAllMissionPriorities,
  type AtlasMissionInput,
  type MissionPriorityResult,
} from "./priority-engine";
import {
  buildAtlasRecommendations,
  recommendationSummary,
  type AtlasRecommendations,
} from "./recommendations";
import {
  buildPortfolioRanking,
  type PortfolioRanking,
} from "./portfolio-ranking";
import {
  analyzeDepartmentWorkloads,
  workloadPortfolioSummary,
  type DepartmentWorkloadAnalysis,
} from "./workload-analysis";

export type AtlasDashboardSnapshot = {
  generatedAt: string;
  empireScore: number;
  priorityMissions: MissionPriorityResult[];
  recommendations: AtlasRecommendations;
  recommendationCounts: ReturnType<typeof recommendationSummary>;
  departmentWorkloads: DepartmentWorkloadAnalysis[];
  workloadSummary: ReturnType<typeof workloadPortfolioSummary>;
  portfolioSummary: PortfolioRanking;
  executiveSummary: {
    totalMissions: number;
    activeMissions: number;
    topPriorityMission: MissionPriorityResult | null;
    fundCount: number;
    killCount: number;
    advisoryNote: string;
  };
};

const ACTIVE_STATUS_SET = new Set<string>([
  MISSION_STATUSES.RESEARCHING,
  MISSION_STATUSES.VALIDATING,
  MISSION_STATUSES.APPROVED,
  MISSION_STATUSES.BUILDING,
  MISSION_STATUSES.LAUNCHING,
  MISSION_STATUSES.GROWING,
]);

async function loadAtlasMissionInputs(): Promise<AtlasMissionInput[]> {
  const missions = await prisma.mission.findMany({
    include: {
      department: true,
      ventureType: true,
      opportunity: { select: { opportunityScore: true } },
      store: { select: { revenue: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const activeByDepartment = new Map<number, number>();
  for (const m of missions) {
    if (!ACTIVE_STATUS_SET.has(m.status)) continue;
    activeByDepartment.set(
      m.departmentId,
      (activeByDepartment.get(m.departmentId) ?? 0) + 1
    );
  }

  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    ownerPersona: m.ownerPersona,
    departmentKey: m.department.key,
    ventureTypeKey: m.ventureType?.key ?? null,
    opportunityScore: m.opportunity?.opportunityScore ?? 0,
    revenueGbp: m.store?.revenue ?? 0,
    actualCostGbp: m.actualCostGbp,
    targetRoi: m.targetRoi,
    createdAt: m.createdAt,
    departmentActiveMissions: activeByDepartment.get(m.departmentId) ?? 0,
  }));
}

/** Atlas CEO dashboard — advisory executive snapshot. Read-only. */
export async function getAtlasDashboardSnapshot(): Promise<AtlasDashboardSnapshot> {
  const [empire, missionInputs, orchestrationWorkloads] = await Promise.all([
    getEmpireScoreSnapshot(),
    loadAtlasMissionInputs(),
    getDepartmentWorkloads(),
  ]);

  const priorityMissions = computeAllMissionPriorities(missionInputs);
  const recommendations = buildAtlasRecommendations(priorityMissions);
  const portfolioSummary = buildPortfolioRanking(missionInputs, priorityMissions);
  const departmentWorkloads = analyzeDepartmentWorkloads(orchestrationWorkloads);
  const workloadSummary = workloadPortfolioSummary(departmentWorkloads);

  const activeMissions = missionInputs.filter((m) =>
    ACTIVE_STATUS_SET.has(m.status)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    empireScore: empire.empireScore,
    priorityMissions,
    recommendations,
    recommendationCounts: recommendationSummary(recommendations),
    departmentWorkloads,
    workloadSummary,
    portfolioSummary,
    executiveSummary: {
      totalMissions: missionInputs.length,
      activeMissions,
      topPriorityMission: priorityMissions[0] ?? null,
      fundCount: recommendations.fund.length,
      killCount: recommendations.kill.length,
      advisoryNote:
        "Atlas recommendations are advisory only. Human approval required for funding, launch, spend, and mission status changes.",
    },
  };
}

/** Load mission metrics for empire/HQ integrations. */
export async function getAtlasMissionMetrics() {
  const snapshot = await getAtlasDashboardSnapshot();
  return {
    topPriorityScore: snapshot.priorityMissions[0]?.priorityScore ?? 0,
    fundCount: snapshot.recommendationCounts.fund,
    killCount: snapshot.recommendationCounts.kill,
    activeMissions: snapshot.executiveSummary.activeMissions,
  };
}

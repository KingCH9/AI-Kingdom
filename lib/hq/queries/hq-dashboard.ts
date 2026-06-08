import { prisma } from "@/lib/prisma";
import { computeEmpireQueueStats } from "@/lib/opportunity/compute-queue-stats";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import {
  getPersonaForDepartment,
  type HqPersonaDefinition,
} from "../agent-registry";
import {
  currentBudgetPeriodMonth,
  HQ_AGENT_STATUSES,
  HQ_PERSONAS,
  MISSION_STATUSES,
  type DepartmentKey,
  type HqAgentStatus,
} from "../constants";
import {
  getDepartmentMissionCounts,
  getMissionStatusCounts,
  getRecentMissionEvents,
} from "../missions/mission-service";
import { getFinanceSnapshot } from "../finance/queries";
import { getEmpireScoreSnapshot, getAtlasEmpireSummary, getAthenaEmpireSummary } from "../empire/queries";

export type HqDepartmentSnapshot = {
  key: DepartmentKey;
  name: string;
  description: string;
  primaryAgent: {
    persona: string;
    displayName: string;
    title: string;
    avatarEmoji: string;
    status: HqAgentStatus;
    subAgents: string[];
    successMetrics: string[];
  };
  currentMission: {
    id: number;
    title: string;
    status: string;
  } | null;
  workload: {
    active: number;
    blocked: number;
    completed: number;
    total: number;
  };
  budget: {
    allocated: number;
    spent: number;
    percentUsed: number;
  };
  metrics: Record<string, number | string>;
};

export type HqSnapshot = {
  generatedAt: string;
  departments: HqDepartmentSnapshot[];
  missionBoard: Array<{
    id: number;
    title: string;
    status: string;
    ownerPersona: string;
    departmentKey: string;
    storeName: string | null;
    revenue: number;
  }>;
  constitution: Array<{ key: string; title: string; description: string }>;
  pipelineHealth: {
    validatorQueue: number;
    ceoQueue: number;
    launchReady: number;
    activeTasks: number;
  };
  totals: {
    missions: number;
    totalRevenue: number;
    netProfit: number;
  };
  recentMissions: Array<{
    id: number;
    title: string;
    status: string;
    ownerPersona: string;
    departmentKey: string;
    updatedAt: string;
  }>;
  recentEvents: Array<{
    id: number;
    missionId: number;
    missionTitle: string;
    action: string;
    detail: string | null;
    agentPersona: string | null;
    createdAt: string;
  }>;
  missionCountsByStatus: Record<string, number>;
  departmentMissionCounts: Array<{
    departmentKey: string;
    count: number;
  }>;
  finance: {
    periodMonth: string;
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    usagePercent: number;
    missionCostTotal: number;
    departmentBudgets: Array<{
      departmentKey: string;
      departmentName: string;
      allocated: number;
      spent: number;
      remaining: number;
      usagePercent: number;
      missionCostGbp: number;
    }>;
    topCostlyMissions: Array<{
      missionId: number;
      title: string;
      costGbp: number;
    }>;
  };
  ventureDistribution: Array<{
    ventureTypeKey: string;
    ventureTypeName: string;
    count: number;
  }>;
  athenaScouts: Array<{
    key: string;
    displayName: string;
    ventureTypeKey: string;
    status: string;
    missions: number;
    opportunitiesDiscovered: number;
    scoutOpportunitiesGenerated: number;
  }>;
  empireScoreSummary: {
    score: number;
    activeVentures: number;
    launchReadyCount: number;
  };
  atlasSummary: {
    topPriorityScore: number;
    fundRecommendations: number;
    killRecommendations: number;
    activeMissionsTracked: number;
  };
  athenaIntelligenceSummary: {
    topScout: {
      scoutKey: string;
      name: string;
      score: number;
      level: number;
      xp: number;
    } | null;
    averageScoutScore: number;
    totalScoutRevenue: number;
    highestRevenueScout: {
      scoutKey: string;
      name: string;
      revenueGenerated: number;
    } | null;
  };
};

function deriveAgentStatus(
  persona: HqPersonaDefinition,
  activeMissions: number,
  blockedTasks: number,
  pipelineSignal: boolean
): HqAgentStatus {
  if (blockedTasks > 0) return HQ_AGENT_STATUSES.BLOCKED;
  if (pipelineSignal) return HQ_AGENT_STATUSES.ACTIVE;
  if (activeMissions > 0) {
    if (persona.persona === HQ_PERSONAS.ATHENA) {
      return HQ_AGENT_STATUSES.RESEARCHING;
    }
    if (persona.persona === HQ_PERSONAS.FORGE) {
      return HQ_AGENT_STATUSES.BUILDING;
    }
    if (persona.persona === HQ_PERSONAS.NOVA) {
      return HQ_AGENT_STATUSES.LAUNCHING;
    }
    return HQ_AGENT_STATUSES.ACTIVE;
  }
  return HQ_AGENT_STATUSES.IDLE;
}

function departmentMetrics(
  persona: HqPersonaDefinition,
  departmentMissions: Array<{ status: string; store: { revenue: number } | null }>,
  totalRevenue: number
): Record<string, number | string> {
  switch (persona.persona) {
    case HQ_PERSONAS.ATLAS:
      return {
        venturesInReview: departmentMissions.filter(
          (m) =>
            m.status === MISSION_STATUSES.VALIDATING ||
            m.status === MISSION_STATUSES.APPROVED
        ).length,
      };
    case HQ_PERSONAS.ATHENA:
      return {
        researching: departmentMissions.filter(
          (m) => m.status === MISSION_STATUSES.RESEARCHING
        ).length,
        validating: departmentMissions.filter(
          (m) => m.status === MISSION_STATUSES.VALIDATING
        ).length,
      };
    case HQ_PERSONAS.FORGE:
      return {
        building: departmentMissions.filter(
          (m) => m.status === MISSION_STATUSES.BUILDING
        ).length,
      };
    case HQ_PERSONAS.NOVA:
      return {
        launching: departmentMissions.filter(
          (m) => m.status === MISSION_STATUSES.LAUNCHING
        ).length,
        growing: departmentMissions.filter(
          (m) => m.status === MISSION_STATUSES.GROWING
        ).length,
      };
    case HQ_PERSONAS.MERCURY:
      return {
        netProfit: totalRevenue,
        roi: totalRevenue > 0 ? "tracking" : "pending",
      };
    default:
      return {};
  }
}

export async function getHqSnapshot(): Promise<HqSnapshot> {
  const periodMonth = currentBudgetPeriodMonth();

  const [
    departments,
    missions,
    constitution,
    opportunities,
    taskCounts,
    revenueAgg,
    missionStatusCounts,
    departmentMissionCounts,
    recentEvents,
    totalMissionCount,
    financeSnapshot,
    empireSnapshot,
    atlasSummary,
    athenaIntelligenceSummary,
  ] = await Promise.all([
    prisma.department.findMany({
      include: {
        budgets: { where: { periodMonth }, take: 1 },
        missions: {
          include: {
            store: { select: { name: true, revenue: true } },
            missionTasks: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.mission.findMany({
      include: {
        store: { select: { name: true, revenue: true } },
        department: { select: { key: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.constitutionRule.findMany({
      where: { active: true },
      orderBy: { priority: "asc" },
    }),
    prisma.opportunity.findMany(),
    prisma.task.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.revenue.aggregate({ _sum: { amount: true } }),
    getMissionStatusCounts(),
    getDepartmentMissionCounts(),
    getRecentMissionEvents(8),
    prisma.mission.count(),
    getFinanceSnapshot(),
    getEmpireScoreSnapshot(),
    getAtlasEmpireSummary(),
    getAthenaEmpireSummary(),
  ]);

  const pending =
    taskCounts.find((row) => row.status === TASK_STATUSES.PENDING)?._count
      .status ?? 0;
  const inProgress =
    taskCounts.find((row) => row.status === TASK_STATUSES.IN_PROGRESS)?._count
      .status ?? 0;

  const pipelineHealth = computeEmpireQueueStats(opportunities, {
    pending,
    inProgress,
  });

  const totalRevenue = revenueAgg._sum.amount ?? 0;

  const departmentSnapshots: HqDepartmentSnapshot[] = departments.map((dept) => {
    const persona = getPersonaForDepartment(dept.key as DepartmentKey);
    const budgetRow = dept.budgets[0];
    const allocated =
      budgetRow?.allocatedGbp ?? dept.monthlyBudgetGbp;
    const spent = budgetRow?.spentGbp ?? 0;

    const deptMissions = dept.missions;
    const activeMission =
      deptMissions.find(
        (m) =>
          m.status === MISSION_STATUSES.RESEARCHING ||
          m.status === MISSION_STATUSES.VALIDATING ||
          m.status === MISSION_STATUSES.BUILDING ||
          m.status === MISSION_STATUSES.LAUNCHING ||
          m.status === MISSION_STATUSES.GROWING ||
          m.status === MISSION_STATUSES.APPROVED
      ) ?? deptMissions[0] ?? null;

    const allTasks = deptMissions.flatMap((m) => m.missionTasks);
    const workload = {
      active: allTasks.filter((t) => t.status === "active").length,
      blocked: allTasks.filter((t) => t.status === "blocked").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      total: allTasks.length,
    };

    const pipelineSignal =
      (persona.persona === HQ_PERSONAS.ATLAS &&
        pipelineHealth.ceoQueue > 0) ||
      (persona.persona === HQ_PERSONAS.ATHENA &&
        pipelineHealth.validatorQueue > 0) ||
      (persona.persona === HQ_PERSONAS.FORGE &&
        pipelineHealth.activeTasks > 0);

    return {
      key: dept.key as DepartmentKey,
      name: dept.name,
      description: dept.description,
      primaryAgent: {
        persona: persona.persona,
        displayName: persona.displayName,
        title: persona.title,
        avatarEmoji: persona.avatarEmoji,
        status: deriveAgentStatus(
          persona,
          deptMissions.filter(
            (m) =>
              m.status !== MISSION_STATUSES.PROFITABLE &&
              m.status !== MISSION_STATUSES.KILLED
          ).length,
          workload.blocked,
          pipelineSignal
        ),
        subAgents: persona.subAgents,
        successMetrics: persona.successMetrics,
      },
      currentMission: activeMission
        ? {
            id: activeMission.id,
            title: activeMission.title,
            status: activeMission.status,
          }
        : null,
      workload,
      budget: {
        allocated,
        spent,
        percentUsed:
          allocated > 0 ? Math.round((spent / allocated) * 1000) / 10 : 0,
      },
      metrics: departmentMetrics(persona, deptMissions, totalRevenue),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    departments: departmentSnapshots,
    missionBoard: missions.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      ownerPersona: m.ownerPersona,
      departmentKey: m.department.key,
      storeName: m.store?.name ?? null,
      revenue: m.store?.revenue ?? 0,
    })),
    constitution: constitution.map((rule) => ({
      key: rule.key,
      title: rule.title,
      description: rule.description,
    })),
    pipelineHealth: {
      validatorQueue: pipelineHealth.validatorQueue,
      ceoQueue: pipelineHealth.ceoQueue,
      launchReady: pipelineHealth.launchReady,
      activeTasks: pipelineHealth.activeTasks,
    },
    totals: {
      missions: totalMissionCount,
      totalRevenue,
      netProfit: totalRevenue,
    },
    recentMissions: missions.slice(0, 8).map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      ownerPersona: m.ownerPersona,
      departmentKey: m.department.key,
      updatedAt: m.updatedAt.toISOString(),
    })),
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      missionId: e.missionId,
      missionTitle: e.mission.title,
      action: e.action,
      detail: e.detail,
      agentPersona: e.agentPersona,
      createdAt: e.createdAt.toISOString(),
    })),
    missionCountsByStatus: missionStatusCounts,
    departmentMissionCounts: departmentMissionCounts.map((row) => ({
      departmentKey: row.departmentKey,
      count: row.count,
    })),
    finance: {
      periodMonth: financeSnapshot.periodMonth,
      totalAllocated: financeSnapshot.totals.allocatedGbp,
      totalSpent: financeSnapshot.totals.spentGbp,
      totalRemaining: financeSnapshot.totals.remainingGbp,
      usagePercent: financeSnapshot.totals.usagePercent,
      missionCostTotal: financeSnapshot.totals.missionCostGbp,
      departmentBudgets: financeSnapshot.budgets.map((b) => ({
        departmentKey: b.departmentKey,
        departmentName: b.departmentName,
        allocated: b.allocatedGbp,
        spent: b.spentGbp,
        remaining: b.remainingGbp,
        usagePercent: b.usagePercent,
        missionCostGbp: b.missionCostGbp,
      })),
      topCostlyMissions: financeSnapshot.topCostlyMissions.slice(0, 5).map((m) => ({
        missionId: m.missionId,
        title: m.missionTitle,
        costGbp: m.totalCostGbp,
      })),
    },
    ventureDistribution: empireSnapshot.venturesByType,
    athenaScouts: empireSnapshot.scouts.map((s) => ({
      key: s.key,
      displayName: s.displayName,
      ventureTypeKey: s.ventureTypeKey,
      status: s.status,
      missions: s.missions,
      opportunitiesDiscovered: s.opportunitiesDiscovered,
      scoutOpportunitiesGenerated: s.opportunitiesDiscovered,
    })),
    empireScoreSummary: {
      score: empireSnapshot.empireScore,
      activeVentures: empireSnapshot.metrics.activeVentures,
      launchReadyCount: empireSnapshot.metrics.launchReadyCount,
    },
    atlasSummary,
    athenaIntelligenceSummary: {
      topScout: athenaIntelligenceSummary.topScout
        ? {
            scoutKey: athenaIntelligenceSummary.topScout.scoutKey,
            name: athenaIntelligenceSummary.topScout.name,
            score: athenaIntelligenceSummary.topScout.score,
            level: athenaIntelligenceSummary.topScout.level,
            xp: athenaIntelligenceSummary.topScout.xp,
          }
        : null,
      averageScoutScore: athenaIntelligenceSummary.averageScoutScore,
      totalScoutRevenue: athenaIntelligenceSummary.totalScoutRevenue,
      highestRevenueScout: athenaIntelligenceSummary.highestRevenueScout
        ? {
            scoutKey: athenaIntelligenceSummary.highestRevenueScout.scoutKey,
            name: athenaIntelligenceSummary.highestRevenueScout.name,
            revenueGenerated:
              athenaIntelligenceSummary.highestRevenueScout.revenueGenerated,
          }
        : null,
    },
  };
}

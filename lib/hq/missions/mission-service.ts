import { prisma } from "@/lib/prisma";
import { runConstitutionGuard } from "../constitution/guard";
import {
  MISSION_PHASES,
  MISSION_STATUSES,
  REVENUE_STREAMS_TIER1,
  type MissionStatus,
} from "../constants";
import {
  createMissionEventWithCost,
  MISSION_EVENT_ACTIONS,
} from "../events/mission-events";
import { buildMissionPhaseSeeds } from "./project-from-empire";
import {
  coordinateStatusTransition,
  formatHandoffDetail,
} from "../orchestration";

const MISSION_INCLUDE = {
  department: true,
  opportunity: true,
  store: true,
  ventureType: true,
  ventureTemplate: true,
  missionTasks: { orderBy: { sortOrder: "asc" as const } },
  events: { orderBy: { createdAt: "desc" as const } },
};

export type CreateMissionInput = {
  title: string;
  description?: string | null;
  departmentId: number;
  ownerPersona: string;
  revenueStream?: string;
  opportunityId?: number | null;
  agentPersona?: string | null;
  estimatedCostGbp?: number;
};

export type UpdateMissionInput = {
  status?: MissionStatus;
  humanOverride?: boolean;
  overrideReason?: string | null;
  agentPersona?: string | null;
  estimatedCostGbp?: number;
};

function isValidMissionStatus(status: string): status is MissionStatus {
  return Object.values(MISSION_STATUSES).includes(status as MissionStatus);
}

function isValidRevenueStream(stream: string): boolean {
  return (REVENUE_STREAMS_TIER1 as readonly string[]).includes(stream);
}

async function seedDefaultMissionTasks(
  missionId: number,
  opportunityId?: number | null
) {
  if (opportunityId) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        stores: { orderBy: { id: "asc" }, take: 1 },
        tasks: true,
      },
    });
    if (opportunity) {
      const store = opportunity.stores[0] ?? null;
      const phases = buildMissionPhaseSeeds({ opportunity, store, tasks: opportunity.tasks });
      for (const phase of phases) {
        await prisma.missionTask.create({
          data: {
            missionId,
            phase: phase.phase,
            title: phase.title,
            status: phase.status,
            ownerPersona: phase.ownerPersona,
            sortOrder: phase.sortOrder,
            legacyTaskId: phase.legacyTaskId ?? null,
          },
        });
      }
      return;
    }
  }

  const defaultPhases = [
    { phase: MISSION_PHASES.RESEARCH, title: "Research market opportunity", ownerPersona: "athena", sortOrder: 0 },
    { phase: MISSION_PHASES.VALIDATE, title: "Validate venture metrics", ownerPersona: "athena", sortOrder: 1 },
    { phase: MISSION_PHASES.BUILD, title: "Build store and product assets", ownerPersona: "forge", sortOrder: 2 },
    { phase: MISSION_PHASES.LAUNCH, title: "Launch marketing and go live", ownerPersona: "nova", sortOrder: 3 },
    { phase: MISSION_PHASES.GROW, title: "Grow traffic and conversions", ownerPersona: "nova", sortOrder: 4 },
  ];

  for (const phase of defaultPhases) {
    await prisma.missionTask.create({
      data: {
        missionId,
        phase: phase.phase,
        title: phase.title,
        status: "pending",
        ownerPersona: phase.ownerPersona,
        sortOrder: phase.sortOrder,
      },
    });
  }
}

export async function listMissions(filters?: {
  status?: string;
  department?: string;
}) {
  const where: {
    status?: string;
    department?: { key?: string; id?: number };
  } = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.department) {
    const deptKey = filters.department;
    const numericId = Number(deptKey);
    if (!Number.isNaN(numericId)) {
      where.department = { id: numericId };
    } else {
      where.department = { key: deptKey };
    }
  }

  const missions = await prisma.mission.findMany({
    where,
    include: {
      department: true,
      opportunity: true,
      store: true,
      ventureType: true,
      ventureTemplate: true,
      missionTasks: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return missions;
}

export async function getMissionById(id: number) {
  return prisma.mission.findUnique({
    where: { id },
    include: MISSION_INCLUDE,
  });
}

export async function createMission(input: CreateMissionInput) {
  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
  });
  if (!department) {
    return { success: false as const, message: "Department not found" };
  }

  if (input.opportunityId) {
    const linked = await prisma.mission.findUnique({
      where: { opportunityId: input.opportunityId },
    });
    if (linked) {
      return {
        success: false as const,
        message: "Opportunity already linked to a mission",
      };
    }
  }

  const revenueStream = input.revenueStream ?? "shopify";
  if (!isValidRevenueStream(revenueStream)) {
    return { success: false as const, message: "Invalid revenue stream" };
  }

  let storeId: number | null = null;
  if (input.opportunityId) {
    const store = await prisma.store.findFirst({
      where: { opportunityId: input.opportunityId },
      orderBy: { id: "asc" },
    });
    storeId = store?.id ?? null;
  }

  const mission = await prisma.mission.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: MISSION_STATUSES.RESEARCHING,
      ownerPersona: input.ownerPersona,
      departmentId: input.departmentId,
      opportunityId: input.opportunityId ?? null,
      storeId,
      revenueStream,
      revenueTier: 1,
    },
    include: MISSION_INCLUDE,
  });

  await seedDefaultMissionTasks(mission.id, input.opportunityId);

  await createMissionEventWithCost({
    missionId: mission.id,
    action: MISSION_EVENT_ACTIONS.MISSION_CREATED,
    detail: `Mission "${mission.title}" created`,
    agentPersona: input.agentPersona ?? input.ownerPersona,
    estimatedCostGbp: input.estimatedCostGbp,
  });

  const refreshed = await getMissionById(mission.id);
  return { success: true as const, mission: refreshed! };
}

export async function updateMission(id: number, input: UpdateMissionInput) {
  const existing = await prisma.mission.findUnique({ where: { id } });
  if (!existing) {
    return { success: false as const, message: "Mission not found" };
  }

  if (input.status && !isValidMissionStatus(input.status)) {
    return { success: false as const, message: "Invalid mission status" };
  }

  const data: {
    status?: string;
    humanOverride?: boolean;
    overrideReason?: string | null;
    ownerPersona?: string;
    departmentId?: number;
  } = {};

  const changes: string[] = [];

  let handoffDetail: string | null = null;

  if (input.status !== undefined && input.status !== existing.status) {
    data.status = input.status;
    changes.push(`status → ${input.status}`);

    const coordination = coordinateStatusTransition({
      previousStatus: existing.status as MissionStatus,
      nextStatus: input.status,
    });
    data.ownerPersona = coordination.ownerPersona;

    const dept = await prisma.department.findUnique({
      where: { key: coordination.departmentKey },
    });
    if (dept) data.departmentId = dept.id;

    if (coordination.ownerPersona !== existing.ownerPersona) {
      handoffDetail = formatHandoffDetail({
        previousStatus: existing.status as MissionStatus,
        nextStatus: input.status,
        previousPersona: existing.ownerPersona,
        nextPersona: coordination.ownerPersona,
        handoffLabel: coordination.handoff?.label,
      });
    }
  }

  const overrideToggled =
    input.humanOverride !== undefined &&
    input.humanOverride !== existing.humanOverride;
  const reasonChanged =
    input.overrideReason !== undefined &&
    input.overrideReason !== existing.overrideReason;

  if (input.humanOverride !== undefined) {
    data.humanOverride = input.humanOverride;
    if (overrideToggled) {
      changes.push(`humanOverride → ${input.humanOverride}`);
    }
  }
  if (input.overrideReason !== undefined) {
    data.overrideReason = input.overrideReason;
    if (reasonChanged) {
      changes.push("overrideReason updated");
    }
  }

  const mission = await prisma.mission.update({
    where: { id },
    data,
    include: MISSION_INCLUDE,
  });

  if (changes.length > 0) {
    await createMissionEventWithCost({
      missionId: mission.id,
      action: MISSION_EVENT_ACTIONS.MISSION_UPDATED,
      detail: changes.join("; "),
      agentPersona: input.agentPersona ?? "operator",
      estimatedCostGbp: input.estimatedCostGbp,
    });
  }

  if (handoffDetail) {
    await createMissionEventWithCost({
      missionId: mission.id,
      action: MISSION_EVENT_ACTIONS.ORCHESTRATION_HANDOFF,
      detail: handoffDetail,
      agentPersona: input.agentPersona ?? "orchestrator",
      estimatedCostGbp: 0,
      syncMissionCost: false,
    });
  }

  await runConstitutionGuard({
    mission,
    previousStatus: existing.status,
    agentPersona: input.agentPersona,
  });

  if (
    (overrideToggled && mission.humanOverride) ||
    (mission.humanOverride && reasonChanged && mission.overrideReason?.trim())
  ) {
    await createMissionEventWithCost({
      missionId: mission.id,
      action: MISSION_EVENT_ACTIONS.HUMAN_OVERRIDE,
      detail: mission.overrideReason?.trim() || "Human override enabled",
      agentPersona: input.agentPersona ?? "operator",
      estimatedCostGbp: input.estimatedCostGbp,
    });
  }

  const refreshed = await getMissionById(id);
  return { success: true as const, mission: refreshed! };
}

export async function completeMissionTask(
  missionId: number,
  taskId: number,
  agentPersona?: string | null
) {
  const task = await prisma.missionTask.findFirst({
    where: { id: taskId, missionId },
    include: { legacyTask: true },
  });

  if (!task) {
    return { success: false as const, message: "Mission task not found" };
  }

  if (task.status === "completed") {
    return { success: false as const, message: "Task already completed" };
  }

  const updated = await prisma.missionTask.update({
    where: { id: taskId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });

  let detail = `Task completed: ${task.title}`;
  if (task.legacyTaskId) {
    detail += `. Legacy Task #${task.legacyTaskId} completed`;
  }

  await createMissionEventWithCost({
    missionId,
    action: MISSION_EVENT_ACTIONS.TASK_COMPLETED,
    detail,
    agentPersona: agentPersona ?? task.ownerPersona,
    estimatedCostGbp: task.estimatedCostGbp,
  });

  const mission = await getMissionById(missionId);
  return { success: true as const, task: updated, mission: mission! };
}

export async function getMissionStatusCounts() {
  const rows = await prisma.mission.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count.status]));
}

export async function getDepartmentMissionCounts() {
  const rows = await prisma.mission.groupBy({
    by: ["departmentId"],
    _count: { departmentId: true },
  });
  const departments = await prisma.department.findMany();
  const deptById = new Map(departments.map((d) => [d.id, d.key]));
  return rows.map((r) => ({
    departmentId: r.departmentId,
    departmentKey: deptById.get(r.departmentId) ?? "unknown",
    count: r._count.departmentId,
  }));
}

export async function getRecentMissionEvents(limit = 10) {
  return prisma.missionEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      mission: { select: { id: true, title: true, status: true } },
    },
  });
}

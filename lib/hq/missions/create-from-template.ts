import { prisma } from "@/lib/prisma";
import { MISSION_STATUSES } from "../constants";
import {
  createMissionEventWithCost,
  MISSION_EVENT_ACTIONS,
} from "../events/mission-events";
import {
  defaultMissionTitleForTemplate,
  getPhasesForTemplate,
} from "../ventures/template-phases";

export type CreateMissionFromTemplateInput = {
  templateId?: number;
  templateKey?: string;
  title?: string;
  description?: string | null;
  departmentId?: number;
  agentPersona?: string | null;
  estimatedCostGbp?: number;
};

export async function createMissionFromTemplate(
  input: CreateMissionFromTemplateInput
) {
  const template = input.templateId
    ? await prisma.ventureTemplate.findUnique({
        where: { id: input.templateId },
        include: { ventureType: true },
      })
    : input.templateKey
      ? await prisma.ventureTemplate.findUnique({
          where: { key: input.templateKey },
          include: { ventureType: true },
        })
      : null;

  if (!template) {
    return { success: false as const, message: "Venture template not found" };
  }

  if (!template.active) {
    return { success: false as const, message: "Venture template is inactive" };
  }

  let departmentId = input.departmentId;
  if (!departmentId) {
    const researchLab = await prisma.department.findUnique({
      where: { key: "research_lab" },
    });
    if (!researchLab) {
      return { success: false as const, message: "Research Lab department not found" };
    }
    departmentId = researchLab.id;
  }

  const title = defaultMissionTitleForTemplate(template.name, input.title);

  const mission = await prisma.mission.create({
    data: {
      title,
      description: input.description?.trim() || template.description,
      status: MISSION_STATUSES.RESEARCHING,
      ownerPersona: "athena",
      departmentId,
      ventureTypeId: template.ventureTypeId,
      ventureTemplateId: template.id,
      revenueStream: template.ventureType.key,
      revenueTier: 1,
    },
    include: {
      department: true,
      ventureType: true,
      ventureTemplate: true,
      missionTasks: true,
      events: true,
    },
  });

  const phases = getPhasesForTemplate(template.key);
  for (const phase of phases) {
    await prisma.missionTask.create({
      data: {
        missionId: mission.id,
        phase: phase.phase,
        title: phase.title,
        status: phase.sortOrder === 0 ? "active" : "pending",
        ownerPersona: phase.ownerPersona,
        sortOrder: phase.sortOrder,
      },
    });
  }

  await createMissionEventWithCost({
    missionId: mission.id,
    action: MISSION_EVENT_ACTIONS.MISSION_CREATED,
    detail: `Mission from template "${template.name}" (${template.key})`,
    agentPersona: input.agentPersona ?? "athena",
    estimatedCostGbp: input.estimatedCostGbp,
  });

  const refreshed = await prisma.mission.findUnique({
    where: { id: mission.id },
    include: {
      department: true,
      ventureType: true,
      ventureTemplate: true,
      missionTasks: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  return { success: true as const, mission: refreshed! };
}

export async function listVentureTemplates() {
  return prisma.ventureTemplate.findMany({
    where: { active: true },
    include: { ventureType: true },
    orderBy: { name: "asc" },
  });
}

export async function listVentureTypes() {
  return prisma.ventureType.findMany({
    where: { active: true },
    include: { templates: { where: { active: true } } },
    orderBy: { name: "asc" },
  });
}

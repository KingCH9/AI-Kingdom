import { prisma } from "@/lib/prisma";
import { MISSION_STATUSES } from "../constants";
import {
  createMissionEventWithCost,
  MISSION_EVENT_ACTIONS,
} from "../events/mission-events";
import {
  generateScoutOpportunity,
  scoutCategory,
  type ScoutOpportunityDraft,
} from "../scouts/opportunity-generator";
import {
  getScoutByKey,
  SCOUT_REGISTRY,
} from "../scouts/index";
import { getPhasesForTemplate } from "../ventures/template-phases";

export type CreateMissionFromScoutInput = {
  scoutKey: string;
  opportunityId?: number;
  title?: string;
  agentPersona?: string | null;
  estimatedCostGbp?: number;
};

export async function persistScoutOpportunity(
  draft: ScoutOpportunityDraft
) {
  return prisma.opportunity.create({
    data: {
      productName: draft.productName,
      productDescription: draft.productDescription,
      whyTrending: draft.whyTrending,
      targetCustomer: draft.targetCustomer,
      category: draft.category,
      demandScore: draft.demandScore,
      competition: draft.competition,
      opportunityScore: draft.opportunityScore,
      riskRating: draft.riskRating,
      profitMargin: draft.profitMargin,
      sellingPrice: draft.sellingPrice,
      status: "researching",
    },
  });
}

export async function generateScoutOpportunityRecord(scoutKey: string) {
  const scout = getScoutByKey(scoutKey);
  if (!scout) {
    return { success: false as const, message: "Scout not found" };
  }

  const draft = generateScoutOpportunity(scout, {
    salt: `${scoutKey}-${Date.now()}`,
  });
  const opportunity = await persistScoutOpportunity(draft);

  return { success: true as const, opportunity, draft, scout };
}

export async function createMissionFromScout(input: CreateMissionFromScoutInput) {
  const scout = getScoutByKey(input.scoutKey);
  if (!scout) {
    return { success: false as const, message: "Scout not found" };
  }

  const draft = generateScoutOpportunity(scout, {
    salt: `${input.scoutKey}-${input.opportunityId ?? Date.now()}`,
  });

  const template = await prisma.ventureTemplate.findUnique({
    where: { key: draft.templateKey },
    include: { ventureType: true },
  });

  if (!template?.active) {
    return { success: false as const, message: "Venture template not found for scout" };
  }

  let opportunityId = input.opportunityId;

  if (opportunityId) {
    const existing = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!existing) {
      return { success: false as const, message: "Opportunity not found" };
    }
    if (existing.category !== scoutCategory(scout.key)) {
      return {
        success: false as const,
        message: "Opportunity does not belong to this scout",
      };
    }
    const linked = await prisma.mission.findUnique({
      where: { opportunityId },
    });
    if (linked) {
      return {
        success: false as const,
        message: "Opportunity already linked to a mission",
      };
    }
    draft.productName = existing.productName;
    draft.productDescription = existing.productDescription ?? draft.productDescription;
  } else {
    const generated = await generateScoutOpportunityRecord(scout.key);
    if (!generated.success) {
      return { success: false as const, message: generated.message };
    }
    opportunityId = generated.opportunity.id;
    draft.productName = generated.draft.productName;
    draft.productDescription = generated.draft.productDescription;
  }

  const researchLab = await prisma.department.findUnique({
    where: { key: "research_lab" },
  });
  if (!researchLab) {
    return { success: false as const, message: "Research Lab department not found" };
  }

  const title =
    input.title?.trim() || `Launch ${draft.productName}`;

  const mission = await prisma.mission.create({
    data: {
      title,
      description: `${scout.displayName} discovered: ${draft.productDescription}`,
      status: MISSION_STATUSES.RESEARCHING,
      ownerPersona: "athena",
      departmentId: researchLab.id,
      opportunityId,
      ventureTypeId: template.ventureTypeId,
      ventureTemplateId: template.id,
      revenueStream: template.ventureType.key,
      revenueTier: 1,
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
    detail: `Mission from ${scout.displayName} — ${draft.productName} (${template.key})`,
    agentPersona: input.agentPersona ?? scout.key.replace("_scout", ""),
    estimatedCostGbp: input.estimatedCostGbp,
  });

  const refreshed = await prisma.mission.findUnique({
    where: { id: mission.id },
    include: {
      department: true,
      opportunity: true,
      ventureType: true,
      ventureTemplate: true,
      missionTasks: { orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  return {
    success: true as const,
    mission: refreshed!,
    opportunityId,
    scout: scout.key,
  };
}

export async function countScoutGeneratedOpportunities() {
  const opportunities = await prisma.opportunity.findMany({
    where: { category: { startsWith: "hq_scout:" } },
    select: { category: true },
  });

  const byScout = new Map<string, number>();
  for (const opp of opportunities) {
    const key = opp.category?.replace("hq_scout:", "") ?? "unknown";
    byScout.set(key, (byScout.get(key) ?? 0) + 1);
  }

  return {
    total: opportunities.length,
    byScout,
    scouts: SCOUT_REGISTRY.map((scout) => ({
      scoutKey: scout.key,
      count: byScout.get(scout.key) ?? 0,
    })),
  };
}

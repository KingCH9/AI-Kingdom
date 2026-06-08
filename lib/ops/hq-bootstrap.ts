import { prisma } from "@/lib/prisma";
import { MISSION_STATUSES } from "@/lib/hq/constants";
import {
  DEPARTMENT_PERSONA_MAP,
  getDepartmentKeyForPersona,
  HQ_PERSONA_REGISTRY,
} from "@/lib/hq/agent-registry";
import {
  buildMissionPhaseSeeds,
  buildMissionTitle,
  mapOpportunityToMissionStatus,
  ownerPersonaForMissionStatus,
} from "@/lib/hq/missions/project-from-empire";
import { seedHqFoundation } from "@/lib/hq/seed/foundation";
import {
  backfillMissionVentureTypes,
  seedVentureEngine,
} from "@/lib/hq/seed/venture-engine";
import { countScoutGeneratedOpportunities } from "@/lib/hq/missions/mission-from-scout";

const LOG_PREFIX = "[hq-bootstrap]";

async function attachAgentHqMetadata(): Promise<number> {
  const departments = await prisma.department.findMany();
  const deptByKey = new Map(departments.map((d) => [d.key, d.id]));
  let updated = 0;

  for (const def of Object.values(HQ_PERSONA_REGISTRY)) {
    const departmentId = deptByKey.get(def.departmentKey);
    if (!departmentId) continue;

    for (const role of def.pipelineRoles) {
      const agents = await prisma.agent.findMany({ where: { role } });
      for (const agent of agents) {
        if (agent.hqPersona === def.persona) continue;
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            hqPersona: def.persona,
            agentKind: "primary",
            departmentId,
            avatarKey: def.avatarEmoji,
          },
        });
        updated += 1;
      }
    }
  }

  return updated;
}

export async function backfillMissionsFromEmpire(): Promise<{
  missionsCreated: number;
  missionsSynced: number;
  tasksCreated: number;
}> {
  await seedHqFoundation();

  const departments = await prisma.department.findMany();
  const deptIdByPersona = new Map<string, number>();
  for (const [deptKey, persona] of Object.entries(DEPARTMENT_PERSONA_MAP)) {
    const dept = departments.find((d) => d.key === deptKey);
    if (dept) deptIdByPersona.set(persona, dept.id);
  }

  const opportunities = await prisma.opportunity.findMany({
    include: {
      stores: { orderBy: { id: "asc" }, take: 1 },
      tasks: true,
      mission: true,
    },
    orderBy: { id: "asc" },
  });

  let missionsCreated = 0;
  let missionsSynced = 0;
  let tasksCreated = 0;

  for (const opportunity of opportunities) {
    const store = opportunity.stores[0] ?? null;
    const missionStatus = mapOpportunityToMissionStatus(opportunity.status);
    const ownerPersona = ownerPersonaForMissionStatus(missionStatus);
    const departmentId =
      deptIdByPersona.get(ownerPersona) ??
      departments.find((d) => d.key === getDepartmentKeyForPersona(ownerPersona))
        ?.id;

    if (!departmentId) continue;

    const approvedAt =
      missionStatus === MISSION_STATUSES.APPROVED ||
      missionStatus === MISSION_STATUSES.BUILDING ||
      missionStatus === MISSION_STATUSES.LAUNCHING ||
      missionStatus === MISSION_STATUSES.GROWING ||
      missionStatus === MISSION_STATUSES.PROFITABLE
        ? opportunity.updatedAt
        : null;

    let missionId: number;

    if (opportunity.mission) {
      await prisma.mission.update({
        where: { id: opportunity.mission.id },
        data: {
          title: buildMissionTitle(opportunity),
          status: missionStatus,
          ownerPersona,
          departmentId,
          storeId: store?.id ?? null,
          approvedAt: approvedAt ?? opportunity.mission.approvedAt,
          approvedBy:
            missionStatus === MISSION_STATUSES.APPROVED ||
            approvedAt
              ? "atlas"
              : opportunity.mission.approvedBy,
        },
      });
      missionId = opportunity.mission.id;
      missionsSynced += 1;
    } else {
      const mission = await prisma.mission.create({
        data: {
          title: buildMissionTitle(opportunity),
          description: opportunity.productDescription,
          status: missionStatus,
          ownerPersona,
          departmentId,
          opportunityId: opportunity.id,
          storeId: store?.id ?? null,
          revenueStream: "shopify",
          revenueTier: 1,
          approvedAt,
          approvedBy: approvedAt ? "atlas" : null,
        },
      });
      missionId = mission.id;
      missionsCreated += 1;
    }

    const phaseSeeds = buildMissionPhaseSeeds({
      opportunity,
      store,
      tasks: opportunity.tasks,
    });

    for (const phase of phaseSeeds) {
      const existing = await prisma.missionTask.findFirst({
        where: { missionId, phase: phase.phase },
      });

      if (existing) {
        await prisma.missionTask.update({
          where: { id: existing.id },
          data: {
            status: phase.status,
            legacyTaskId: phase.legacyTaskId ?? null,
          },
        });
      } else {
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
        tasksCreated += 1;
      }
    }
  }

  return { missionsCreated, missionsSynced, tasksCreated };
}

/** Idempotent HQ Phase 1a bootstrap — foundation + empire mission backfill. */
export async function ensureHqFoundation(): Promise<void> {
  try {
    await seedHqFoundation();
    await seedVentureEngine();
    const agentsUpdated = await attachAgentHqMetadata();
    const result = await backfillMissionsFromEmpire();
    const ventureBackfill = await backfillMissionVentureTypes();
    const scoutCounts = await countScoutGeneratedOpportunities();

    console.log(
      `${LOG_PREFIX} complete agents=${agentsUpdated} missionsCreated=${result.missionsCreated} missionsSynced=${result.missionsSynced} missionTasks=${result.tasksCreated} ventureBackfill=${ventureBackfill} scoutOpportunities=${scoutCounts.total}`
    );
  } catch (error) {
    console.error(
      `${LOG_PREFIX} error:`,
      error instanceof Error ? error.message : error
    );
  }
}

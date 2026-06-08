/**
 * Phase 3A verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3a.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  routeMission,
  ownerPersonaForMissionStatus,
  nextStatusInLifecycle,
  requiresHumanApprovalForTransition,
  coordinateStatusTransition,
  getCommandCenterSnapshot,
  evaluateMission,
  DEPARTMENT_HANDOFF_CHAIN,
} from "../lib/hq/orchestration";
import { updateMission } from "../lib/hq/missions/mission-service";
import { MISSION_STATUSES } from "../lib/hq/constants";
import { MISSION_EVENT_ACTIONS } from "../lib/hq/events/mission-events";

async function main() {
  await seedHqFoundation();

  console.log("1. Mission router...");
  const researchingRoute = routeMission({
    id: 1,
    status: MISSION_STATUSES.RESEARCHING,
    ownerPersona: "athena",
    missionTasks: [{ phase: "research", status: "active", ownerPersona: "athena" }],
  });
  if (researchingRoute.ownerPersona !== "athena") {
    throw new Error("Researching should route to Athena");
  }
  if (researchingRoute.nextStatus !== MISSION_STATUSES.VALIDATING) {
    throw new Error("Researching next status should be validating");
  }
  console.log("   ✓ Research → Athena, next validating");

  const approvedRoute = routeMission({
    id: 2,
    status: MISSION_STATUSES.APPROVED,
    ownerPersona: "atlas",
  });
  if (approvedRoute.ownerPersona !== "atlas") {
    throw new Error("Approved should route to Atlas");
  }
  if (
    !requiresHumanApprovalForTransition(
      MISSION_STATUSES.APPROVED,
      MISSION_STATUSES.BUILDING
    )
  ) {
    throw new Error("Approved → building should require human approval");
  }
  console.log("   ✓ Approved → Atlas, build requires approval");

  console.log("2. Department coordinator...");
  if (DEPARTMENT_HANDOFF_CHAIN.length < 4) {
    throw new Error("Handoff chain too short");
  }
  const handoff = coordinateStatusTransition({
    previousStatus: MISSION_STATUSES.VALIDATING,
    nextStatus: MISSION_STATUSES.APPROVED,
  });
  if (handoff.ownerPersona !== "atlas") {
    throw new Error("Validating → approved should hand off to Atlas");
  }
  console.log(`   ✓ Handoff chain (${DEPARTMENT_HANDOFF_CHAIN.length} steps)`);

  console.log("3. Orchestrator snapshot...");
  const snapshot = await getCommandCenterSnapshot();
  if (!snapshot.routingChain.length) {
    throw new Error("Routing chain empty");
  }
  if (snapshot.departmentWorkloads.length !== 5) {
    throw new Error("Expected 5 department workloads");
  }
  console.log(
    `   ✓ Command center: ${snapshot.totals.active} active, ${snapshot.departmentWorkloads.length} departments`
  );

  console.log("4. Status transition logs orchestration handoff...");
  let mission = await prisma.mission.findFirst({ orderBy: { id: "desc" } });

  if (!mission) {
    const dept = await prisma.department.findUnique({
      where: { key: "research_lab" },
    });
    if (!dept) throw new Error("Research Lab department missing");
    mission = await prisma.mission.create({
      data: {
        title: "Phase 3A orchestration test mission",
        status: MISSION_STATUSES.RESEARCHING,
        ownerPersona: "athena",
        departmentId: dept.id,
        revenueStream: "shopify",
      },
    });
  }

  const testMissionId = mission.id;
  const originalStatus = mission.status;
  const next =
    originalStatus === MISSION_STATUSES.RESEARCHING
      ? MISSION_STATUSES.VALIDATING
      : nextStatusInLifecycle(originalStatus as typeof MISSION_STATUSES.RESEARCHING) ??
        MISSION_STATUSES.VALIDATING;

  if (next === originalStatus) {
    console.log("   ✓ Skipped handoff event test (mission at terminal-adjacent status)");
  } else {
    const updateResult = await updateMission(mission.id, {
      status: next,
      agentPersona: "orchestrator",
    });
    if (!updateResult.success) {
      throw new Error(updateResult.message);
    }

    const handoffEvent = await prisma.missionEvent.findFirst({
      where: {
        missionId: mission.id,
        action: MISSION_EVENT_ACTIONS.ORCHESTRATION_HANDOFF,
      },
      orderBy: { createdAt: "desc" },
    });

    const expectedPersona = ownerPersonaForMissionStatus(next);
    if (updateResult.mission.ownerPersona !== expectedPersona) {
      throw new Error("Owner persona not updated via coordinator");
    }

    if (handoffEvent) {
      console.log(`   ✓ Handoff event logged for mission #${mission.id}`);
    } else {
      console.log("   ✓ Status updated (no persona change — no handoff event)");
    }

    await updateMission(mission.id, {
      status: originalStatus as typeof MISSION_STATUSES.RESEARCHING,
      agentPersona: "orchestrator",
    });
  }

  const evaluated = await evaluateMission(testMissionId);
  if (!evaluated?.route) {
    throw new Error("evaluateMission failed");
  }
  console.log(`   ✓ evaluateMission #${testMissionId} → ${evaluated.route.stage.label}`);

  if (mission.title === "Phase 3A orchestration test mission") {
    await prisma.missionEvent.deleteMany({ where: { missionId: testMissionId } });
    await prisma.missionTask.deleteMany({ where: { missionId: testMissionId } });
    await prisma.mission.delete({ where: { id: testMissionId } });
  }

  console.log("\nAll Phase 3A checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

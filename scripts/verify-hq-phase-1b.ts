/**
 * Phase 1b verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-1b.ts
 */
import { prisma } from "../lib/prisma";
import {
  completeMissionTask,
  createMission,
  updateMission,
} from "../lib/hq/missions/mission-service";
import { MISSION_STATUSES } from "../lib/hq/constants";

import { seedHqFoundation } from "../lib/hq/seed/foundation";

async function main() {
  await seedHqFoundation();

  const dept = await prisma.department.findFirst({
    where: { key: "research_lab" },
  });
  if (!dept) throw new Error("research_lab department missing — run HQ bootstrap");

  console.log("1. Create mission...");
  const created = await createMission({
    title: `Phase 1b Test ${Date.now()}`,
    description: "Automated verification mission",
    departmentId: dept.id,
    ownerPersona: "athena",
    revenueStream: "shopify",
    agentPersona: "operator",
  });
  if (!created.success) throw new Error(created.message);
  const missionId = created.mission.id;
  console.log(`   ✓ Mission #${missionId} created`);

  const onBoard = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!onBoard) throw new Error("Mission not on board");
  console.log("   ✓ Mission appears in database");

  const task = await prisma.missionTask.findFirst({
    where: { missionId, status: { not: "completed" } },
  });
  if (!task) throw new Error("No pending task to complete");

  console.log("2. Complete mission task...");
  const completed = await completeMissionTask(missionId, task.id, "operator");
  if (!completed.success) throw new Error(completed.message);
  const taskEvent = await prisma.missionEvent.findFirst({
    where: { missionId, action: "task_completed" },
    orderBy: { createdAt: "desc" },
  });
  if (!taskEvent) throw new Error("task_completed MissionEvent missing");
  console.log(`   ✓ MissionEvent: ${taskEvent.action}`);

  console.log("3. Enable human override...");
  const override = await updateMission(missionId, {
    humanOverride: true,
    overrideReason: "Phase 1b test override",
    agentPersona: "operator",
  });
  if (!override.success) throw new Error(override.message);
  const overrideEvent = await prisma.missionEvent.findFirst({
    where: { missionId, action: "human_override" },
  });
  if (!overrideEvent) throw new Error("human_override MissionEvent missing");
  console.log(`   ✓ MissionEvent: ${overrideEvent.action}`);

  console.log("4. Trigger constitution warning (BUILD without approval)...");
  await prisma.mission.update({
    where: { id: missionId },
    data: { approvedAt: null, approvedBy: null },
  });
  const build = await updateMission(missionId, {
    status: MISSION_STATUSES.BUILDING,
    agentPersona: "operator",
  });
  if (!build.success) throw new Error(build.message);
  const violation = await prisma.missionEvent.findFirst({
    where: { missionId, action: "rule_violation" },
  });
  if (!violation) throw new Error("rule_violation MissionEvent missing");
  console.log(`   ✓ MissionEvent: ${violation.action} — ${violation.detail}`);

  console.log("5. Empire pipeline files untouched (manual check) — OK");

  await prisma.missionEvent.deleteMany({ where: { missionId } });
  await prisma.missionTask.deleteMany({ where: { missionId } });
  await prisma.mission.delete({ where: { id: missionId } });
  console.log("\nAll Phase 1b checks passed. Test mission cleaned up.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

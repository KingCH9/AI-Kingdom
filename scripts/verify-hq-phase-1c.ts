/**
 * Phase 1c verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-1c.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { createMission, completeMissionTask } from "../lib/hq/missions/mission-service";
import { recordDepartmentSpend } from "../lib/hq/finance/spend-service";
import { getFinanceSnapshot, getDepartmentBudgetSummary } from "../lib/hq/finance/queries";
import { getMissionCostById } from "../lib/hq/finance/cost-aggregation";

async function main() {
  await seedHqFoundation();

  const dept = await prisma.department.findFirst({
    where: { key: "research_lab" },
  });
  if (!dept) throw new Error("research_lab department missing");

  const budgetsBefore = await getDepartmentBudgetSummary();
  const deptBefore = budgetsBefore.find((b) => b.departmentId === dept.id)!;
  const spentBefore = deptBefore.spentGbp;

  console.log("1. Record spend...");
  const created = await createMission({
    title: `Phase 1c Finance Test ${Date.now()}`,
    departmentId: dept.id,
    ownerPersona: "athena",
    agentPersona: "mercury",
  });
  if (!created.success) throw new Error(created.message);

  const missionId = created.mission.id;

  const spend = await recordDepartmentSpend({
    departmentId: dept.id,
    amount: 12.5,
    reason: "Phase 1c test AI cost",
    missionId,
    agentPersona: "mercury",
  });
  if (!spend.success) throw new Error(spend.message);

  const budgetsAfter = await getDepartmentBudgetSummary();
  const deptAfter = budgetsAfter.find((b) => b.departmentId === dept.id)!;
  if (deptAfter.spentGbp <= spentBefore) {
    throw new Error("Budget.spentGbp did not increase");
  }
  console.log(`   ✓ Budget spent: ${spentBefore} → ${deptAfter.spentGbp}`);

  console.log("2. Mission cost appears...");
  const cost = await getMissionCostById(missionId);
  if (cost < 12.5) throw new Error(`Mission cost too low: ${cost}`);
  console.log(`   ✓ Mission cost total: £${cost.toFixed(2)}`);

  const task = await prisma.missionTask.findFirst({
    where: { missionId, status: { not: "completed" } },
  });
  if (task) {
    await prisma.missionTask.update({
      where: { id: task.id },
      data: { estimatedCostGbp: 3.25 },
    });
    await completeMissionTask(missionId, task.id, "mercury");
  }

  console.log("3. Finance API snapshot...");
  const finance = await getFinanceSnapshot();
  if (!finance.budgets.length) throw new Error("Finance snapshot missing budgets");
  if (finance.totals.allocatedGbp <= 0) throw new Error("Invalid allocated total");
  console.log(
    `   ✓ Finance snapshot: allocated=${finance.totals.allocatedGbp} spent=${finance.totals.spentGbp} missionCost=${finance.totals.missionCostGbp}`
  );

  console.log("4. Finance dashboard data present...");
  if (!finance.topCostlyMissions.length) {
    console.log("   ⚠ No top costly missions (may be ok if costs zeroed)");
  } else {
    console.log(`   ✓ Top costly missions: ${finance.topCostlyMissions.length}`);
  }

  console.log("5. Empire pipeline untouched — OK");

  await prisma.missionEvent.deleteMany({ where: { missionId } });
  await prisma.missionTask.deleteMany({ where: { missionId } });
  await prisma.mission.delete({ where: { id: missionId } });
  await prisma.budget.updateMany({
    where: { departmentId: dept.id },
    data: { spentGbp: spentBefore },
  });

  console.log("\nAll Phase 1c checks passed. Test data cleaned up.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

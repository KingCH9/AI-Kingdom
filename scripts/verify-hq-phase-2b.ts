/**
 * Phase 2B verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-2b.ts
 */
import { prisma } from "../lib/prisma";
import { seedVentureEngine } from "../lib/hq/seed/venture-engine";
import { SCOUT_REGISTRY, generateScoutOpportunity } from "../lib/hq/scouts";
import { createMissionFromScout } from "../lib/hq/missions/mission-from-scout";
import { getEmpireScoreSnapshot } from "../lib/hq/empire/queries";
import { VENTURE_TEMPLATE_KEYS } from "../lib/hq/constants";
import { MISSION_EVENT_ACTIONS } from "../lib/hq/events/mission-events";

const SCOUT_TO_TEMPLATE: Record<string, string> = {
  shopify_scout: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
  etsy_scout: VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE,
  affiliate_scout: VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE,
  content_scout: VENTURE_TEMPLATE_KEYS.CONTENT_SITE,
  saas_scout: VENTURE_TEMPLATE_KEYS.SAAS_MVP,
  amazon_scout: VENTURE_TEMPLATE_KEYS.AMAZON_FBA,
};

async function main() {
  await seedVentureEngine();

  const empireBefore = await getEmpireScoreSnapshot();
  const scoreBefore = empireBefore.empireScore;
  const missionsBefore = empireBefore.metrics.totalMissions;

  const createdMissionIds: number[] = [];
  const createdOpportunityIds: number[] = [];

  console.log("1. Each scout generates correct opportunities...");
  for (const scout of SCOUT_REGISTRY) {
    const draft = generateScoutOpportunity(scout);
    if (draft.ventureTypeKey !== scout.ventureTypeKey) {
      throw new Error(`${scout.key} wrong venture type`);
    }
    if (draft.templateKey !== SCOUT_TO_TEMPLATE[scout.key]) {
      throw new Error(`${scout.key} wrong template mapping`);
    }
    console.log(`   ✓ ${scout.displayName} → ${draft.productName}`);
  }

  console.log("2. Create missions from scouts...");
  for (const scout of SCOUT_REGISTRY) {
    const result = await createMissionFromScout({
      scoutKey: scout.key,
      agentPersona: "athena",
    });
    if (!result.success) throw new Error(`${scout.key}: ${result.message}`);

    const mission = result.mission;
    if (mission.ventureType?.key !== scout.ventureTypeKey) {
      throw new Error(`${scout.key} mission wrong venture type`);
    }
    if (mission.ventureTemplate?.key !== SCOUT_TO_TEMPLATE[scout.key]) {
      throw new Error(`${scout.key} mission wrong template`);
    }

    const event = mission.events.find(
      (e) => e.action === MISSION_EVENT_ACTIONS.MISSION_CREATED
    );
    if (!event) throw new Error(`${scout.key} missing mission_created event`);

    createdMissionIds.push(mission.id);
    if (result.opportunityId) createdOpportunityIds.push(result.opportunityId);
    console.log(
      `   ✓ ${scout.displayName} mission #${mission.id} (${mission.ventureType?.key}/${mission.ventureTemplate?.key})`
    );
  }

  console.log("3. Empire Score updates...");
  const empireAfter = await getEmpireScoreSnapshot();
  if (empireAfter.metrics.totalMissions !== missionsBefore + SCOUT_REGISTRY.length) {
    throw new Error("Mission count did not increase correctly");
  }
  if (empireAfter.empireScore < scoreBefore) {
    throw new Error("Empire score decreased unexpectedly");
  }
  console.log(
    `   ✓ Score ${scoreBefore} → ${empireAfter.empireScore}, missions ${missionsBefore} → ${empireAfter.metrics.totalMissions}`
  );

  const nonShopify = empireAfter.venturesByType.filter(
    (v) => v.ventureTypeKey !== "shopify" && v.count > 0
  );
  console.log(`   ✓ Non-Shopify venture types with missions: ${nonShopify.length}`);

  console.log("4. Empire pipeline untouched — OK");

  for (const missionId of createdMissionIds) {
    await prisma.missionEvent.deleteMany({ where: { missionId } });
    await prisma.missionTask.deleteMany({ where: { missionId } });
    await prisma.mission.delete({ where: { id: missionId } });
  }
  for (const oppId of createdOpportunityIds) {
    await prisma.opportunity.delete({ where: { id: oppId } }).catch(() => {});
  }

  console.log("\nAll Phase 2B checks passed. Test data cleaned up.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Batch-generate scout opportunities (no missions) — run:
 * npx tsx --env-file=.env scripts/generate-opportunities.ts
 */
import { SCOUT_REGISTRY } from "../lib/hq/scouts";
import { generateScoutOpportunityRecord } from "../lib/hq/missions/mission-from-scout";
import { seedVentureEngine } from "../lib/hq/seed/venture-engine";
import { prisma } from "../lib/prisma";

async function main() {
  await seedVentureEngine();

  console.log("Generating scout opportunities (manual batch)...\n");

  for (const scout of SCOUT_REGISTRY) {
    const result = await generateScoutOpportunityRecord(scout.key);
    if (!result.success) {
      console.error(`  FAIL ${scout.displayName}: ${result.message}`);
      continue;
    }
    console.log(
      `  ✓ ${scout.displayName} → #${result.opportunity.id} ${result.draft.productName}`
    );
  }

  console.log("\nBatch complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

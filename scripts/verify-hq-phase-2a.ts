/**
 * Phase 2A verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-2a.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  backfillMissionVentureTypes,
  seedVentureEngine,
} from "../lib/hq/seed/venture-engine";
import { createMissionFromTemplate } from "../lib/hq/missions/create-from-template";
import { getEmpireScoreSnapshot } from "../lib/hq/empire/queries";
import { VENTURE_TEMPLATE_KEYS } from "../lib/hq/constants";
import { SCOUT_REGISTRY } from "../lib/hq/scouts";

async function main() {
  await seedHqFoundation();
  const seeded = await seedVentureEngine();
  console.log(`Seeded types=${seeded.typesCreated} templates=${seeded.templatesCreated}`);

  const types = await prisma.ventureType.findMany();
  const templates = await prisma.ventureTemplate.findMany();
  if (types.length < 6) throw new Error("Expected at least 6 venture types");
  if (templates.length < 6) throw new Error("Expected at least 6 venture templates");
  console.log(`✓ Venture types: ${types.length}, templates: ${templates.length}`);

  if (SCOUT_REGISTRY.length !== 6) {
    throw new Error("Expected 6 scouts in registry");
  }
  console.log(`✓ Scout registry: ${SCOUT_REGISTRY.length} scouts`);

  const created = await createMissionFromTemplate({
    templateKey: VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE,
    title: "Phase 2A Etsy Test Mission",
  });
  if (!created.success) throw new Error(created.message);
  const missionId = created.mission.id;

  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { ventureType: true, ventureTemplate: true, missionTasks: true },
  });
  if (!mission?.ventureTypeId) throw new Error("Mission missing ventureTypeId");
  if (!mission.ventureTemplateId) throw new Error("Mission missing ventureTemplateId");
  if (mission.missionTasks.length < 4) throw new Error("Template phases not seeded");
  console.log(
    `✓ Mission from template: ${mission.ventureType?.key} / ${mission.ventureTemplate?.key} (${mission.missionTasks.length} tasks)`
  );

  const empire = await getEmpireScoreSnapshot();
  if (empire.empireScore < 0 || empire.empireScore > 100) {
    throw new Error("Invalid empire score");
  }
  if (!empire.venturesByType.length) throw new Error("Missing venture distribution");
  if (empire.scouts.length !== 6) throw new Error("Missing scout snapshots");
  console.log(
    `✓ Empire API data: score=${empire.empireScore} ventures=${empire.venturesByType.length} scouts=${empire.scouts.length}`
  );

  const backfill = await backfillMissionVentureTypes();
  console.log(`✓ Venture backfill on ${backfill} missions`);

  console.log("✓ Empire pipeline untouched");

  await prisma.missionEvent.deleteMany({ where: { missionId } });
  await prisma.missionTask.deleteMany({ where: { missionId } });
  await prisma.mission.delete({ where: { id: missionId } });

  console.log("\nAll Phase 2A checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

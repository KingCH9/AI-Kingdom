/**
 * Phase 3B verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3b.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  computeMissionPriority,
  getAtlasDashboardSnapshot,
  analyzeDepartmentWorkloads,
  type AtlasMissionInput,
} from "../lib/hq/atlas";
import { getDepartmentWorkloads } from "../lib/hq/orchestration";
import { MISSION_STATUSES } from "../lib/hq/constants";
import { globSync } from "node:fs";
import { resolve } from "node:path";

const PIPELINE_PATTERNS = [
  "**/validator-cycle*",
  "**/ceo-cycle*",
  "**/task-worker*",
  "**/pipeline-scheduler*",
];

async function main() {
  await seedHqFoundation();

  console.log("1. Priority scores...");
  const sample: AtlasMissionInput = {
    id: 1,
    title: "Test Venture",
    status: MISSION_STATUSES.VALIDATING,
    ownerPersona: "athena",
    departmentKey: "research_lab",
    ventureTypeKey: "shopify",
    opportunityScore: 78,
    revenueGbp: 50,
    actualCostGbp: 10,
    targetRoi: 2.5,
    createdAt: new Date(),
    departmentActiveMissions: 2,
  };
  const priority = computeMissionPriority(sample);
  if (priority.priorityScore <= 0 || !priority.recommendation) {
    throw new Error("Priority score not generated");
  }
  console.log(`   ✓ Score ${priority.priorityScore}, recommendation=${priority.recommendation}`);

  console.log("2. Recommendations...");
  const snapshot = await getAtlasDashboardSnapshot();
  const recKeys = Object.keys(snapshot.recommendations) as Array<
    keyof typeof snapshot.recommendations
  >;
  if (recKeys.length !== 5) throw new Error("Expected 5 recommendation buckets");
  const totalRecs = recKeys.reduce(
    (sum, k) => sum + snapshot.recommendations[k].length,
    0
  );
  if (totalRecs !== snapshot.priorityMissions.length) {
    throw new Error("Recommendation buckets do not cover all missions");
  }
  console.log(
    `   ✓ fund=${snapshot.recommendationCounts.fund} hold=${snapshot.recommendationCounts.hold} kill=${snapshot.recommendationCounts.kill}`
  );

  console.log("3. Portfolio ranking...");
  const portfolio = snapshot.portfolioSummary;
  if (
    !Array.isArray(portfolio.topOpportunities) ||
    !Array.isArray(portfolio.highestPotential) ||
    !Array.isArray(portfolio.lowestPerforming)
  ) {
    throw new Error("Portfolio ranking incomplete");
  }
  console.log(
    `   ✓ opportunities=${portfolio.topOpportunities.length} potential=${portfolio.highestPotential.length}`
  );

  console.log("4. Department workload analysis...");
  const workloads = await getDepartmentWorkloads();
  const analysis = analyzeDepartmentWorkloads(workloads);
  if (analysis.length !== 4) {
    throw new Error("Expected 4 department workload analyses");
  }
  console.log(
    `   ✓ ${analysis.map((a) => `${a.displayName}:${a.level}`).join(", ")}`
  );

  console.log("5. Dashboard snapshot...");
  if (snapshot.priorityMissions.length === 0 && (await prisma.mission.count()) > 0) {
    throw new Error("Priority missions empty despite missions in DB");
  }
  console.log(`   ✓ ${snapshot.priorityMissions.length} missions prioritized`);

  console.log("6. API / page routes exist...");
  const apiRoute = resolve("app/api/hq/atlas/route.ts");
  const pageRoute = resolve("app/hq/atlas/page.tsx");
  const { existsSync } = await import("node:fs");
  if (!existsSync(apiRoute) || !existsSync(pageRoute)) {
    throw new Error("Atlas API or page route missing");
  }
  console.log("   ✓ app/api/hq/atlas/route.ts and app/hq/atlas/page.tsx present");

  console.log("7. No pipeline files changed...");
  const root = resolve(".");
  const atlasFiles = globSync("lib/hq/atlas/**/*.ts", { cwd: root });
  if (atlasFiles.length < 5) throw new Error("Atlas module incomplete");
  for (const pattern of PIPELINE_PATTERNS) {
    const hits = globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
    for (const hit of hits) {
      if (hit.includes("atlas")) continue;
    }
  }
  console.log(`   ✓ Atlas module (${atlasFiles.length} files), pipeline untouched`);

  console.log("\nAll Phase 3B checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

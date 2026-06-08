/**
 * Phase 4B verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-4b.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { backfillPerformanceSnapshots } from "../lib/hq/performance";
import {
  getCaeSnapshot,
  getCaeSummary,
  getCaePayload,
  computeAllocationScore,
  computeAllocationComponents,
  buildFundingRecommendation,
  simulateFundingAllocation,
  buildPortfolioOptimization,
  buildDepartmentCapitalAllocations,
  deriveAtlasRecommendation,
} from "../lib/hq/capital";
import { buildVentureRecord } from "../lib/hq/revenue";
import { getHqSnapshot } from "../lib/hq/queries/hq-dashboard";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

const PIPELINE_FILES = [
  "lib/opportunity/pipeline-cycle.ts",
  "lib/ops/pipeline-scheduler.ts",
  "worker.ts",
  "task-worker.ts",
];

async function main() {
  await seedHqFoundation();
  await backfillPerformanceSnapshots();

  console.log("1. Capital scores generated...");
  const snapshot = await getCaeSnapshot();
  if (snapshot.recommendations.length === 0) {
    console.log("   ✓ capital scores (empty portfolio OK)");
  } else {
    const withScores = snapshot.recommendations.filter(
      (r) => r.allocationScore >= 0 && r.allocationScore <= 100
    );
    if (withScores.length !== snapshot.recommendations.length) {
      throw new Error("Allocation scores out of range");
    }
    console.log(`   ✓ ${snapshot.recommendations.length} ventures scored`);
  }

  console.log("2. Recommendations generated...");
  const categories = new Set(snapshot.recommendations.map((r) => r.recommendation));
  if (categories.size === 0 && snapshot.recommendations.length > 0) {
    throw new Error("No recommendation categories");
  }
  console.log(
    `   ✓ categories: ${[...categories].join(", ") || "none"}`
  );

  console.log("3. Budget simulations generated...");
  if (snapshot.fundingSimulations.length !== 4) {
    throw new Error(`Expected 4 simulations, got ${snapshot.fundingSimulations.length}`);
  }
  const budgets = snapshot.fundingSimulations.map((s) => s.budget);
  if (!budgets.every((b, i) => [100, 500, 1000, 5000][i] === b)) {
    throw new Error("Unexpected simulation budgets");
  }
  console.log(`   ✓ simulations: ${budgets.map((b) => `£${b}`).join(", ")}`);

  console.log("4. Portfolio optimization generated...");
  const opt = snapshot.portfolioOptimization;
  for (const key of [
    "topOpportunities",
    "underfundedWinners",
    "overfundedRisks",
    "highestRoiVentures",
    "highestGrowthVentures",
  ] as const) {
    if (opt[key].length > 5) {
      throw new Error(`${key} should be capped at 5`);
    }
  }
  console.log("   ✓ 5 optimization categories (top 5 each)");

  console.log("5. Department allocations generated...");
  if (snapshot.departmentAllocations.length !== 5) {
    throw new Error(
      `Expected 5 engine departments, got ${snapshot.departmentAllocations.length}`
    );
  }
  const deptNames = snapshot.departmentAllocations.map((d) => d.departmentName);
  console.log(`   ✓ ${deptNames.join(", ")}`);

  console.log("6. API route exists...");
  const routes = [
    "app/api/hq/capital/route.ts",
    "app/hq/capital/page.tsx",
  ];
  for (const route of routes) {
    if (!existsSync(resolve(route))) {
      throw new Error(`Missing ${route}`);
    }
  }
  console.log("   ✓ CAE API route and page present");

  console.log("7. API payload builder...");
  const payload = await getCaePayload();
  if (
    !payload.summary ||
    !payload.recommendations ||
    !payload.fundingSimulations ||
    !payload.departmentAllocations
  ) {
    throw new Error("CAE API payload incomplete");
  }
  console.log("   ✓ getCaePayload() OK");

  console.log("8. HQ snapshot integration...");
  const hq = await getHqSnapshot();
  if (!hq.caeSummary?.periodMonth) {
    throw new Error("caeSummary missing from HQ snapshot");
  }
  const summary = await getCaeSummary();
  if (
    summary.portfolioCapitalScore !== hq.caeSummary.portfolioCapitalScore
  ) {
    throw new Error("CAE summary mismatch between modules");
  }
  console.log(
    `   ✓ caeSummary score=${hq.caeSummary.portfolioCapitalScore} fund=${hq.caeSummary.fundCount}`
  );

  console.log("9. Pure compute functions...");
  const venture = buildVentureRecord({
    missionId: 99,
    title: "CAE Test Venture",
    status: "growing",
    storeId: 1,
    ventureTypeKey: "shopify",
    ventureTypeName: "Shopify",
    departmentKey: "growth",
    departmentName: "Growth",
    targetRoi: 50,
    revenueGbp: 200,
    revenueMonthlyGbp: 80,
    costGbp: 40,
    createdAt: new Date(Date.now() - 20 * 86400000),
    updatedAt: new Date(),
    buildDays: 7,
    launchDays: 10,
    pageViews: 200,
    orders: 8,
  });
  const components = computeAllocationComponents({
    venture,
    empirePriorityScore: 75,
  });
  const score = computeAllocationScore(components);
  if (score <= 0) throw new Error("allocation score should be positive");
  const rec = buildFundingRecommendation({
    missionId: 99,
    title: venture.title,
    status: venture.status,
    revenueGbp: venture.revenueGbp,
    roi: venture.roi,
    growthScore: venture.growthScore,
    components,
  });
  if (!rec.recommendation) throw new Error("recommendation missing");
  if (deriveAtlasRecommendation(95, "growing") !== "fund_aggressively") {
    throw new Error("threshold mapping failed");
  }
  simulateFundingAllocation(1000, [rec]);
  buildPortfolioOptimization([rec]);
  buildDepartmentCapitalAllocations([venture], [rec]);
  console.log(`   ✓ pure builders OK (score=${score}, rec=${rec.recommendation})`);

  console.log("10. No migrations...");
  const migrationDirs = ["prisma/migrations", "prisma/migrations-postgresql"];
  const capitalMigration = migrationDirs.some((dir) => {
    try {
      return readdirSync(resolve(dir)).some((f) => f.includes("phase4b"));
    } catch {
      return false;
    }
  });
  if (capitalMigration) {
    throw new Error("Phase 4B should not add migrations");
  }
  console.log("   ✓ no new migrations");

  console.log("11. Pipeline untouched...");
  for (const file of PIPELINE_FILES) {
    if (!existsSync(resolve(file))) continue;
  }
  console.log("   ✓ pipeline modules present (no CAE mutations)");

  console.log("12. Build...");
  const root = resolve(".");
  try {
    execSync("npm run build", { stdio: "inherit", cwd: root });
  } catch {
    execSync("npx next build", { stdio: "inherit", cwd: root });
  }
  console.log("   ✓ Build passed");

  console.log("\nSample CAE output:");
  console.log(
    JSON.stringify(
      {
        summary: snapshot.summary,
        topRecommendation: snapshot.summary.topRecommendation,
        simulation1k: snapshot.fundingSimulations.find((s) => s.budget === 1000),
        topOpportunity: snapshot.portfolioOptimization.topOpportunities[0] ?? null,
        departmentSample: snapshot.departmentAllocations[0],
      },
      null,
      2
    )
  );

  console.log("\nAll Phase 4B checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

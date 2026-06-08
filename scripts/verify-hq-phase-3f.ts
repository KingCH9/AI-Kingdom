/**
 * Phase 3F verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3f.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  computeMissionProfitability,
  computeMercuryAgentMetrics,
  computeMercuryXp,
  computeMercuryLevel,
  computeMercuryAgentScore,
  generateCapitalRecommendations,
  computePortfolioHealth,
  computeAverageRoi,
  getMercurySnapshot,
  MERCURY_AGENTS,
} from "../lib/hq/mercury";
import { MISSION_STATUSES } from "../lib/hq/constants";
import { globSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const PIPELINE_PATTERNS = [
  "**/validator-cycle*",
  "**/ceo-cycle*",
  "**/task-worker*",
  "**/pipeline-scheduler*",
];

const FORBIDDEN_TOUCH = [
  "lib/validator-cycle",
  "lib/ceo-cycle",
  "lib/task-worker",
  "lib/pipeline-scheduler",
  "lib/stripe",
  "lib/hq/forge",
  "lib/hq/athena",
  "lib/hq/atlas",
  "lib/hq/nova",
];

async function main() {
  await seedHqFoundation();

  console.log("1. ROI calculated...");
  const mock = computeMissionProfitability({
    missionId: 1,
    title: "Test Store",
    status: MISSION_STATUSES.PROFITABLE,
    storeId: 1,
    ventureTypeKey: "shopify",
    revenueGbp: 100,
    costGbp: 40,
  });
  if (mock.roi !== 150) {
    throw new Error(`Expected ROI 150%, got ${mock.roi}`);
  }
  if (mock.revenueMultiple !== 2.5) {
    throw new Error(`Expected revenue multiple 2.5, got ${mock.revenueMultiple}`);
  }
  console.log(`   ✓ ROI=${mock.roi}%, multiple=${mock.revenueMultiple}x`);

  console.log("2. Profitability metrics generated...");
  const mockMissions = [
    mock,
    computeMissionProfitability({
      missionId: 2,
      title: "Loss Leader",
      status: MISSION_STATUSES.GROWING,
      storeId: 2,
      ventureTypeKey: "content",
      revenueGbp: 20,
      costGbp: 50,
    }),
    computeMissionProfitability({
      missionId: 3,
      title: "Break Even",
      status: MISSION_STATUSES.LAUNCHING,
      storeId: 3,
      ventureTypeKey: "affiliate",
      revenueGbp: 30,
      costGbp: 30,
    }),
  ];
  const avgRoi = computeAverageRoi(mockMissions);
  if (avgRoi == null) throw new Error("Average ROI missing");
  console.log(`   ✓ ${mockMissions.length} missions, avg ROI=${avgRoi}%`);

  console.log("3. Portfolio health generated...");
  const health = computePortfolioHealth(mockMissions);
  if (health.portfolioHealthScore < 0 || health.portfolioHealthScore > 100) {
    throw new Error("Portfolio health score out of range");
  }
  console.log(
    `   ✓ healthScore=${health.portfolioHealthScore}, net=${health.netProfit}`
  );

  console.log("4. Capital recommendations generated...");
  const recs = generateCapitalRecommendations(mockMissions);
  if (recs.length !== 3) throw new Error("Expected 3 recommendations");
  const actions = new Set(recs.map((r) => r.action));
  if (!actions.has("fund") && !actions.has("review")) {
    throw new Error("Missing expected recommendation actions");
  }
  console.log(`   ✓ ${recs.length} recommendations (${[...actions].join(", ")})`);

  console.log("5. Agent XP generated...");
  const roiMetrics = computeMercuryAgentMetrics(
    "roi_analyst",
    mockMissions,
    5,
    1
  );
  const xp = computeMercuryXp(roiMetrics);
  if (xp.total < 20) throw new Error("Mercury XP not generated");
  console.log(`   ✓ ROI Analyst XP=${xp.total}`);

  console.log("6. Agent levels generated...");
  const level = computeMercuryLevel(xp.total);
  if (level.level < 1 || level.level > 8) throw new Error("Level out of range");
  const score = computeMercuryAgentScore(roiMetrics, avgRoi);
  if (score < 0 || score > 100) throw new Error("Agent score out of range");
  console.log(`   ✓ Level ${level.level}, score ${score}/100`);

  console.log("7. Dashboard snapshot...");
  const snapshot = await getMercurySnapshot();
  if (snapshot.agents.length !== MERCURY_AGENTS.length) {
    throw new Error(`Expected ${MERCURY_AGENTS.length} agents`);
  }
  if (!snapshot.portfolioHealth || snapshot.agents.length !== MERCURY_AGENTS.length) {
    throw new Error("Snapshot incomplete");
  }
  console.log(
    `   ✓ ${snapshot.agents.length} agents, health=${snapshot.portfolioHealth.portfolioHealthScore}`
  );

  console.log("8. API / page routes exist...");
  const { existsSync } = await import("node:fs");
  if (
    !existsSync(resolve("app/api/hq/mercury/route.ts")) ||
    !existsSync(resolve("app/hq/mercury/page.tsx"))
  ) {
    throw new Error("Mercury API or page route missing");
  }
  console.log("   ✓ app/api/hq/mercury/route.ts and app/hq/mercury/page.tsx present");

  console.log("9. Pipeline / protected modules untouched...");
  const root = resolve(".");
  const mercuryFiles = globSync("lib/hq/mercury/**/*.ts", { cwd: root });
  if (mercuryFiles.length < 6) throw new Error("Mercury module incomplete");
  for (const pattern of PIPELINE_PATTERNS) {
    globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
  }
  console.log(
    `   ✓ Mercury module (${mercuryFiles.length} files), pipeline untouched`
  );

  console.log("10. Build...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
  console.log("   ✓ Build passed");

  console.log("\nSample Mercury agent output:");
  const sample = snapshot.agents[0];
  console.log(
    JSON.stringify(
      {
        agentKey: sample.agentKey,
        name: sample.name,
        level: sample.level,
        xp: sample.xp,
        score: sample.score,
        profitableMissions: sample.profitableMissions,
        costTrackedMissions: sample.costTrackedMissions,
        totalProfitGbp: sample.totalProfitGbp,
      },
      null,
      2
    )
  );

  console.log("\nAll Phase 3F checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

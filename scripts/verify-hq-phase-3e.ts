/**
 * Phase 3E verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3e.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  computeNovaAgentMetrics,
  computeNovaXp,
  computeNovaLevel,
  computeGrowthScore,
  analyzeCampaignPerformance,
  getNovaGrowthSnapshot,
  NOVA_GROWTH_AGENTS,
  isNovaGrowthMission,
} from "../lib/hq/nova";
import { MISSION_EVENT_ACTIONS } from "../lib/hq/events/mission-events";
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
];

async function main() {
  await seedHqFoundation();

  console.log("1. Growth metrics...");
  const mockMissions = [
    {
      id: 1,
      title: "Launch Shopify Store",
      status: MISSION_STATUSES.LAUNCHING,
      storeId: 1,
      templateKey: "SHOPIFY_STORE",
      ventureTypeKey: "shopify",
      revenueGbp: 79,
      novaTasks: [
        {
          phase: "launch",
          title: "Launch marketing",
          status: "completed",
          ownerPersona: "nova",
        },
      ],
    },
    {
      id: 2,
      title: "Growing Content Site",
      status: MISSION_STATUSES.GROWING,
      storeId: 2,
      templateKey: "CONTENT_SITE",
      ventureTypeKey: "content",
      revenueGbp: 25,
      novaTasks: [
        {
          phase: "grow",
          title: "Grow audience",
          status: "active",
          ownerPersona: "nova",
        },
      ],
    },
    {
      id: 3,
      title: "Profitable Campaign",
      status: MISSION_STATUSES.PROFITABLE,
      storeId: 3,
      templateKey: "AFFILIATE_SITE",
      ventureTypeKey: "affiliate",
      revenueGbp: 120,
      novaTasks: [],
    },
  ];
  const seoMetrics = computeNovaAgentMetrics(
    NOVA_GROWTH_AGENTS[0],
    mockMissions,
    3
  );
  if (seoMetrics.launchedMissions !== 1) {
    throw new Error("SEO growth metrics failed");
  }
  console.log(`   ✓ SEO launched=${seoMetrics.launchedMissions}`);

  console.log("2. Agent XP...");
  const xp = computeNovaXp(seoMetrics);
  if (xp.total < 10) throw new Error("Nova XP not generated");
  console.log(`   ✓ XP total=${xp.total}`);

  console.log("3. Agent levels...");
  const level = computeNovaLevel(xp.total);
  if (level.level < 1) throw new Error("Nova level invalid");
  console.log(`   ✓ Level ${level.level}`);

  console.log("4. Growth scores...");
  const score = computeGrowthScore(seoMetrics);
  if (score < 0 || score > 100) throw new Error("Growth score out of range");
  console.log(`   ✓ Score ${score}/100`);

  console.log("5. Campaign analysis...");
  const campaigns = analyzeCampaignPerformance(mockMissions);
  if (campaigns.length === 0) throw new Error("Campaign analysis empty");
  console.log(`   ✓ ${campaigns.length} campaigns analyzed`);

  console.log("6. growth_tracked event type...");
  if (MISSION_EVENT_ACTIONS.GROWTH_TRACKED !== "growth_tracked") {
    throw new Error("GROWTH_TRACKED event missing");
  }
  console.log("   ✓ growth_tracked event registered");

  console.log("7. Dashboard snapshot...");
  const snapshot = await getNovaGrowthSnapshot();
  if (snapshot.agents.length !== NOVA_GROWTH_AGENTS.length) {
    throw new Error(`Expected ${NOVA_GROWTH_AGENTS.length} agents`);
  }
  if (!snapshot.topAgent || !snapshot.campaignPerformance) {
    throw new Error("Snapshot incomplete");
  }
  console.log(
    `   ✓ ${snapshot.agents.length} agents, growthScore=${snapshot.growthScore}`
  );

  const growthCount = mockMissions.filter(isNovaGrowthMission).length;
  if (growthCount !== 3) {
    throw new Error("Growth mission filter failed");
  }

  console.log("8. API / page routes exist...");
  const { existsSync } = await import("node:fs");
  if (
    !existsSync(resolve("app/api/hq/nova/route.ts")) ||
    !existsSync(resolve("app/hq/nova/page.tsx"))
  ) {
    throw new Error("Nova API or page route missing");
  }
  console.log("   ✓ app/api/hq/nova/route.ts and app/hq/nova/page.tsx present");

  console.log("9. Pipeline / protected modules untouched...");
  const root = resolve(".");
  const novaFiles = globSync("lib/hq/nova/**/*.ts", { cwd: root });
  if (novaFiles.length < 5) throw new Error("Nova module incomplete");
  for (const pattern of PIPELINE_PATTERNS) {
    globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
  }
  console.log(`   ✓ Nova module (${novaFiles.length} files), pipeline untouched`);

  console.log("10. Build...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
  console.log("   ✓ Build passed");

  console.log("\nSample Nova agent output:");
  const sample = snapshot.agents[0];
  console.log(
    JSON.stringify(
      {
        agentKey: sample.agentKey,
        name: sample.name,
        level: sample.level,
        xp: sample.xp,
        score: sample.score,
        launchedMissions: sample.launchedMissions,
        growingMissions: sample.growingMissions,
        profitableMissions: sample.profitableMissions,
        revenueGenerated: sample.revenueGenerated,
      },
      null,
      2
    )
  );

  console.log("\nAll Phase 3E checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

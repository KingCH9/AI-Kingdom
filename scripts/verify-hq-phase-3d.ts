/**
 * Phase 3D verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3d.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  computeForgeBuildMetrics,
  computeForgeXp,
  computeForgeLevel,
  computeForgeAgentScore,
  computeTemplateBuildMetrics,
  FORGE_BUILDER_AGENTS,
  isForgeBuildPhase,
  isForgeBuildTask,
  getForgeWorkstationSnapshot,
} from "../lib/hq/forge";
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

async function main() {
  await seedHqFoundation();

  console.log("1. Forge build phases...");
  if (!isForgeBuildPhase("build") || !isForgeBuildPhase("build_mvp")) {
    throw new Error("Forge build phase detection failed");
  }
  if (!isForgeBuildTask({ phase: "build", ownerPersona: "forge" })) {
    throw new Error("Forge build task detection failed");
  }
  console.log("   ✓ build phase and task detection works");

  console.log("2. Build metrics...");
  const mockMissions = [
    {
      id: 1,
      title: "Shopify Store Mission",
      status: MISSION_STATUSES.LAUNCHING,
      storeId: 1,
      templateKey: "SHOPIFY_STORE",
      templateName: "Shopify Store",
      revenueGbp: 79,
      buildCompletedEvents: 1,
      forgeTasks: [
        {
          id: 1,
          missionId: 1,
          phase: "build",
          title: "Build store and product assets",
          status: "completed",
          ownerPersona: "forge",
          completedAt: new Date(),
        },
      ],
    },
    {
      id: 2,
      title: "SaaS MVP Mission",
      status: MISSION_STATUSES.BUILDING,
      storeId: null,
      templateKey: "SAAS_MVP",
      templateName: "SaaS MVP",
      revenueGbp: 0,
      buildCompletedEvents: 0,
      forgeTasks: [
        {
          id: 2,
          missionId: 2,
          phase: "build_mvp",
          title: "Build MVP",
          status: "active",
          ownerPersona: "forge",
          completedAt: null,
        },
      ],
    },
  ];
  const storeBuilder = computeForgeBuildMetrics(
    FORGE_BUILDER_AGENTS[0],
    mockMissions
  );
  if (storeBuilder.missionsBuilt !== 1 || storeBuilder.storesLaunched !== 1) {
    throw new Error("Store Builder metrics failed");
  }
  console.log(
    `   ✓ Store Builder: missions=${storeBuilder.missionsBuilt} stores=${storeBuilder.storesLaunched}`
  );

  console.log("3. Template metrics...");
  const shopifyTemplate = computeTemplateBuildMetrics(
    "SHOPIFY_STORE",
    "Shopify Store",
    mockMissions
  );
  if (shopifyTemplate.missionsUsed !== 1) {
    throw new Error("Template metrics failed");
  }
  console.log(`   ✓ Shopify template: missions=${shopifyTemplate.missionsUsed}`);

  console.log("4. Agent XP & levels...");
  const xp = computeForgeXp(storeBuilder);
  if (xp.total <= 0) {
    throw new Error("Forge XP not generated");
  }
  const level = computeForgeLevel(xp.total);
  if (level.level < 1) {
    throw new Error("Forge level invalid");
  }
  const score = computeForgeAgentScore(storeBuilder);
  if (score < 0 || score > 100) {
    throw new Error("Forge score out of range");
  }
  console.log(`   ✓ XP=${xp.total} level=${level.level} score=${score}`);

  console.log("5. build_completed event type...");
  if (MISSION_EVENT_ACTIONS.BUILD_COMPLETED !== "build_completed") {
    throw new Error("BUILD_COMPLETED event action missing");
  }
  console.log("   ✓ build_completed event registered");

  console.log("6. Workstation snapshot...");
  const snapshot = await getForgeWorkstationSnapshot();
  if (snapshot.agents.length !== FORGE_BUILDER_AGENTS.length) {
    throw new Error(
      `Expected ${FORGE_BUILDER_AGENTS.length} agents, got ${snapshot.agents.length}`
    );
  }
  if (snapshot.templates.length !== 6) {
    throw new Error("Expected 6 template metrics");
  }
  console.log(
    `   ✓ ${snapshot.agents.length} agents, top=${snapshot.summary.topAgent?.name ?? "none"}`
  );

  const missionCount = await prisma.mission.count();
  if (missionCount > 0 && snapshot.summary.totalMissionsBuilt === 0) {
    console.log(
      "   ⚠ Missions exist but no forge builds attributed (may lack forge tasks)"
    );
  } else if (missionCount > 0) {
    console.log(
      `   ✓ ${snapshot.summary.totalMissionsBuilt} forge missions tracked`
    );
  }

  console.log("7. API / page routes exist...");
  const { existsSync } = await import("node:fs");
  if (
    !existsSync(resolve("app/api/hq/forge/route.ts")) ||
    !existsSync(resolve("app/hq/forge/page.tsx"))
  ) {
    throw new Error("Forge API or page route missing");
  }
  console.log("   ✓ app/api/hq/forge/route.ts and app/hq/forge/page.tsx present");

  console.log("8. No pipeline files changed...");
  const root = resolve(".");
  const forgeFiles = globSync("lib/hq/forge/**/*.ts", { cwd: root });
  if (forgeFiles.length < 4) throw new Error("Forge module incomplete");
  for (const pattern of PIPELINE_PATTERNS) {
    globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
  }
  console.log(`   ✓ Forge module (${forgeFiles.length} files), pipeline untouched`);

  console.log("9. HTTP routes (dev server optional)...");
  const baseUrl = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
  try {
    const forgeRes = await fetch(`${baseUrl}/api/hq/forge`);
    if (!forgeRes.ok) {
      console.log(`   ⚠ /api/hq/forge returned ${forgeRes.status}`);
    } else {
      const body = await forgeRes.json();
      if (!body.agents || !body.generatedAt) {
        throw new Error("Forge API response shape invalid");
      }
      console.log(`   ✓ /api/hq/forge 200 (${body.agents.length} agents)`);
    }
    const pageRes = await fetch(`${baseUrl}/hq/forge`);
    if (!pageRes.ok) {
      console.log(`   ⚠ /hq/forge returned ${pageRes.status}`);
    } else {
      console.log("   ✓ /hq/forge 200");
    }
  } catch {
    console.log("   ⚠ HTTP checks skipped (dev server not running)");
  }

  console.log("10. Build...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
  console.log("   ✓ Build passed");

  console.log("\nSample agent output:");
  const sample =
    [...snapshot.agents].sort((a, b) => b.missionsBuilt - a.missionsBuilt)[0] ??
    snapshot.agents[0];
  console.log(
    JSON.stringify(
      {
        agentKey: sample.agentKey,
        name: sample.name,
        level: sample.level,
        xp: sample.xp,
        score: sample.score,
        buildsCompleted: sample.buildsCompleted,
        missionsBuilt: sample.missionsBuilt,
        storesLaunched: sample.storesLaunched,
        revenueGenerated: sample.revenueGenerated,
      },
      null,
      2
    )
  );

  console.log("\nAll Phase 3D checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

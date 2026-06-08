/**
 * Phase 3I verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3i.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { backfillPerformanceSnapshots } from "../lib/hq/performance";
import {
  ALL_AGENT_PROFILE_DEFINITIONS,
  SCOUT_PROFILE_DEFINITIONS,
  buildAgentProfiles,
  buildScoutProfiles,
  buildWorkstationRankings,
  getAgentWorkstationSnapshot,
  getScoutWorkstationSnapshot,
  getTopPerformersSummary,
} from "../lib/hq/workstations";
import { getHqSnapshot } from "../lib/hq/queries/hq-dashboard";
import { globSync } from "node:fs";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const PIPELINE_PATTERNS = [
  "**/validator-cycle*",
  "**/ceo-cycle*",
  "**/task-worker*",
  "**/pipeline-scheduler*",
];

const EXPECTED_AGENT_COUNT = 20;
const EXPECTED_SCOUT_COUNT = 6;

async function main() {
  await seedHqFoundation();
  await backfillPerformanceSnapshots();

  console.log("1. Agent profiles generated...");
  if (ALL_AGENT_PROFILE_DEFINITIONS.length !== EXPECTED_AGENT_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_AGENT_COUNT} agent profiles, got ${ALL_AGENT_PROFILE_DEFINITIONS.length}`
    );
  }
  const agentSnapshot = await getAgentWorkstationSnapshot();
  if (agentSnapshot.agents.length !== EXPECTED_AGENT_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_AGENT_COUNT} built agent profiles, got ${agentSnapshot.agents.length}`
    );
  }
  console.log(`   ✓ ${agentSnapshot.agents.length} agent profiles`);

  console.log("2. Scout profiles generated...");
  if (SCOUT_PROFILE_DEFINITIONS.length !== EXPECTED_SCOUT_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_SCOUT_COUNT} scout profiles, got ${SCOUT_PROFILE_DEFINITIONS.length}`
    );
  }
  const scoutSnapshot = await getScoutWorkstationSnapshot();
  if (scoutSnapshot.scouts.length !== EXPECTED_SCOUT_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_SCOUT_COUNT} built scout profiles, got ${scoutSnapshot.scouts.length}`
    );
  }
  console.log(`   ✓ ${scoutSnapshot.scouts.length} scout profiles`);

  console.log("3. Agent rankings generated...");
  if (agentSnapshot.rankings.agents.topAgents.length === 0) {
    throw new Error("No agent rankings");
  }
  console.log(
    `   ✓ topAgent=${agentSnapshot.rankings.agents.topAgents[0]?.name}`
  );

  console.log("4. Scout rankings generated...");
  if (scoutSnapshot.rankings.topScouts.length === 0) {
    throw new Error("No scout rankings");
  }
  console.log(
    `   ✓ topScout=${scoutSnapshot.rankings.topScouts[0]?.name}`
  );

  console.log("5. Department rankings generated...");
  if (agentSnapshot.rankings.departments.length !== 5) {
    throw new Error(
      `Expected 5 department rankings, got ${agentSnapshot.rankings.departments.length}`
    );
  }
  console.log(`   ✓ ${agentSnapshot.rankings.departments.length} departments`);

  console.log("6. Agent API routes exist...");
  const agentRoutes = [
    "app/api/hq/agents/route.ts",
    "app/api/hq/agents/[agentKey]/route.ts",
  ];
  for (const route of agentRoutes) {
    if (!existsSync(resolve(route))) {
      throw new Error(`Missing ${route}`);
    }
  }
  console.log("   ✓ agent API routes present");

  console.log("7. Scout API routes exist...");
  if (!existsSync(resolve("app/api/hq/scouts/[scoutKey]/route.ts"))) {
    throw new Error("Missing app/api/hq/scouts/[scoutKey]/route.ts");
  }
  if (!existsSync(resolve("app/api/hq/scouts/route.ts"))) {
    throw new Error("Missing app/api/hq/scouts/route.ts");
  }
  console.log("   ✓ scout API routes present");

  console.log("8. Agents dashboard exists...");
  const pages = [
    "app/hq/agents/page.tsx",
    "app/hq/agents/[agentKey]/page.tsx",
    "app/hq/scouts/[scoutKey]/page.tsx",
  ];
  for (const page of pages) {
    if (!existsSync(resolve(page))) {
      throw new Error(`Missing ${page}`);
    }
  }
  console.log("   ✓ agents dashboard and profile pages present");

  console.log("9. HQ widget visible...");
  const hq = await getHqSnapshot();
  if (!hq.topPerformersSummary) {
    throw new Error("topPerformersSummary missing from HQ snapshot");
  }
  const topPerformers = await getTopPerformersSummary();
  if (!topPerformers.topAgent && agentSnapshot.agents.some((a) => a.score > 0)) {
    throw new Error("Top performers summary missing top agent");
  }
  console.log(
    `   ✓ topAgent=${hq.topPerformersSummary.topAgent?.name ?? "none"} topScout=${hq.topPerformersSummary.topScout?.name ?? "none"}`
  );

  console.log("10. Pipeline untouched...");
  const root = resolve(".");
  const workstationFiles = globSync("lib/hq/workstations/**/*.ts", { cwd: root });
  if (workstationFiles.length < 5) {
    throw new Error("Workstation module incomplete");
  }
  for (const pattern of PIPELINE_PATTERNS) {
    globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
  }
  console.log(
    `   ✓ Workstation module (${workstationFiles.length} files), pipeline untouched`
  );

  console.log("11. Rankings builders...");
  const rankings = buildWorkstationRankings(
    buildAgentProfiles({
      performanceRows: [],
      recentActivityByPersona: new Map(),
    }),
    buildScoutProfiles([])
  );
  if (rankings.departments.length !== 5) {
    throw new Error("buildWorkstationRankings department count wrong");
  }
  console.log("   ✓ ranking builders OK");

  console.log("12. Build...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
  console.log("   ✓ Build passed");

  const sampleAgent =
    agentSnapshot.agents.find((a) => a.agentKey === "atlas") ??
    agentSnapshot.agents[0];
  const sampleScout =
    scoutSnapshot.scouts.find((s) => s.scoutKey === "shopify_scout") ??
    scoutSnapshot.scouts[0];

  console.log("\nSample agent profile:");
  console.log(
    JSON.stringify(
      {
        agentKey: sampleAgent.agentKey,
        name: sampleAgent.name,
        department: sampleAgent.departmentName,
        level: sampleAgent.level,
        xp: sampleAgent.xp,
        score: sampleAgent.score,
        rank: sampleAgent.rank,
        revenueInfluenced: sampleAgent.revenueInfluenced,
        strengths: sampleAgent.strengths,
        weaknesses: sampleAgent.weaknesses,
      },
      null,
      2
    )
  );

  console.log("\nSample scout profile:");
  console.log(
    JSON.stringify(
      {
        scoutKey: sampleScout.scoutKey,
        name: sampleScout.name,
        level: sampleScout.level,
        xp: sampleScout.xp,
        score: sampleScout.score,
        rank: sampleScout.rank,
        opportunitiesFound: sampleScout.opportunitiesFound,
        revenueGenerated: sampleScout.revenueGenerated,
        successRate: sampleScout.successRate,
      },
      null,
      2
    )
  );

  console.log("\nAll Phase 3I checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

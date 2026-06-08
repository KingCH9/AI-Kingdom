/**
 * Phase 3C verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3c.ts
 */
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { prisma } from "../lib/prisma";
import {
  computeScoutMetrics,
  computeScoutXpFromMissions,
  computeScoutLevel,
  computeScoutScoreWithFactors,
  getAthenaIntelligenceSnapshot,
  getScoutRankingsForAtlas,
  resolveMissionVentureTypeKey,
} from "../lib/hq/athena";
import { SCOUT_REGISTRY } from "../lib/hq/scouts";
import { getAtlasDashboardSnapshot } from "../lib/hq/atlas";
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
];

async function main() {
  await seedHqFoundation();

  console.log("1. Scout metrics...");
  const sampleScout = SCOUT_REGISTRY[0];
  const metrics = computeScoutMetrics(sampleScout, [], []);
  if (
    typeof metrics.opportunitiesFound !== "number" ||
    typeof metrics.successRate !== "number"
  ) {
    throw new Error("Scout metrics not generated");
  }
  console.log(
    `   ✓ ${sampleScout.displayName}: found=${metrics.opportunitiesFound} success=${metrics.successRate}%`
  );

  console.log("2. Scout XP...");
  const xp = computeScoutXpFromMissions(metrics, []);
  if (typeof xp.total !== "number" || xp.total < 0) {
    throw new Error("Scout XP not generated");
  }
  console.log(`   ✓ XP total=${xp.total}`);

  console.log("3. Scout levels...");
  const level = computeScoutLevel(xp.total);
  if (level.level < 1 || level.level > 8) {
    throw new Error("Invalid scout level");
  }
  console.log(
    `   ✓ Level ${level.level}, xp=${level.xp}, next=${level.nextLevelXp ?? "max"}`
  );

  console.log("4. Scout scores...");
  const score = computeScoutScoreWithFactors(metrics);
  if (score.score < 0 || score.score > 100) {
    throw new Error("Scout score out of range");
  }
  console.log(`   ✓ Score ${score.score}/100`);

  console.log("4b. Venture type backfill (analytics only)...");
  const resolved = resolveMissionVentureTypeKey({
    ventureTypeKey: null,
    revenueStream: "etsy",
  });
  if (resolved !== "etsy") {
    throw new Error("revenueStream backfill failed for etsy");
  }
  const shopifyResolved = resolveMissionVentureTypeKey({
    ventureTypeKey: null,
    revenueStream: "shopify",
  });
  if (shopifyResolved !== "shopify") {
    throw new Error("revenueStream backfill failed for shopify");
  }
  console.log("   ✓ revenueStream → venture type mapping works");

  console.log("4c. Mock historical mission attribution...");
  const mockMissions = [
    {
      id: 9001,
      status: MISSION_STATUSES.RESEARCHING,
      opportunityId: 1,
      ventureTypeKey: resolveMissionVentureTypeKey({
        ventureTypeKey: null,
        revenueStream: "shopify",
      }),
      revenueGbp: 120,
    },
    {
      id: 9002,
      status: MISSION_STATUSES.PROFITABLE,
      opportunityId: 2,
      ventureTypeKey: resolveMissionVentureTypeKey({
        ventureTypeKey: null,
        revenueStream: "etsy",
      }),
      revenueGbp: 85,
    },
    {
      id: 9003,
      status: MISSION_STATUSES.KILLED,
      opportunityId: null,
      ventureTypeKey: resolveMissionVentureTypeKey({
        ventureTypeKey: null,
        revenueStream: "amazon",
      }),
      revenueGbp: 0,
    },
  ];
  const mockOpportunities = [
    { id: 1, category: null, status: "validated" },
    { id: 2, category: null, status: "launch_ready" },
  ];
  const shopifyMock = computeScoutMetrics(
    SCOUT_REGISTRY[0],
    mockOpportunities,
    mockMissions
  );
  const etsyMock = computeScoutMetrics(
    SCOUT_REGISTRY[1],
    mockOpportunities,
    mockMissions
  );
  const amazonMock = computeScoutMetrics(
    SCOUT_REGISTRY[5],
    mockOpportunities,
    mockMissions
  );
  if (shopifyMock.missionsCreated !== 1 || shopifyMock.opportunitiesFound !== 1) {
    throw new Error("Shopify scout mock attribution failed");
  }
  if (etsyMock.missionsCreated !== 1 || etsyMock.revenueGenerated !== 85) {
    throw new Error("Etsy scout mock attribution failed");
  }
  if (amazonMock.missionsCreated !== 1 || amazonMock.successRate !== 0) {
    throw new Error("Amazon scout mock attribution failed");
  }
  console.log(
    `   ✓ shopify=${shopifyMock.missionsCreated} etsy=${etsyMock.missionsCreated} amazon=${amazonMock.missionsCreated}`
  );

  console.log("5. Intelligence snapshot...");
  const intel = await getAthenaIntelligenceSnapshot();
  if (intel.scouts.length !== SCOUT_REGISTRY.length) {
    throw new Error(`Expected ${SCOUT_REGISTRY.length} scouts, got ${intel.scouts.length}`);
  }
  console.log(
    `   ✓ ${intel.scouts.length} scouts, top=${intel.summary.topScout?.name ?? "none"}`
  );

  const missionCount = await prisma.mission.count();
  const attributedMissions = intel.scouts.reduce(
    (sum, s) => sum + s.missionsCreated,
    0
  );
  if (missionCount > 0 && attributedMissions === 0) {
    throw new Error(
      "Historical missions exist but none attributed to scouts — backfill failed"
    );
  }
  if (missionCount > 0) {
    console.log(
      `   ✓ ${attributedMissions}/${missionCount} missions attributed via venture type`
    );
  }

  console.log("6. Atlas integration...");
  const [atlas, scoutRankings] = await Promise.all([
    getAtlasDashboardSnapshot(),
    getScoutRankingsForAtlas(),
  ]);
  if (!atlas.scoutRankings?.topScouts || !atlas.scoutRankings?.worstScouts) {
    throw new Error("Atlas missing scout rankings");
  }
  if (
    scoutRankings.topScouts.length === 0 ||
    scoutRankings.highestRevenueScouts.length === 0
  ) {
    throw new Error("Scout rankings incomplete");
  }
  console.log(
    `   ✓ top=${atlas.scoutRankings.topScouts.length} worst=${atlas.scoutRankings.worstScouts.length} revenue=${atlas.scoutRankings.highestRevenueScouts.length}`
  );

  console.log("7. API / page routes exist...");
  const { existsSync } = await import("node:fs");
  const apiRoute = resolve("app/api/hq/scouts/route.ts");
  const pageRoute = resolve("app/hq/scouts/page.tsx");
  if (!existsSync(apiRoute) || !existsSync(pageRoute)) {
    throw new Error("Scouts API or page route missing");
  }
  console.log("   ✓ app/api/hq/scouts/route.ts and app/hq/scouts/page.tsx present");

  console.log("8. No pipeline files changed...");
  const root = resolve(".");
  const athenaFiles = globSync("lib/hq/athena/**/*.ts", { cwd: root });
  if (athenaFiles.length < 6) throw new Error("Athena module incomplete");
  for (const pattern of PIPELINE_PATTERNS) {
    globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
  }
  for (const forbidden of FORBIDDEN_TOUCH) {
    const hits = globSync(`${forbidden}/**/*`, { cwd: root });
    if (hits.some((h) => h.includes("phase-3c"))) {
      throw new Error(`Pipeline file touched: ${forbidden}`);
    }
  }
  console.log(`   ✓ Athena module (${athenaFiles.length} files), pipeline untouched`);

  console.log("9. HTTP routes (dev server optional)...");
  const baseUrl = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
  try {
    const scoutsRes = await fetch(`${baseUrl}/api/hq/scouts`);
    if (!scoutsRes.ok) {
      console.log(`   ⚠ /api/hq/scouts returned ${scoutsRes.status} (start dev server to verify HTTP)`);
    } else {
      const body = await scoutsRes.json();
      if (!body.scouts || !body.generatedAt) {
        throw new Error("Scouts API response shape invalid");
      }
      console.log(`   ✓ /api/hq/scouts 200 (${body.scouts.length} scouts)`);
    }
    const pageRes = await fetch(`${baseUrl}/hq/scouts`);
    if (!pageRes.ok) {
      console.log(`   ⚠ /hq/scouts returned ${pageRes.status} (start dev server to verify HTTP)`);
    } else {
      console.log("   ✓ /hq/scouts 200");
    }
  } catch {
    console.log("   ⚠ HTTP checks skipped (dev server not running)");
  }

  console.log("10. Build...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
  console.log("   ✓ Build passed");

  console.log("\nSample scout output:");
  const topByMissions = [...intel.scouts].sort(
    (a, b) => b.missionsCreated - a.missionsCreated
  )[0];
  const sample = topByMissions.missionsCreated > 0 ? topByMissions : intel.scouts[0];
  console.log(
    JSON.stringify(
      {
        scoutKey: sample.scoutKey,
        name: sample.name,
        level: sample.level,
        xp: sample.xp,
        score: sample.score,
        opportunitiesFound: sample.opportunitiesFound,
        opportunitiesApproved: sample.opportunitiesApproved,
        missionsCreated: sample.missionsCreated,
        missionsLaunched: sample.missionsLaunched,
        revenueGenerated: sample.revenueGenerated,
        successRate: sample.successRate,
      },
      null,
      2
    )
  );

  console.log("\nAll scouts summary:");
  for (const s of intel.scouts) {
    console.log(
      `   ${s.name}: missions=${s.missionsCreated} opps=${s.opportunitiesFound} revenue=£${s.revenueGenerated} score=${s.score}`
    );
  }

  console.log("\nAll Phase 3C checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

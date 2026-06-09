/**
 * Phase 5C verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-5c.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  AVATAR_REGISTRY,
  activityToAnimationKey,
  buildAchievements,
  buildEmpireLevelSnapshot,
  buildLeaderboards,
  buildUnlocks,
  getGamificationSnapshot,
} from "../lib/hq/gamification";

async function main() {
  await seedHqFoundation();

  console.log("1. Gamification module files...");
  const requiredFiles = [
    "lib/hq/gamification/avatar-registry.ts",
    "lib/hq/gamification/empire-levels.ts",
    "lib/hq/gamification/department-levels.ts",
    "lib/hq/gamification/achievements.ts",
    "lib/hq/gamification/unlocks.ts",
    "lib/hq/gamification/leaderboards.ts",
    "lib/hq/gamification/gamification-engine.ts",
    "components/hq-map/avatar-sprites.ts",
    "app/hq/gamification/page.tsx",
    "scripts/generate-hq-sprites.ts",
  ];
  for (const file of requiredFiles) {
    if (!existsSync(resolve(file))) throw new Error(`Missing ${file}`);
  }
  console.log(`   ✓ ${requiredFiles.length} Phase 5C files present`);

  console.log("2. Sprite assets...");
  const sprites = [
    "public/hq/sprites/atlas.png",
    "public/hq/sprites/athena.png",
    "public/hq/sprites/forge.png",
    "public/hq/sprites/nova.png",
    "public/hq/sprites/mercury.png",
    "public/hq/sprites/scouts/shopify_scout.png",
    "public/hq/sprites/scouts/etsy_scout.png",
    "public/hq/sprites/scouts/affiliate_scout.png",
    "public/hq/sprites/scouts/content_scout.png",
    "public/hq/sprites/scouts/saas_scout.png",
    "public/hq/sprites/scouts/amazon_scout.png",
  ];
  for (const sprite of sprites) {
    if (!existsSync(resolve(sprite))) {
      execSync("npx tsx scripts/generate-hq-sprites.ts", { stdio: "inherit" });
      break;
    }
  }
  for (const sprite of sprites) {
    if (!existsSync(resolve(sprite))) throw new Error(`Missing sprite ${sprite}`);
  }
  console.log(`   ✓ ${sprites.length} sprite sheets present`);

  console.log("3. Avatar registry...");
  if (AVATAR_REGISTRY.length < 11) {
    throw new Error("Avatar registry should include executives and scouts");
  }
  for (const avatar of AVATAR_REGISTRY) {
    if (!avatar.idleAnimation || !avatar.walkAnimation || !avatar.workAnimation) {
      throw new Error(`Missing animations for ${avatar.key}`);
    }
  }
  if (activityToAnimationKey("walking") !== "walk") {
    throw new Error("walking should map to walk animation");
  }
  if (activityToAnimationKey("researching") !== "work") {
    throw new Error("researching should map to work animation");
  }
  console.log(`   ✓ ${AVATAR_REGISTRY.length} avatars with animations`);

  console.log("4. Empire levels...");
  const empire = buildEmpireLevelSnapshot({
    totalRevenue: 500,
    missionCount: 12,
    totalAgentXp: 800,
    totalScoutXp: 400,
    empireScore: 55,
  });
  if (empire.empireLevel < 1 || empire.empireLevel > 100) {
    throw new Error("Empire level out of range");
  }
  console.log(`   ✓ empire level ${empire.empireLevel} (${empire.progressPercent}%)`);

  console.log("5. Achievements & unlocks...");
  const achievements = buildAchievements({
    missionCount: 10,
    totalRevenue: 150,
    storeCount: 1,
    empireLevel: 5,
    ventureTypes: new Set(["etsy"]),
    topScoutLevel: 3,
    departmentLevels: { atlas: 2, forge: 1, nova: 1, mercury: 1, athena: 2 },
  });
  if (achievements.length < 18) throw new Error("Expected 18 achievements");
  const unlocks = buildUnlocks(5);
  if (!unlocks.find((u) => u.id === "TREND_HUNTER_SCOUT")?.unlocked) {
    throw new Error("Level 5 should unlock Trend Hunter Scout");
  }
  console.log(`   ✓ ${achievements.length} achievements, ${unlocks.length} unlocks`);

  console.log("6. Leaderboards...");
  const boards = buildLeaderboards({
    agents: [{ agentKey: "atlas", department: "ceo_office", xp: 100, level: 2, score: 50, revenueInfluenced: 200 }],
    scouts: [{ scoutKey: "shopify_scout", xp: 80, level: 2, score: 40, revenueGenerated: 100 }],
    departments: [{ key: "atlas", name: "Atlas", xp: 200, level: 3, score: 300, revenue: 500 }],
    ventures: [{ ventureTypeKey: "shopify", missionCount: 5, revenue: 300 }],
  });
  if (boards.topAgents.length === 0) throw new Error("Leaderboards empty");
  console.log("   ✓ leaderboards generated");

  console.log("7. Gamification snapshot (read-only)...");
  const snapshot = await getGamificationSnapshot();
  if (!snapshot.departments.length) throw new Error("Department levels missing");
  console.log(
    `   ✓ empire L${snapshot.empire.empireLevel}, ${snapshot.unlockedAchievementCount} achievements`
  );

  console.log("8. HQ dashboard widgets...");
  const hqPage = readFileSync(resolve("app/hq/page.tsx"), "utf8");
  if (!hqPage.includes("Empire Level") || !hqPage.includes("Recent Achievement")) {
    throw new Error("HQ dashboard gamification widgets missing");
  }
  const layout = readFileSync(resolve("app/layout.tsx"), "utf8");
  if (!layout.includes("/hq/gamification")) {
    throw new Error("Sidebar gamification link missing");
  }
  console.log("   ✓ HQ dashboard widgets and sidebar link");

  console.log("9. No pipeline mutations in gamification...");
  const engineSrc = readFileSync(resolve("lib/hq/gamification/gamification-engine.ts"), "utf8");
  const forbidden = ["prisma.mission.update", "prisma.mission.create", "prisma.mission.delete"];
  for (const token of forbidden) {
    if (engineSrc.includes(token)) throw new Error(`Pipeline mutation detected: ${token}`);
  }
  console.log("   ✓ gamification layer is read-only");

  console.log("10. Agent animation uses sprites...");
  const animSrc = readFileSync(resolve("components/hq-map/agent-animation.ts"), "utf8");
  if (animSrc.includes("fillCircle") || animSrc.includes("avatarEmoji")) {
    throw new Error("Agent animation still uses circle/emoji markers");
  }
  if (!animSrc.includes("sprite.play")) {
    throw new Error("Agent animation should use Phaser sprite animations");
  }
  console.log("   ✓ sprite-based avatars configured");

  console.log("11. TypeScript check...");
  execSync("npx tsc --noEmit", { stdio: "inherit" });
  console.log("   ✓ TypeScript passes (run npm run build separately for full build)");

  console.log("\n✅ Phase 5C verification complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

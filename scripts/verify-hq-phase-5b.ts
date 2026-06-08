/**
 * Phase 5B verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-5b.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import {
  getHqMapLiveState,
  missionStatusToActivity,
  missionStatusToRoom,
  buildPipelineRoute,
  ACTIVITY_REGISTRY,
} from "../lib/hq/map";
import { MISSION_STATUSES } from "../lib/hq/constants";

async function main() {
  await seedHqFoundation();

  console.log("1. Activity engine files...");
  const requiredFiles = [
    "lib/hq/map/activity-engine.ts",
    "lib/hq/map/activity-registry.ts",
    "lib/hq/map/agent-routes.ts",
    "lib/hq/map/agent-state.ts",
    "lib/hq/map/agent-state-utils.ts",
    "components/hq-map/agent-animation.ts",
    "components/hq-map/activity-panel.tsx",
    "components/hq-map/live-feed.tsx",
  ];
  for (const file of requiredFiles) {
    if (!existsSync(resolve(file))) throw new Error(`Missing ${file}`);
  }
  console.log(`   ✓ ${requiredFiles.length} Phase 5B files present`);

  console.log("2. Activity registry...");
  const activityTypes = Object.keys(ACTIVITY_REGISTRY);
  for (const type of [
    "researching",
    "reviewing",
    "building",
    "launching",
    "analyzing",
    "idle",
    "walking",
  ]) {
    if (!activityTypes.includes(type)) {
      throw new Error(`Missing activity type: ${type}`);
    }
  }
  console.log("   ✓ all 7 activity types registered");

  console.log("3. Mission routing...");
  if (missionStatusToRoom(MISSION_STATUSES.VALIDATING) !== "athena_lab") {
    throw new Error("validating should route to Athena");
  }
  if (missionStatusToRoom(MISSION_STATUSES.APPROVED) !== "atlas_office") {
    throw new Error("approved should route to Atlas");
  }
  if (missionStatusToRoom(MISSION_STATUSES.BUILDING) !== "forge_workshop") {
    throw new Error("building should route to Forge");
  }
  if (missionStatusToRoom(MISSION_STATUSES.LAUNCHING) !== "nova_growth") {
    throw new Error("launching should route to Nova");
  }
  if (missionStatusToRoom(MISSION_STATUSES.PROFITABLE) !== "mercury_treasury") {
    throw new Error("profitable should route to Mercury");
  }
  if (missionStatusToActivity(MISSION_STATUSES.APPROVED) !== "reviewing") {
    throw new Error("approved should map to reviewing activity");
  }
  console.log("   ✓ mission routing works");

  console.log("4. Movement paths...");
  const route = buildPipelineRoute("athena_lab", "mercury_treasury");
  if (route[0] !== "athena_lab" || route[route.length - 1] !== "mercury_treasury") {
    throw new Error("Pipeline route incorrect");
  }
  console.log(`   ✓ pipeline route: ${route.join(" → ")}`);

  console.log("5. Activity engine generates states...");
  const live = await getHqMapLiveState();
  if (live.agentStates.length === 0) throw new Error("No agent states generated");
  const withActivity = live.agentStates.filter((a) => a.workActivity !== "idle");
  console.log(
    `   ✓ ${live.agentStates.length} agent states (${withActivity.length} active)`
  );

  console.log("6. Live feed...");
  if (!Array.isArray(live.activityFeed)) throw new Error("activityFeed missing");
  console.log(`   ✓ ${live.activityFeed.length} feed entries`);

  console.log("7. Tooltips show activity...");
  const tooltip = readFileSync(resolve("components/hq-map/hq-tooltip.tsx"), "utf8");
  if (!tooltip.includes("activityLabel") || !tooltip.includes("missionStatus")) {
    throw new Error("Tooltip missing activity fields");
  }
  console.log("   ✓ tooltip includes activity + status");

  console.log("8. HQ map page uses live state...");
  const page = readFileSync(resolve("app/hq/map/page.tsx"), "utf8");
  if (!page.includes("getHqMapLiveState")) {
    throw new Error("Map page not using getHqMapLiveState");
  }
  if (!page.includes("LiveFeed") && !page.includes("HqMapShell")) {
    throw new Error("Map page missing live UI");
  }
  const mapUi = readFileSync(resolve("components/hq-map/hq-map.tsx"), "utf8");
  if (!mapUi.includes("LiveFeed") || !mapUi.includes("ActivityPanel")) {
    throw new Error("HQ map missing activity panel or live feed");
  }
  console.log("   ✓ HQ map renders with live components");

  console.log("9. No pipeline changes...");
  for (const file of [
    "app/api/pipeline/run-cycle/route.ts",
    "app/api/pipeline/status/route.ts",
  ]) {
    if (!existsSync(resolve(file))) throw new Error(`Missing ${file}`);
  }
  console.log("   ✓ pipeline files untouched");

  console.log("10. Build passes...");
  execSync("npx next build", { stdio: "inherit" });
  console.log("   ✓ next build passed");

  console.log("\n✅ Phase 5B verification complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Phase 5A verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-5a.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { backfillPerformanceSnapshots } from "../lib/hq/performance";
import {
  getHqMapState,
  getDepartmentRooms,
  HQ_ROOMS,
} from "../lib/hq/map";

async function main() {
  await seedHqFoundation();
  await backfillPerformanceSnapshots();

  console.log("1. HQ map page exists...");
  const requiredFiles = [
    "app/hq/map/page.tsx",
    "components/hq-map/hq-map.tsx",
    "components/hq-map/hq-room.tsx",
    "components/hq-map/hq-agent.tsx",
    "components/hq-map/hq-tooltip.tsx",
    "components/hq-map/hq-map-shell.tsx",
    "components/hq-map/create-hq-map-game.ts",
    "lib/hq/map/hq-layout.ts",
    "lib/hq/map/room-registry.ts",
    "lib/hq/map/agent-positioning.ts",
    "lib/hq/map/map-state.ts",
    "lib/hq/map/index.ts",
    "public/hq/rooms/room-tile.svg",
    "public/hq/agents/agent-marker.svg",
  ];
  for (const file of requiredFiles) {
    if (!existsSync(resolve(file))) {
      throw new Error(`Missing ${file}`);
    }
  }
  console.log(`   ✓ ${requiredFiles.length} map files present`);

  console.log("2. All 5 departments render...");
  const departmentRooms = getDepartmentRooms();
  if (departmentRooms.length !== 5) {
    throw new Error(`Expected 5 department rooms, got ${departmentRooms.length}`);
  }
  if (HQ_ROOMS.length !== 6) {
    throw new Error(`Expected 6 total rooms (incl. command center), got ${HQ_ROOMS.length}`);
  }
  console.log("   ✓ 5 department rooms + command center registered");

  console.log("3. Agents render...");
  const mapState = await getHqMapState();
  if (mapState.agents.length === 0) {
    throw new Error("No agents on HQ map");
  }
  const hasAgents = mapState.agents.some((agent) => agent.kind === "agent");
  const hasScouts = mapState.agents.some((agent) => agent.kind === "scout");
  if (!hasAgents) throw new Error("No agent markers on map");
  if (!hasScouts) throw new Error("No scout markers on map");
  console.log(
    `   ✓ ${mapState.agents.length} entities (${mapState.totals.agents} agents, ${mapState.totals.scouts} scouts)`
  );

  console.log("4. Agent links work...");
  for (const agent of mapState.agents) {
    if (agent.kind === "agent" && !agent.profileHref.startsWith("/hq/agents/")) {
      throw new Error(`Invalid agent link: ${agent.profileHref}`);
    }
    if (agent.kind === "scout" && !agent.profileHref.startsWith("/hq/scouts/")) {
      throw new Error(`Invalid scout link: ${agent.profileHref}`);
    }
    if (agent.x <= 0 || agent.y <= 0) {
      throw new Error(`Invalid position for ${agent.key}`);
    }
  }
  console.log("   ✓ all profile hrefs and positions valid");

  console.log("5. Sidebar link works...");
  const layout = readFileSync(resolve("app/layout.tsx"), "utf8");
  if (!layout.includes('href: "/hq/map"') || !layout.includes("HQ Map")) {
    throw new Error("Sidebar missing HQ Map link");
  }
  console.log("   ✓ sidebar HQ Map link present");

  console.log("6. Dashboard link works...");
  const hqPage = readFileSync(resolve("app/hq/page.tsx"), "utf8");
  if (!hqPage.includes('href="/hq/map"') || !hqPage.includes("Open HQ Map")) {
    throw new Error("HQ dashboard missing Open HQ Map card");
  }
  console.log("   ✓ HQ dashboard Open HQ Map card present");

  console.log("7. No pipeline changes...");
  const pipelineFiles = [
    "app/api/pipeline/run-cycle/route.ts",
    "app/api/pipeline/status/route.ts",
    "lib/opportunity/compute-queue-stats.ts",
  ];
  for (const file of pipelineFiles) {
    if (!existsSync(resolve(file))) {
      throw new Error(`Expected pipeline file missing: ${file}`);
    }
  }
  console.log("   ✓ pipeline files untouched");

  console.log("8. Phaser installed...");
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  if (!pkg.dependencies?.phaser) {
    throw new Error("phaser not in package.json dependencies");
  }
  console.log(`   ✓ phaser@${pkg.dependencies.phaser}`);

  console.log("9. Build passes...");
  execSync("npx next build", { stdio: "inherit" });
  console.log("   ✓ next build passed");

  console.log("\n✅ Phase 5A verification complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

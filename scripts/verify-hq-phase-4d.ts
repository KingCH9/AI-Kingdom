/**
 * Phase 4D verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-4d.ts
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { backfillPerformanceSnapshots } from "../lib/hq/performance";
import { getHqSnapshot } from "../lib/hq/queries/hq-dashboard";
import { getEmpireScoreV2Snapshot } from "../lib/hq/empire/score-v2-dashboard";

async function main() {
  await seedHqFoundation();
  await backfillPerformanceSnapshots();

  console.log("1. Empire V1 archived...");
  if (!existsSync(resolve("_archive/hq/empire-v1/page.tsx"))) {
    throw new Error("Missing _archive/hq/empire-v1/page.tsx");
  }
  console.log("   ✓ V1 page archived");

  console.log("2. Canonical empire routes...");
  const routes = [
    "app/hq/empire/page.tsx",
    "app/api/hq/empire/route.ts",
    "app/hq/empire/v2/page.tsx",
    "app/api/hq/empire/v2/route.ts",
  ];
  for (const route of routes) {
    if (!existsSync(resolve(route))) {
      throw new Error(`Missing ${route}`);
    }
  }
  console.log("   ✓ empire page, API, and V2 redirects present");

  console.log("3. Layout nav consolidation...");
  const layout = await import("node:fs/promises").then((fs) =>
    fs.readFile(resolve("app/layout.tsx"), "utf8")
  );
  if (layout.includes("/hq/empire/v2")) {
    throw new Error("Layout still links to /hq/empire/v2");
  }
  if (layout.includes('href="/empire"') || layout.includes('href="/agents"')) {
    throw new Error("Layout still has legacy /empire or /agents links");
  }
  if (!layout.includes("NAV_GROUPS")) {
    throw new Error("Layout missing grouped navigation");
  }
  console.log("   ✓ grouped sidebar, no duplicate empire links");

  console.log("4. HQ snapshot empireSummary...");
  const hq = await getHqSnapshot();
  if (hq.empireSummary == null || typeof hq.empireSummary.score !== "number") {
    throw new Error("empireSummary missing from HQ snapshot");
  }
  if ("empireScoreSummary" in hq || "empireScoreV2Summary" in hq) {
    throw new Error("Legacy empire score fields still on HQ snapshot");
  }
  const empire = await getEmpireScoreV2Snapshot();
  if (hq.empireSummary.score !== empire.empireScoreV2) {
    throw new Error("empireSummary.score mismatch with V2 snapshot");
  }
  console.log(`   ✓ empireSummary score=${hq.empireSummary.score}`);

  console.log("5. HQ page cleanup...");
  const hqPage = await import("node:fs/promises").then((fs) =>
    fs.readFile(resolve("app/hq/page.tsx"), "utf8")
  );
  if (hqPage.includes("Empire Score V2") || hqPage.includes("empireScoreV2Summary")) {
    throw new Error("HQ page still references V2 branding or old field names");
  }
  if (hqPage.includes("Ventures by Type")) {
    throw new Error("HQ page still has Ventures by Type widget");
  }
  if (!hqPage.includes("Advisory Engines")) {
    throw new Error("HQ page missing compact advisory engines grid");
  }
  console.log("   ✓ HQ landing page cleaned up");

  console.log("6. Build...");
  execSync("npx next build", { stdio: "inherit" });
  console.log("   ✓ next build passed");

  console.log("\n✅ Phase 4D verification complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

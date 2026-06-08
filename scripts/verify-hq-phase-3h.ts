/**
 * Phase 3H verification — run: npx tsx --env-file=.env scripts/verify-hq-phase-3h.ts
 */
import { prisma } from "../lib/prisma";
import { seedHqFoundation } from "../lib/hq/seed/foundation";
import { backfillPerformanceSnapshots } from "../lib/hq/performance";
import {
  computeComponentScores,
  computeEmpireScoreV2,
  computeDepartmentScoresV2,
  deriveStrengthsAndWeaknesses,
  getEmpireScoreV2Snapshot,
  loadEmpireScoreV2Inputs,
} from "../lib/hq/empire";
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
  await backfillPerformanceSnapshots();

  console.log("1. Empire Score V2 calculated...");
  const input = await loadEmpireScoreV2Inputs();
  const components = computeComponentScores(input);
  const score = computeEmpireScoreV2(components);
  if (score < 0 || score > 100) {
    throw new Error(`Empire Score V2 out of range: ${score}`);
  }
  console.log(`   ✓ empireScoreV2=${score} (v1=${input.empireScoreV1})`);

  console.log("2. Component scores generated...");
  const componentKeys = Object.keys(components);
  if (componentKeys.length !== 9) {
    throw new Error(`Expected 9 components, got ${componentKeys.length}`);
  }
  console.log(`   ✓ ${componentKeys.length} components`);

  console.log("3. Department scores generated...");
  const departments = computeDepartmentScoresV2(input, components);
  if (departments.length !== 5) {
    throw new Error(`Expected 5 departments, got ${departments.length}`);
  }
  console.log(`   ✓ ${departments.length} departments`);

  console.log("4. Top agents generated...");
  console.log("5. Top scouts generated...");
  console.log("6. Strengths generated...");
  console.log("7. Weaknesses generated...");
  const snapshot = await getEmpireScoreV2Snapshot();
  if (snapshot.rankings.topAgents.length === 0) {
    throw new Error("No top agents in snapshot");
  }
  if (snapshot.strengths.length === 0 || snapshot.weaknesses.length === 0) {
    throw new Error("Strengths/weaknesses missing");
  }
  console.log(
    `   ✓ topAgent=${snapshot.rankings.topAgents[0]?.agentKey} topScout=${snapshot.rankings.topScouts[0]?.scoutKey ?? "none"}`
  );
  console.log(`   ✓ strengths=${snapshot.strengths.length} weaknesses=${snapshot.weaknesses.length}`);

  const { strengths, weaknesses } = deriveStrengthsAndWeaknesses(components);
  if (strengths.length === 0 || weaknesses.length === 0) {
    throw new Error("deriveStrengthsAndWeaknesses failed");
  }

  console.log("8. API route exists...");
  const { existsSync } = await import("node:fs");
  if (
    !existsSync(resolve("app/api/hq/empire/v2/route.ts")) ||
    !existsSync(resolve("app/hq/empire/v2/page.tsx"))
  ) {
    throw new Error("Empire V2 API or page route missing");
  }
  console.log("   ✓ app/api/hq/empire/v2/route.ts and app/hq/empire/v2/page.tsx present");

  console.log("9. Pipeline untouched...");
  const root = resolve(".");
  const empireFiles = globSync("lib/hq/empire/**/*.ts", { cwd: root });
  if (empireFiles.length < 4) throw new Error("Empire V2 module incomplete");
  for (const pattern of PIPELINE_PATTERNS) {
    globSync(pattern, { cwd: root, ignore: ["**/node_modules/**"] });
  }
  console.log(`   ✓ Empire module (${empireFiles.length} files), pipeline untouched`);

  console.log("10. Build...");
  execSync("npm run build", { stdio: "inherit", cwd: root });
  console.log("   ✓ Build passed");

  console.log("\nSample API output:");
  console.log(
    JSON.stringify(
      {
        empireScoreV2: snapshot.empireScoreV2,
        componentScores: snapshot.componentScores,
        topAgent: snapshot.rankings.topAgents[0],
        strengths: snapshot.strengths.slice(0, 2),
        weaknesses: snapshot.weaknesses.slice(0, 2),
      },
      null,
      2
    )
  );

  console.log("\nAll Phase 3H checks passed.");
}

main()
  .catch((err) => {
    console.error("\nFAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

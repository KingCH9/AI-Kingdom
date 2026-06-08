/**
 * Phase D2 scoring calibration — compares legacy vs structured scoring.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/scoring-calibration.ts [count]
 *   npx tsx scripts/scoring-calibration.ts --sim [count]
 */
import "dotenv/config";

import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { generateOpportunityWithClaude } from "../lib/ai/generate-opportunity";
import {
  deriveScoresFromClaudeResponse,
  deriveScoresLegacy,
} from "../lib/opportunity/derive-scores";
import { deriveOpportunityCategory } from "../lib/opportunity/derive-category";
import { buildOpportunityScores } from "../lib/opportunity/scoring";
import {
  analyzeScoringBatch,
  runScoringSimulation,
  type ScoringBatchMetrics,
} from "../lib/opportunity/scoring-simulation";
import { OPPORTUNITY_THRESHOLDS } from "../lib/opportunity/thresholds";
import { getOpportunityDiversityContext } from "../lib/opportunity/fetch-diversity-context";
import {
  buildDiversityContext,
  normalizeRotationCategory,
  type RecentOpportunitySnapshot,
} from "../lib/opportunity/generation-diversity";
import type { ClaudeOpportunityResponse } from "../lib/types";

const args = process.argv.slice(2);
const SIM_MODE = args.includes("--sim");
const countArg = args.find((arg) => /^\d+$/.test(arg));
const COUNT = Number(countArg ?? 100);

function snapshotFromGeneration(
  index: number,
  productName: string,
  category: string
): RecentOpportunitySnapshot {
  return {
    id: -index,
    productName,
    category: normalizeRotationCategory(category),
    niche: productName,
  };
}

function meetsTargets(after: ScoringBatchMetrics) {
  return {
    scoreStdDevGte8: after.scoreStdDev >= 8,
    launchReady10to20:
      after.launchReadyPct >= 10 && after.launchReadyPct <= 20,
    diversityHealthy: after.uniqueCategories >= 6,
    duplicateBelow10: after.duplicateProductRatePct < 10,
  };
}

async function runLiveCalibration() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY required (or use --sim for offline mode)");
    process.exit(1);
  }

  const seeded = await getOpportunityDiversityContext().catch(() => ({
    recent: [] as RecentOpportunitySnapshot[],
    doNotRepeat: { productNames: [], categories: [], niches: [] },
    blockedCategories: [] as string[],
    preferredCategories: [] as string[],
  }));

  let rollingSnapshots = [...seeded.recent];
  const legacyBatch: ClaudeOpportunityResponse[] = [];
  const d2Batch: ClaudeOpportunityResponse[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 1; i <= COUNT; i++) {
    const diversityContext = buildDiversityContext(
      rollingSnapshots.map((row) => ({
        id: row.id,
        productName: row.productName,
        category: row.category,
      }))
    );

    process.stderr.write(`Calibrating ${i}/${COUNT}...\n`);

    try {
      const generated = await generateOpportunityWithClaude({ diversityContext });
      if (!generated.success) {
        errors.push({ index: i, message: generated.message });
        continue;
      }

      const data = generated.data;
      const category = normalizeRotationCategory(
        deriveOpportunityCategory(data)
      );

      legacyBatch.push(data);
      d2Batch.push(data);

      const legacyScore = buildOpportunityScores(
        deriveScoresLegacy(data)
      ).opportunityScore;
      const d2Score = buildOpportunityScores(
        deriveScoresFromClaudeResponse(data)
      ).opportunityScore;

      rollingSnapshots.unshift(
        snapshotFromGeneration(i, data.productName ?? "(unnamed)", category)
      );
      rollingSnapshots = rollingSnapshots.slice(0, 20);

      process.stderr.write(
        `  #${i} ${category} legacy=${legacyScore} d2=${d2Score}\n`
      );
    } catch (error) {
      errors.push({
        index: i,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const before = analyzeScoringBatch(
    "Phase D1 legacy scoring",
    legacyBatch,
    deriveScoresLegacy
  );
  const after = analyzeScoringBatch(
    "Phase D2 structured scoring",
    d2Batch,
    deriveScoresFromClaudeResponse
  );

  return {
    mode: "live" as const,
    gate: OPPORTUNITY_THRESHOLDS.LAUNCH_READY_MIN_SCORE,
    requested: COUNT,
    succeeded: legacyBatch.length,
    errors: errors.length,
    before,
    after,
    targets: meetsTargets(after),
    targetLaunchReadyPct: "10–20%",
    errorDetails: errors,
  };
}

async function main() {
  const report = SIM_MODE
    ? (() => {
        const sim = runScoringSimulation(COUNT);
        return {
          ...sim,
          gate: OPPORTUNITY_THRESHOLDS.LAUNCH_READY_MIN_SCORE,
          targets: meetsTargets(sim.after),
          targetLaunchReadyPct: "10–20%",
        };
      })()
    : await runLiveCalibration();

  const outputPath = join(process.cwd(), "scoring-calibration.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  process.stderr.write(`\nWrote ${outputPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

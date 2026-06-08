/**
 * Phase D2 scoring calibration — compares legacy vs structured scoring on Claude batch.
 * Usage: npx tsx --env-file=.env scripts/scoring-calibration.ts [count]
 */
import "dotenv/config";

import { generateOpportunityWithClaude } from "../lib/ai/generate-opportunity";
import {
  deriveScoresFromClaudeResponse,
  deriveScoresLegacy,
} from "../lib/opportunity/derive-scores";
import { deriveOpportunityCategory } from "../lib/opportunity/derive-category";
import { buildOpportunityScores } from "../lib/opportunity/scoring";
import { meetsLaunchReadyCriteria } from "../lib/opportunity/status";
import { OPPORTUNITY_THRESHOLDS } from "../lib/opportunity/thresholds";
import { getOpportunityDiversityContext } from "../lib/opportunity/fetch-diversity-context";
import {
  buildDiversityContext,
  normalizeRotationCategory,
  type RecentOpportunitySnapshot,
} from "../lib/opportunity/generation-diversity";

const COUNT = Number(process.argv[2] ?? 100);

function stdDev(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

function distribution(values: number[]): Record<number, number> {
  return values.reduce<Record<number, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

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

function analyzeBatch(
  label: string,
  rows: Array<{
    opportunityScore: number;
    launchReady: boolean;
    category: string;
  }>
) {
  const scores = rows.map((row) => row.opportunityScore);
  const launchReady = rows.filter((row) => row.launchReady).length;
  const categories: Record<string, number> = {};
  for (const row of rows) {
    categories[row.category] = (categories[row.category] ?? 0) + 1;
  }

  return {
    label,
    count: rows.length,
    launchReadyCount: launchReady,
    launchReadyPct:
      rows.length > 0
        ? Math.round((launchReady / rows.length) * 1000) / 10
        : 0,
    scoreStdDev: stdDev(scores),
    averageScore:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10
        : 0,
    highestScore: scores.length ? Math.max(...scores) : null,
    lowestScore: scores.length ? Math.min(...scores) : null,
    scoreDistribution: distribution(scores),
    uniqueCategories: Object.keys(categories).length,
    categoryDistribution: categories,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY required");
    process.exit(1);
  }

  const seeded = await getOpportunityDiversityContext().catch(() => ({
    recent: [] as RecentOpportunitySnapshot[],
    doNotRepeat: { productNames: [], categories: [], niches: [] },
    blockedCategories: [],
    preferredCategories: [],
  }));

  let rollingSnapshots = [...seeded.recent];
  const legacyRows: Array<{
    opportunityScore: number;
    launchReady: boolean;
    category: string;
  }> = [];
  const d2Rows: typeof legacyRows = [];
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

      const legacyInput = deriveScoresLegacy(data);
      const legacyScore = buildOpportunityScores(legacyInput).opportunityScore;
      legacyRows.push({
        opportunityScore: legacyScore,
        launchReady: meetsLaunchReadyCriteria(legacyInput),
        category,
      });

      const d2Input = deriveScoresFromClaudeResponse(data);
      const d2Score = buildOpportunityScores(d2Input).opportunityScore;
      d2Rows.push({
        opportunityScore: d2Score,
        launchReady: meetsLaunchReadyCriteria(d2Input),
        category,
      });

      rollingSnapshots.unshift(
        snapshotFromGeneration(i, data.productName ?? "(unnamed)", category)
      );
      rollingSnapshots = rollingSnapshots.slice(0, 20);

      process.stderr.write(
        `  #${i} ${category} legacy=${legacyScore} d2=${d2Score} launch=${meetsLaunchReadyCriteria(d2Input)}\n`
      );
    } catch (error) {
      errors.push({
        index: i,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const rollingCategories = new Set(
    rollingSnapshots.slice(0, 20).map((row) => row.category)
  );

  const report = {
    gate: OPPORTUNITY_THRESHOLDS.LAUNCH_READY_MIN_SCORE,
    requested: COUNT,
    succeeded: legacyRows.length,
    errors: errors.length,
    before: analyzeBatch("Phase D1 legacy scoring", legacyRows),
    after: analyzeBatch("Phase D2 structured scoring", d2Rows),
    diversityInRollingWindow: {
      uniqueCategories: rollingCategories.size,
      meetsTarget: rollingCategories.size >= 6,
    },
    targetLaunchReadyPct: "10–20%",
    meetsLaunchTarget:
      d2Rows.length > 0 &&
      analyzeBatch("d2", d2Rows).launchReadyPct >= 10 &&
      analyzeBatch("d2", d2Rows).launchReadyPct <= 20,
    errors,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

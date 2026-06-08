/**
 * Generates N opportunities with diversity prompts (no DB persist) and reports distribution stats.
 * Usage: npx tsx scripts/diversity-batch-generate.ts [count]
 */
import "dotenv/config";

import { generateOpportunityWithClaude } from "../lib/ai/generate-opportunity";
import { deriveScoresFromClaudeResponse } from "../lib/opportunity/derive-scores";
import { deriveOpportunityCategory } from "../lib/opportunity/derive-category";
import { buildOpportunityScores } from "../lib/opportunity/scoring";
import { getOpportunityDiversityContext } from "../lib/opportunity/fetch-diversity-context";
import {
  buildDiversityContext,
  computeDiversityScore,
  isDuplicateConcept,
  nameSimilarity,
  normalizeRotationCategory,
  type RecentOpportunitySnapshot,
} from "../lib/opportunity/generation-diversity";

const COUNT = Number(process.argv[2] ?? 20);
const DUPLICATE_THRESHOLD = 0.45;

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

function duplicateRate(results: Array<{ productName: string }>): number {
  if (results.length < 2) {
    return 0;
  }

  let duplicatePairs = 0;
  let pairs = 0;

  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      pairs += 1;
      if (
        nameSimilarity(results[i].productName, results[j].productName) >=
        DUPLICATE_THRESHOLD
      ) {
        duplicatePairs += 1;
      }
    }
  }

  return pairs === 0 ? 0 : Math.round((duplicatePairs / pairs) * 1000) / 10;
}

async function main() {
  const seeded = await getOpportunityDiversityContext().catch(() => ({
    recent: [] as RecentOpportunitySnapshot[],
    doNotRepeat: { productNames: [], categories: [], niches: [] },
    blockedCategories: [],
    preferredCategories: [],
  }));

  let rollingSnapshots = [...seeded.recent];
  const results: Array<{
    index: number;
    productName: string;
    category: string;
    opportunityScore: number;
    diversityScore: number;
    isDuplicate: boolean;
  }> = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 1; i <= COUNT; i++) {
    const diversityContext = buildDiversityContext(
      rollingSnapshots.map((row) => ({
        id: row.id,
        productName: row.productName,
        category: row.category,
      }))
    );

    process.stderr.write(`Generating ${i}/${COUNT}...\n`);

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
      const scoreInput = deriveScoresFromClaudeResponse(data);
      const { opportunityScore } = buildOpportunityScores(scoreInput);
      const diversityScore = computeDiversityScore(
        data.productName ?? "",
        category,
        diversityContext
      );
      const duplicate = isDuplicateConcept(
        data.productName ?? "",
        diversityContext,
        DUPLICATE_THRESHOLD
      );

      console.log(`[opportunity-generator] category=${category}`);
      console.log(`[opportunity-generator] diversity-score=${diversityScore}`);

      results.push({
        index: i,
        productName: data.productName ?? "(unnamed)",
        category,
        opportunityScore,
        diversityScore,
        isDuplicate: duplicate,
      });

      rollingSnapshots.unshift(
        snapshotFromGeneration(i, data.productName ?? "(unnamed)", category)
      );
      rollingSnapshots = rollingSnapshots.slice(0, 20);

      process.stderr.write(
        `  #${i} ${category} — ${data.productName?.slice(0, 50)} score=${opportunityScore} diversity=${diversityScore}\n`
      );
    } catch (error) {
      errors.push({
        index: i,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const categoryDistribution: Record<string, number> = {};
  const scoreDistribution: Record<number, number> = {};
  const diversityScores = results.map((row) => row.diversityScore);
  const opportunityScores = results.map((row) => row.opportunityScore);

  for (const row of results) {
    categoryDistribution[row.category] =
      (categoryDistribution[row.category] ?? 0) + 1;
    scoreDistribution[row.opportunityScore] =
      (scoreDistribution[row.opportunityScore] ?? 0) + 1;
  }

  const avgScore =
    opportunityScores.length > 0
      ? Math.round(
          (opportunityScores.reduce((a, b) => a + b, 0) /
            opportunityScores.length) *
            10
        ) / 10
      : 0;

  const avgDiversity =
    diversityScores.length > 0
      ? Math.round(
          (diversityScores.reduce((a, b) => a + b, 0) / diversityScores.length) *
            10
        ) / 10
      : 0;

  const report = {
    generated: results.length,
    errors: errors.length,
    categoryDistribution,
    uniqueCategories: Object.keys(categoryDistribution).length,
    scoreDistribution,
    averageScore: avgScore,
    averageDiversityScore: avgDiversity,
    highestScore: opportunityScores.length ? Math.max(...opportunityScores) : null,
    lowestScore: opportunityScores.length ? Math.min(...opportunityScores) : null,
    duplicateRatePct: duplicateRate(results),
    duplicateConceptCount: results.filter((row) => row.isDuplicate).length,
    results,
    errors,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

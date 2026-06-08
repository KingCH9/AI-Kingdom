import type { ClaudeOpportunityResponse } from "@/lib/types";
import { deriveScoresFromClaudeResponse, deriveScoresLegacy } from "./derive-scores";
import { buildOpportunityScores } from "./scoring";
import { meetsLaunchReadyCriteria, meetsValidatedCriteria } from "./status";
import { evaluateCeoDecision } from "./evaluate-ceo-decision";
import { evaluateValidationDecision } from "./validate-opportunity";
import type { Opportunity } from "@prisma/client";

/** Deterministic pseudo-random for reproducible calibration sims. */
function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function pick(seed: number, min: number, max: number): number {
  return Math.floor(min + seededUnit(seed) * (max - min + 1));
}

const CATEGORIES = [
  "Pets",
  "Home & Kitchen",
  "Automotive",
  "Gardening",
  "Baby",
  "Office",
  "DIY",
  "Sports",
  "Travel",
  "Outdoor",
  "Electronics Accessories",
  "Health",
];

export type ScoringBatchMetrics = {
  label: string;
  count: number;
  averageScore: number;
  scoreStdDev: number;
  highestScore: number | null;
  lowestScore: number | null;
  scoreDistribution: Record<number, number>;
  launchReadyCount: number;
  launchReadyPct: number;
  validatedCount: number;
  validatedPct: number;
  rejectedCount: number;
  rejectedPct: number;
  ceoHoldCount: number;
  ceoHoldPct: number;
  ceoApproveCount: number;
  ceoApprovePct: number;
  uniqueCategories: number;
  categoryDistribution: Record<string, number>;
  duplicateProductRatePct: number;
};

/**
 * Synthetic Claude responses with tiered signal quality (strong / validated / weak).
 * Used for offline calibration when the Anthropic API is unavailable.
 */
export function generateSyntheticClaudeBatch(
  count: number
): ClaudeOpportunityResponse[] {
  const rows: ClaudeOpportunityResponse[] = [];

  for (let i = 1; i <= count; i++) {
    const tierRoll = seededUnit(i * 3);
    const tier =
      tierRoll < 0.15 ? "strong" : tierRoll < 0.7 ? "validated" : "weak";

    const margin = pick(i * 5, 65, 78);
    const risk = pick(i * 7, 2, 4);

    let trendStrength: number;
    let searchGrowth: number;
    let sourcingEase: number;
    let competitionEstimate: number;

    if (tier === "strong") {
      trendStrength = pick(i * 11, 86, 96);
      searchGrowth = pick(i * 13, 82, 94);
      sourcingEase = pick(i * 17, 74, 92);
      competitionEstimate = pick(i * 19, 12, 30);
    } else if (tier === "validated") {
      trendStrength = pick(i * 11, 70, 84);
      searchGrowth = pick(i * 13, 66, 80);
      sourcingEase = pick(i * 17, 62, 78);
      competitionEstimate = pick(i * 19, 26, 42);
    } else {
      trendStrength = pick(i * 11, 38, 58);
      searchGrowth = pick(i * 13, 35, 55);
      sourcingEase = pick(i * 17, 32, 52);
      competitionEstimate = pick(i * 19, 48, 68);
    }

    rows.push({
      productName: `${CATEGORIES[i % CATEGORIES.length]} Product ${i}`,
      category: CATEGORIES[i % CATEGORIES.length],
      profitMargin: `${margin}%`,
      riskRating: risk,
      trendStrength,
      searchGrowth,
      sourcingEase,
      competitionEstimate,
      demandSignalsComposite: pick(i * 23, 55, 85),
      opportunityScore: pick(i * 29, 70, 92),
    });
  }

  return rows;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

function toOpportunity(
  score: number,
  input: ReturnType<typeof deriveScoresFromClaudeResponse>
): Opportunity {
  return {
    id: 1,
    productName: "Sim",
    profitMargin: `${input.profitMargin}%`,
    demandScore: input.demandScore,
    competition: input.competition,
    riskRating: input.riskRating,
    opportunityScore: score,
    status: "validated",
  } as Opportunity;
}

export function analyzeScoringBatch(
  label: string,
  batch: ClaudeOpportunityResponse[],
  derive: (data: ClaudeOpportunityResponse) => ReturnType<
    typeof deriveScoresFromClaudeResponse
  >
): ScoringBatchMetrics {
  const rows = batch.map((data) => {
    const input = derive(data);
    const score = buildOpportunityScores(input).opportunityScore;
    return { data, input, score };
  });

  const scores = rows.map((row) => row.score);
  const categories: Record<string, number> = {};
  const productNames: string[] = [];

  let launchReady = 0;
  let validated = 0;
  let rejected = 0;
  let ceoHold = 0;
  let ceoApprove = 0;

  for (const row of rows) {
    const category = row.data.category ?? "Unknown";
    categories[category] = (categories[category] ?? 0) + 1;
    productNames.push(row.data.productName ?? "");

    if (meetsLaunchReadyCriteria(row.input)) launchReady += 1;
    if (meetsValidatedCriteria(row.input)) validated += 1;
    else rejected += 1;

    const opp = toOpportunity(row.score, row.input);
    const validator = evaluateValidationDecision(opp);
    if (validator === "reject") {
      /* counted in rejected */
    }

    const ceo = evaluateCeoDecision(opp);
    if (ceo === "hold") ceoHold += 1;
    if (ceo === "approve") ceoApprove += 1;
  }

  const uniqueNames = new Set(productNames.filter(Boolean));
  const duplicateRate =
    productNames.length > 0
      ? pct(productNames.length - uniqueNames.size, productNames.length)
      : 0;

  const dist: Record<number, number> = {};
  for (const s of scores) dist[s] = (dist[s] ?? 0) + 1;

  return {
    label,
    count: rows.length,
    averageScore:
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10
        : 0,
    scoreStdDev: stdDev(scores),
    highestScore: scores.length ? Math.max(...scores) : null,
    lowestScore: scores.length ? Math.min(...scores) : null,
    scoreDistribution: dist,
    launchReadyCount: launchReady,
    launchReadyPct: pct(launchReady, rows.length),
    validatedCount: validated,
    validatedPct: pct(validated, rows.length),
    rejectedCount: rejected,
    rejectedPct: pct(rejected, rows.length),
    ceoHoldCount: ceoHold,
    ceoHoldPct: pct(ceoHold, rows.length),
    ceoApproveCount: ceoApprove,
    ceoApprovePct: pct(ceoApprove, rows.length),
    uniqueCategories: Object.keys(categories).length,
    categoryDistribution: categories,
    duplicateProductRatePct: duplicateRate,
  };
}

export type ScoringSimulationReport = {
  mode: "simulation";
  count: number;
  before: ScoringBatchMetrics;
  after: ScoringBatchMetrics;
};

/** Offline before/after scoring report for calibration targets. */
export function runScoringSimulation(count: number): ScoringSimulationReport {
  const batch = generateSyntheticClaudeBatch(count);

  return {
    mode: "simulation",
    count,
    before: analyzeScoringBatch("Phase D1 legacy", batch, deriveScoresLegacy),
    after: analyzeScoringBatch(
      "Phase D2 structured",
      batch,
      deriveScoresFromClaudeResponse
    ),
  };
}

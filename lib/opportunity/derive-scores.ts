import type { ClaudeOpportunityResponse, OpportunityScoreInput } from "@/lib/types";
import { parseProfitMargin } from "./parse-margin";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Deterministic risk rating when Claude omits or sends an invalid value.
 * Higher profit margin implies lower operational risk.
 */
function deriveRiskRating(
  riskRating: number | undefined,
  profitMargin: number
): number {
  const parsed = Number(riskRating);

  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) {
    return Math.floor(parsed);
  }

  return clamp(10 - Math.floor(profitMargin / 12), 1, 10);
}

/**
 * Demand score from Claude opportunityScore when valid; otherwise a margin/risk formula.
 */
function deriveDemandScore(
  claudeScore: number | undefined,
  profitMargin: number,
  riskRating: number
): number {
  const parsed = Number(claudeScore);

  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
    return Math.floor(parsed);
  }

  const raw = profitMargin * 0.55 + (10 - riskRating) * 4.5;
  return clamp(Math.floor(raw), 0, 100);
}

/**
 * Competition estimate inversely related to demand and margin.
 * No randomness — same inputs always produce the same score.
 */
function deriveCompetition(
  demandScore: number,
  profitMargin: number,
  riskRating: number
): number {
  const raw =
    100 - demandScore * 0.65 - profitMargin * 0.25 + riskRating * 1.5;
  return clamp(Math.floor(raw), 0, 100);
}

/**
 * Derives deterministic opportunity metrics from Claude output.
 *
 * Strategy:
 * 1. profitMargin — parsed from Claude string (e.g. "65%")
 * 2. riskRating — Claude value when valid, else margin-based fallback
 * 3. demandScore — Claude opportunityScore when valid, else margin/risk formula
 * 4. competition — inverse function of demand, margin, and risk
 */
export function deriveScoresFromClaudeResponse(
  data: ClaudeOpportunityResponse
): OpportunityScoreInput {
  const profitMargin = parseProfitMargin(data.profitMargin);
  const riskRating = deriveRiskRating(data.riskRating, profitMargin);
  const demandScore = deriveDemandScore(
    data.opportunityScore,
    profitMargin,
    riskRating
  );
  const competition = deriveCompetition(demandScore, profitMargin, riskRating);

  return {
    demandScore,
    competition,
    riskRating,
    profitMargin,
  };
}

import type { ClaudeOpportunityResponse, OpportunityScoreInput } from "@/lib/types";
import {
  COMPETITION_BLEND,
  DEMAND_SIGNAL_WEIGHTS,
} from "./thresholds";
import { parseProfitMargin } from "./parse-margin";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseScore0to100(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return clamp(Math.floor(parsed), 0, 100);
  }
  return fallback;
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

/** Fallback demand when structured signals are absent — margin/risk only (not Claude self-score). */
function deriveDemandScoreFallback(
  profitMargin: number,
  riskRating: number
): number {
  const raw = profitMargin * 0.55 + (10 - riskRating) * 4.5;
  return clamp(Math.floor(raw), 0, 100);
}

/** Resolves searchGrowth from top-level or legacy nested demandSignals. */
function resolveSearchGrowth(
  data: ClaudeOpportunityResponse,
  fallback: number
): number {
  if (data.searchGrowth !== undefined) {
    return parseScore0to100(data.searchGrowth, fallback);
  }
  return parseScore0to100(data.demandSignals?.searchGrowth, fallback);
}

/** Resolves sourcingEase from top-level or legacy nested demandSignals. */
function resolveSourcingEase(
  data: ClaudeOpportunityResponse,
  fallback: number
): number {
  if (data.sourcingEase !== undefined) {
    return parseScore0to100(data.sourcingEase, fallback);
  }
  return parseScore0to100(data.demandSignals?.sourcingEase, fallback);
}

/** Resolves demandSignalsComposite from top-level or legacy otherFactors average. */
export function resolveDemandSignalsComposite(
  data: ClaudeOpportunityResponse,
  fallback: number
): number {
  if (data.demandSignalsComposite !== undefined) {
    return parseScore0to100(data.demandSignalsComposite, fallback);
  }

  const otherFactors = data.demandSignals?.otherFactors;
  if (!otherFactors) {
    return fallback;
  }

  const values = Object.values(otherFactors).filter(
    (value) => typeof value === "number" && Number.isFinite(value)
  );

  if (values.length === 0) {
    return fallback;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return clamp(Math.floor(average), 0, 100);
}

/**
 * Phase D2 demand score from structured Claude signals.
 * demandScore =
 *   0.40 × trendStrength +
 *   0.30 × searchGrowth +
 *   0.20 × sourcingEase +
 *   0.10 × demandSignalsComposite
 *
 * Claude opportunityScore is never used here.
 */
export function deriveDemandScoreFromSignals(
  data: ClaudeOpportunityResponse,
  profitMargin: number,
  riskRating: number
): number {
  const fallback = deriveDemandScoreFallback(profitMargin, riskRating);
  const trendStrength = parseScore0to100(data.trendStrength, fallback);
  const searchGrowth = resolveSearchGrowth(data, fallback);
  const sourcingEase = resolveSourcingEase(data, fallback);
  const demandSignalsComposite = resolveDemandSignalsComposite(data, fallback);

  const raw =
    trendStrength * DEMAND_SIGNAL_WEIGHTS.TREND_STRENGTH +
    searchGrowth * DEMAND_SIGNAL_WEIGHTS.SEARCH_GROWTH +
    sourcingEase * DEMAND_SIGNAL_WEIGHTS.SOURCING_EASE +
    demandSignalsComposite * DEMAND_SIGNAL_WEIGHTS.DEMAND_SIGNALS_COMPOSITE;

  return clamp(Math.floor(raw), 0, 100);
}

/**
 * Competition: blend Claude estimate with deterministic derived value.
 * competitionScore = 0.5 × derivedCompetition + 0.5 × competitionEstimate
 */
function deriveCompetition(
  data: ClaudeOpportunityResponse,
  demandScore: number,
  profitMargin: number,
  riskRating: number
): number {
  const derived = clamp(
    Math.floor(
      100 - demandScore * 0.65 - profitMargin * 0.25 + riskRating * 1.5
    ),
    0,
    100
  );

  const claudeEstimate = parseScore0to100(data.competitionEstimate, derived);
  return clamp(
    Math.floor(
      claudeEstimate * COMPETITION_BLEND.CLAUDE +
        derived * COMPETITION_BLEND.DERIVED
    ),
    0,
    100
  );
}

export type DerivedScoreMetadata = {
  claudeSelfScore: number | null;
  demandFromSignals: number;
};

/**
 * Derives deterministic opportunity metrics from Claude output (Phase D2).
 */
export function deriveScoresFromClaudeResponse(
  data: ClaudeOpportunityResponse
): OpportunityScoreInput {
  const profitMargin = parseProfitMargin(data.profitMargin);
  const riskRating = deriveRiskRating(data.riskRating, profitMargin);
  const demandScore = deriveDemandScoreFromSignals(
    data,
    profitMargin,
    riskRating
  );
  const competition = deriveCompetition(
    data,
    demandScore,
    profitMargin,
    riskRating
  );

  return {
    demandScore,
    competition,
    riskRating,
    profitMargin,
  };
}

/** Metadata for logging Claude self-score cross-check. */
export function deriveScoreMetadata(
  data: ClaudeOpportunityResponse,
  scoreInput: OpportunityScoreInput
): DerivedScoreMetadata {
  const parsed = Number(data.opportunityScore);
  return {
    claudeSelfScore:
      Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
        ? Math.floor(parsed)
        : null,
    demandFromSignals: scoreInput.demandScore,
  };
}

/** @deprecated Phase D1 scoring — used only for calibration before/after reports. */
export function deriveScoresLegacy(
  data: ClaudeOpportunityResponse
): OpportunityScoreInput {
  const profitMargin = parseProfitMargin(data.profitMargin);
  const riskRating = deriveRiskRating(data.riskRating, profitMargin);

  const parsed = Number(data.opportunityScore);
  let demandScore: number;
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
    demandScore = Math.floor(parsed);
  } else {
    demandScore = deriveDemandScoreFallback(profitMargin, riskRating);
  }

  const competition = clamp(
    Math.floor(
      100 - demandScore * 0.65 - profitMargin * 0.25 + riskRating * 1.5
    ),
    0,
    100
  );

  return { demandScore, competition, riskRating, profitMargin };
}

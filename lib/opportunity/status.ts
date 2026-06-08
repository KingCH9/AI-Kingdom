import type {
  AnyOpportunityStatus,
  OpportunityScoreInput,
  OpportunityStatus,
} from "@/lib/types";
import { OPPORTUNITY_THRESHOLDS } from "./thresholds";
import { computeOpportunityScore } from "./scoring";

/** Status assigned at opportunity creation — always researching. */
export type InitialOpportunityStatus = "researching";

/**
 * Returns the initial status for newly created opportunities.
 * Atlas (Validator) owns the researching → validated transition.
 */
export function getInitialOpportunityStatus(): InitialOpportunityStatus {
  return "researching";
}

/**
 * @deprecated Use getInitialOpportunityStatus — creation never auto-validates.
 */
export function determineOpportunityStatus(
  _input?: OpportunityScoreInput
): InitialOpportunityStatus {
  return "researching";
}

/** Returns true when metrics meet validated gates (score >= 70). */
export function meetsValidatedCriteria(input: OpportunityScoreInput): boolean {
  const opportunityScore = computeOpportunityScore(input);
  return opportunityScore >= OPPORTUNITY_THRESHOLDS.VALIDATED_MIN_SCORE;
}

/**
 * Returns true when metrics meet launch_ready gates.
 * Used for CEO queue hints — does NOT assign status.
 */
export function meetsLaunchReadyCriteria(
  input: OpportunityScoreInput
): boolean {
  const opportunityScore = computeOpportunityScore(input);
  const {
    LAUNCH_READY_MIN_SCORE,
    LAUNCH_READY_MAX_RISK,
    LAUNCH_READY_MAX_COMPETITION,
    LAUNCH_READY_MIN_PROFIT_MARGIN,
  } = OPPORTUNITY_THRESHOLDS;

  return (
    opportunityScore >= LAUNCH_READY_MIN_SCORE &&
    input.riskRating <= LAUNCH_READY_MAX_RISK &&
    input.competition <= LAUNCH_READY_MAX_COMPETITION &&
    input.profitMargin >= LAUNCH_READY_MIN_PROFIT_MARGIN
  );
}

/** @deprecated Use meetsLaunchReadyCriteria. */
export function isLaunchReady(input: OpportunityScoreInput): boolean {
  return meetsLaunchReadyCriteria(input);
}

/**
 * Maps legacy "approved" status (worker/seed) to the canonical validated status.
 */
export function normalizeOpportunityStatus(
  status: AnyOpportunityStatus | string
): OpportunityStatus {
  if (status === "approved") {
    return "validated";
  }

  const canonical: OpportunityStatus[] = [
    "researching",
    "validated",
    "launch_ready",
    "sourcing",
    "building",
    "launched",
    "scaling",
    "profitable",
    "killed",
  ];

  if (canonical.includes(status as OpportunityStatus)) {
    return status as OpportunityStatus;
  }

  return "researching";
}

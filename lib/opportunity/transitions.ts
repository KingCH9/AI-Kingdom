import type { OpportunityStatus } from "@/lib/types";
import { normalizeOpportunityStatus } from "./status";

/** All canonical opportunity lifecycle statuses in workflow order. */
export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
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

/**
 * Operator workflow transitions.
 * researching → validated/killed is validator-only (Atlas).
 * validated → launch_ready is CEO-only (Alpha).
 */
export const WORKFLOW_TRANSITIONS: Record<
  OpportunityStatus,
  OpportunityStatus[]
> = {
  researching: [],
  validated: ["killed"],
  launch_ready: ["building", "sourcing", "killed"],
  sourcing: ["building", "killed"],
  building: ["launched", "killed"],
  launched: ["scaling", "profitable", "killed"],
  scaling: ["profitable", "killed"],
  profitable: ["killed"],
  killed: [],
};

/** Atlas may approve or reject researching opportunities. */
export const VALIDATOR_TRANSITIONS: OpportunityStatus[] = [
  "validated",
  "killed",
];

/** Alpha may approve or reject validated opportunities for launch. */
export const CEO_TRANSITIONS: OpportunityStatus[] = ["launch_ready", "killed"];

export type StatusTransitionActor = "ceo" | "validator" | "operator";

/** Returns statuses an actor may transition to from the current status. */
export function getAllowedTransitions(
  currentStatus: string,
  actor: StatusTransitionActor = "operator"
): OpportunityStatus[] {
  const normalized = normalizeOpportunityStatus(currentStatus);

  if (actor === "validator" && normalized === "researching") {
    return VALIDATOR_TRANSITIONS;
  }

  if (actor === "ceo" && normalized === "validated") {
    return CEO_TRANSITIONS;
  }

  return WORKFLOW_TRANSITIONS[normalized] ?? [];
}

/** Validates whether a manual status transition is permitted for operator actor. */
export function isValidTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const from = normalizeOpportunityStatus(fromStatus);
  const to = normalizeOpportunityStatus(toStatus);

  if (from === to) {
    return false;
  }

  if (to === "launch_ready" || to === "validated") {
    return false;
  }

  if (from === "researching" && to === "killed") {
    return false;
  }

  return getAllowedTransitions(from, "operator").includes(to);
}

/** Atlas may only act on researching opportunities. */
export function isValidatorTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const from = normalizeOpportunityStatus(fromStatus);
  return (
    from === "researching" &&
    (toStatus === "validated" || toStatus === "killed")
  );
}

/** Alpha may only act on validated opportunities. */
export function isCeoTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const from = normalizeOpportunityStatus(fromStatus);
  return (
    from === "validated" &&
    (toStatus === "launch_ready" || toStatus === "killed")
  );
}

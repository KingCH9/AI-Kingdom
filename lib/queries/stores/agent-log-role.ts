import { AGENT_NAMES } from "@/lib/types";
import type { StoreAgentLogEntry } from "./types";

export function resolveAgentLogRole(agentName: string): StoreAgentLogEntry["agentRole"] {
  if (agentName === AGENT_NAMES.CEO) {
    return "ceo";
  }
  if (agentName === AGENT_NAMES.VALIDATOR) {
    return "validator";
  }
  if (agentName === AGENT_NAMES.STORE_BUILDER) {
    return "store_builder";
  }
  if (agentName === AGENT_NAMES.MARKETING_MANAGER) {
    return "marketing";
  }
  return "other";
}

export const AGENT_ROLE_LABELS: Record<StoreAgentLogEntry["agentRole"], string> = {
  ceo: "Alpha (CEO)",
  validator: "Atlas (Validator)",
  store_builder: "Forge (Store Builder)",
  marketing: "Gamma (Marketing)",
  other: "Other",
};

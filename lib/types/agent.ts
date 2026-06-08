/**
 * Canonical agent role identifiers.
 * Stored in Agent.role — use these constants everywhere (case-sensitive).
 */
export const AGENT_ROLES = {
  CEO: "CEO",
  TREND_HUNTER: "Trend Hunter",
  PRODUCT_RESEARCHER: "Product Researcher",
  STORE_BUILDER: "Store Builder",
  BRAND_MANAGER: "Brand Manager",
  MARKETING_MANAGER: "Marketing Manager",
  MEDIA_BUYER: "Media Buyer",
  FINANCE_MANAGER: "Finance Manager",
  OPERATIONS_MANAGER: "Operations Manager",
  VALIDATOR: "Validator",
  GROWTH: "Growth",
} as const;

export type AgentRole = (typeof AGENT_ROLES)[keyof typeof AGENT_ROLES];

/**
 * Canonical display names for core seeded agents.
 * Routes should resolve agents by role; names are for seed data and logs.
 */
export const AGENT_NAMES = {
  CEO: "Alpha",
  TREND_HUNTER: "Scout",
  STORE_BUILDER: "Forge",
  VALIDATOR: "Atlas",
  MARKETING_MANAGER: "Gamma",
} as const;

export type AgentName = (typeof AGENT_NAMES)[keyof typeof AGENT_NAMES];

export type AgentStatus = "active" | "idle" | "disabled";

export interface AgentRecord {
  id: number;
  name: string;
  role: string;
  level: number;
  xp: number;
  status: string;
  createdAt: Date;
}

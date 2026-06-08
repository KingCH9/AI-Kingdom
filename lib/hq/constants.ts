/** HQ department keys — visual zones on /hq */
export const DEPARTMENT_KEYS = {
  CEO_OFFICE: "ceo_office",
  RESEARCH_LAB: "research_lab",
  BUILDER_WORKSHOP: "builder_workshop",
  GROWTH: "growth",
  FINANCE: "finance",
} as const;

export type DepartmentKey =
  (typeof DEPARTMENT_KEYS)[keyof typeof DEPARTMENT_KEYS];

/** Five primary HQ personas */
export const HQ_PERSONAS = {
  ATLAS: "atlas",
  ATHENA: "athena",
  FORGE: "forge",
  NOVA: "nova",
  MERCURY: "mercury",
} as const;

export type HqPersona = (typeof HQ_PERSONAS)[keyof typeof HQ_PERSONAS];

export const MISSION_STATUSES = {
  RESEARCHING: "researching",
  VALIDATING: "validating",
  APPROVED: "approved",
  BUILDING: "building",
  LAUNCHING: "launching",
  GROWING: "growing",
  PROFITABLE: "profitable",
  KILLED: "killed",
  BLOCKED: "blocked",
} as const;

export type MissionStatus =
  (typeof MISSION_STATUSES)[keyof typeof MISSION_STATUSES];

export const MISSION_PHASES = {
  RESEARCH: "research",
  VALIDATE: "validate",
  BUILD: "build",
  LAUNCH: "launch",
  GROW: "grow",
} as const;

export type MissionPhase =
  (typeof MISSION_PHASES)[keyof typeof MISSION_PHASES];

export const HQ_AGENT_STATUSES = {
  ACTIVE: "active",
  IDLE: "idle",
  BLOCKED: "blocked",
  RESEARCHING: "researching",
  BUILDING: "building",
  LAUNCHING: "launching",
} as const;

export type HqAgentStatus =
  (typeof HQ_AGENT_STATUSES)[keyof typeof HQ_AGENT_STATUSES];

export const REVENUE_STREAMS_TIER1 = [
  "shopify",
  "etsy",
  "digital",
  "affiliate",
  "content",
] as const;

export const DEFAULT_DEPARTMENT_BUDGETS_GBP: Record<DepartmentKey, number> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: 10,
  [DEPARTMENT_KEYS.RESEARCH_LAB]: 35,
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: 25,
  [DEPARTMENT_KEYS.GROWTH]: 20,
  [DEPARTMENT_KEYS.FINANCE]: 10,
};

export function currentBudgetPeriodMonth(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

import { AGENT_ROLES } from "@/lib/types";
import {
  DEPARTMENT_KEYS,
  HQ_PERSONAS,
  type DepartmentKey,
  type HqPersona,
} from "./constants";

export type HqPersonaDefinition = {
  persona: HqPersona;
  displayName: string;
  title: string;
  departmentKey: DepartmentKey;
  avatarEmoji: string;
  pipelineRoles: string[];
  subAgents: string[];
  successMetrics: string[];
};

export const HQ_PERSONA_REGISTRY: Record<HqPersona, HqPersonaDefinition> = {
  [HQ_PERSONAS.ATLAS]: {
    persona: HQ_PERSONAS.ATLAS,
    displayName: "Atlas",
    title: "Chief Executive",
    departmentKey: DEPARTMENT_KEYS.CEO_OFFICE,
    avatarEmoji: "👔",
    pipelineRoles: [AGENT_ROLES.CEO],
    subAgents: ["Strategy", "Approval", "Compliance"],
    successMetrics: ["ROI", "Net profit", "Venture success rate"],
  },
  [HQ_PERSONAS.ATHENA]: {
    persona: HQ_PERSONAS.ATHENA,
    displayName: "Athena",
    title: "Head of Research",
    departmentKey: DEPARTMENT_KEYS.RESEARCH_LAB,
    avatarEmoji: "🔬",
    pipelineRoles: [
      AGENT_ROLES.TREND_HUNTER,
      AGENT_ROLES.VALIDATOR,
      AGENT_ROLES.PRODUCT_RESEARCHER,
    ],
    subAgents: [
      "Shopify Scout",
      "Etsy Scout",
      "Affiliate Scout",
      "Content Scout",
      "SaaS Scout",
      "Amazon Scout",
    ],
    successMetrics: [
      "Opportunities found",
      "Opportunities approved",
      "Revenue generated",
    ],
  },
  [HQ_PERSONAS.FORGE]: {
    persona: HQ_PERSONAS.FORGE,
    displayName: "Forge",
    title: "Head of Builder",
    departmentKey: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
    avatarEmoji: "🔨",
    pipelineRoles: [
      AGENT_ROLES.STORE_BUILDER,
      AGENT_ROLES.OPERATIONS_MANAGER,
    ],
    subAgents: [
      "Store Builder",
      "Listing Builder",
      "Landing Page Builder",
      "SaaS Builder",
      "QA Inspector",
    ],
    successMetrics: ["Projects launched", "Revenue per project"],
  },
  [HQ_PERSONAS.NOVA]: {
    persona: HQ_PERSONAS.NOVA,
    displayName: "Nova",
    title: "Head of Growth",
    departmentKey: DEPARTMENT_KEYS.GROWTH,
    avatarEmoji: "📈",
    pipelineRoles: [
      AGENT_ROLES.MARKETING_MANAGER,
      AGENT_ROLES.MEDIA_BUYER,
      AGENT_ROLES.GROWTH,
    ],
    subAgents: [
      "SEO Specialist",
      "Social Specialist",
      "Campaign Manager",
      "Analytics Specialist",
    ],
    successMetrics: ["Traffic", "Leads", "Conversions", "Sales"],
  },
  [HQ_PERSONAS.MERCURY]: {
    persona: HQ_PERSONAS.MERCURY,
    displayName: "Mercury",
    title: "Head of Finance",
    departmentKey: DEPARTMENT_KEYS.FINANCE,
    avatarEmoji: "💰",
    pipelineRoles: [AGENT_ROLES.FINANCE_MANAGER],
    subAgents: ["Budget Controller", "ROI Analyst", "Cost Monitor"],
    successMetrics: ["Net profit", "ROI", "Runway"],
  },
};

export const DEPARTMENT_PERSONA_MAP: Record<DepartmentKey, HqPersona> = {
  [DEPARTMENT_KEYS.CEO_OFFICE]: HQ_PERSONAS.ATLAS,
  [DEPARTMENT_KEYS.RESEARCH_LAB]: HQ_PERSONAS.ATHENA,
  [DEPARTMENT_KEYS.BUILDER_WORKSHOP]: HQ_PERSONAS.FORGE,
  [DEPARTMENT_KEYS.GROWTH]: HQ_PERSONAS.NOVA,
  [DEPARTMENT_KEYS.FINANCE]: HQ_PERSONAS.MERCURY,
};

export function getPersonaForDepartment(key: DepartmentKey): HqPersonaDefinition {
  return HQ_PERSONA_REGISTRY[DEPARTMENT_PERSONA_MAP[key]];
}

export function getPersonaByPipelineRole(role: string): HqPersona | null {
  for (const def of Object.values(HQ_PERSONA_REGISTRY)) {
    if (def.pipelineRoles.includes(role)) {
      return def.persona;
    }
  }
  return null;
}

export function getDepartmentKeyForPersona(persona: HqPersona): DepartmentKey {
  return HQ_PERSONA_REGISTRY[persona].departmentKey;
}

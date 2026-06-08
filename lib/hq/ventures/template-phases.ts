import { HQ_PERSONAS, VENTURE_TEMPLATE_KEYS } from "../constants";

export type TemplatePhaseSeed = {
  phase: string;
  title: string;
  ownerPersona: string;
  sortOrder: number;
};

const SHOPIFY_PHASES: TemplatePhaseSeed[] = [
  { phase: "research", title: "Research market opportunity", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 0 },
  { phase: "validate", title: "Validate venture metrics", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 1 },
  { phase: "build", title: "Build store and product assets", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 2 },
  { phase: "launch", title: "Launch marketing and go live", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 3 },
  { phase: "grow", title: "Grow traffic and conversions", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 4 },
];

const ETSY_PHASES: TemplatePhaseSeed[] = [
  { phase: "research", title: "Research Etsy niche and demand", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 0 },
  { phase: "validate", title: "Validate printable product metrics", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 1 },
  { phase: "create_assets", title: "Create printable assets", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 2 },
  { phase: "publish", title: "Publish Etsy listings", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 3 },
  { phase: "grow", title: "Grow Etsy sales and reviews", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 4 },
];

const AFFILIATE_PHASES: TemplatePhaseSeed[] = [
  { phase: "research", title: "Research affiliate niche", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 0 },
  { phase: "validate", title: "Validate traffic and commission potential", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 1 },
  { phase: "build_site", title: "Build affiliate site", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 2 },
  { phase: "content", title: "Publish comparison and review content", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 3 },
  { phase: "monetize", title: "Monetize with affiliate links", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 4 },
];

const CONTENT_PHASES: TemplatePhaseSeed[] = [
  { phase: "research", title: "Research content niche", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 0 },
  { phase: "validate", title: "Validate audience and monetization", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 1 },
  { phase: "build", title: "Build content platform", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 2 },
  { phase: "launch", title: "Launch content calendar", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 3 },
  { phase: "grow", title: "Grow audience and revenue", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 4 },
];

const SAAS_PHASES: TemplatePhaseSeed[] = [
  { phase: "research", title: "Research SaaS problem space", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 0 },
  { phase: "validate", title: "Validate demand and pricing", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 1 },
  { phase: "build_mvp", title: "Build MVP", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 2 },
  { phase: "beta", title: "Run beta with early users", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 3 },
  { phase: "launch", title: "Launch and acquire customers", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 4 },
];

const AMAZON_PHASES: TemplatePhaseSeed[] = [
  { phase: "research", title: "Research Amazon product niche", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 0 },
  { phase: "validate", title: "Validate FBA economics", ownerPersona: HQ_PERSONAS.ATHENA, sortOrder: 1 },
  { phase: "source", title: "Source product and supplier", ownerPersona: HQ_PERSONAS.FORGE, sortOrder: 2 },
  { phase: "launch", title: "Launch Amazon listing", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 3 },
  { phase: "grow", title: "Scale PPC and rankings", ownerPersona: HQ_PERSONAS.NOVA, sortOrder: 4 },
];

export const TEMPLATE_PHASES: Record<string, TemplatePhaseSeed[]> = {
  [VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE]: SHOPIFY_PHASES,
  [VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE]: ETSY_PHASES,
  [VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE]: AFFILIATE_PHASES,
  [VENTURE_TEMPLATE_KEYS.CONTENT_SITE]: CONTENT_PHASES,
  [VENTURE_TEMPLATE_KEYS.SAAS_MVP]: SAAS_PHASES,
  [VENTURE_TEMPLATE_KEYS.AMAZON_FBA]: AMAZON_PHASES,
};

export function getPhasesForTemplate(templateKey: string): TemplatePhaseSeed[] {
  return TEMPLATE_PHASES[templateKey] ?? SHOPIFY_PHASES;
}

export function defaultMissionTitleForTemplate(
  templateName: string,
  customTitle?: string
): string {
  if (customTitle?.trim()) return customTitle.trim();
  return templateName;
}

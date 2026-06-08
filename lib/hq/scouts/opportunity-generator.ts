import {
  VENTURE_TEMPLATE_KEYS,
  VENTURE_TYPE_KEYS,
  type VentureTemplateKey,
  type VentureTypeKey,
} from "../constants";
import type { ScoutDefinition } from "./types";

export type ScoutOpportunityDraft = {
  scoutKey: string;
  ventureTypeKey: VentureTypeKey;
  templateKey: VentureTemplateKey;
  productName: string;
  productDescription: string;
  whyTrending: string;
  targetCustomer: string;
  category: string;
  demandScore: number;
  competition: number;
  opportunityScore: number;
  riskRating: number;
  profitMargin: string;
  sellingPrice: string;
};

export const SCOUT_CATEGORY_PREFIX = "hq_scout:";

export function scoutCategory(scoutKey: string): string {
  return `${SCOUT_CATEGORY_PREFIX}${scoutKey}`;
}

export function isScoutOpportunityCategory(category: string | null | undefined): boolean {
  return Boolean(category?.startsWith(SCOUT_CATEGORY_PREFIX));
}

const VENTURE_TEMPLATE_BY_TYPE: Record<VentureTypeKey, VentureTemplateKey> = {
  [VENTURE_TYPE_KEYS.SHOPIFY]: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
  [VENTURE_TYPE_KEYS.ETSY]: VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE,
  [VENTURE_TYPE_KEYS.AFFILIATE]: VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE,
  [VENTURE_TYPE_KEYS.CONTENT]: VENTURE_TEMPLATE_KEYS.CONTENT_SITE,
  [VENTURE_TYPE_KEYS.SAAS]: VENTURE_TEMPLATE_KEYS.SAAS_MVP,
  [VENTURE_TYPE_KEYS.AMAZON]: VENTURE_TEMPLATE_KEYS.AMAZON_FBA,
  [VENTURE_TYPE_KEYS.AGENCY]: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
  [VENTURE_TYPE_KEYS.LICENSING]: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
  [VENTURE_TYPE_KEYS.ACQUISITIONS]: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
};

type IdeaSeed = {
  productName: string;
  productDescription: string;
  whyTrending: string;
  targetCustomer: string;
  demandScore: number;
  competition: number;
  opportunityScore: number;
  riskRating: number;
  profitMargin: string;
  sellingPrice: string;
};

const SCOUT_IDEA_POOL: Record<VentureTypeKey, IdeaSeed[]> = {
  [VENTURE_TYPE_KEYS.SHOPIFY]: [
    {
      productName: "Portable Red Light Therapy Wand",
      productDescription: "Compact at-home red light device for skin and recovery.",
      whyTrending: "Wellness biohacking demand on TikTok.",
      targetCustomer: "Health-conscious adults 25–45",
      demandScore: 78,
      competition: 35,
      opportunityScore: 72,
      riskRating: 3,
      profitMargin: "68%",
      sellingPrice: "£49.99",
    },
    {
      productName: "Magnetic Under-Desk Elliptical",
      productDescription: "Quiet pedal exerciser for home office workers.",
      whyTrending: "Remote work fitness accessories growing.",
      targetCustomer: "Desk workers seeking movement",
      demandScore: 74,
      competition: 40,
      opportunityScore: 70,
      riskRating: 4,
      profitMargin: "62%",
      sellingPrice: "£79.99",
    },
  ],
  [VENTURE_TYPE_KEYS.ETSY]: [
    {
      productName: "Minimalist Wedding Planner Printable Bundle",
      productDescription: "Digital wedding planning worksheets and checklists.",
      whyTrending: "Etsy printable wedding niche remains strong.",
      targetCustomer: "Engaged couples planning DIY weddings",
      demandScore: 70,
      competition: 45,
      opportunityScore: 68,
      riskRating: 2,
      profitMargin: "85%",
      sellingPrice: "£12.99",
    },
    {
      productName: "Homeschool Weekly Schedule Templates",
      productDescription: "Printable planner pages for homeschool parents.",
      whyTrending: "Homeschool content demand on Pinterest.",
      targetCustomer: "Homeschooling parents",
      demandScore: 66,
      competition: 38,
      opportunityScore: 65,
      riskRating: 2,
      profitMargin: "90%",
      sellingPrice: "£8.99",
    },
  ],
  [VENTURE_TYPE_KEYS.AFFILIATE]: [
    {
      productName: "Best Standing Desks 2026 Comparison Site",
      productDescription: "Affiliate comparison hub for ergonomic desk buyers.",
      whyTrending: "High-intent buyer keywords with strong commissions.",
      targetCustomer: "Remote workers upgrading home offices",
      demandScore: 72,
      competition: 50,
      opportunityScore: 66,
      riskRating: 3,
      profitMargin: "75%",
      sellingPrice: "Affiliate commissions",
    },
    {
      productName: "VPN Comparison Hub for Privacy Seekers",
      productDescription: "Review and comparison content for VPN subscriptions.",
      whyTrending: "Privacy awareness driving recurring affiliate revenue.",
      targetCustomer: "Privacy-conscious consumers",
      demandScore: 68,
      competition: 55,
      opportunityScore: 64,
      riskRating: 3,
      profitMargin: "70%",
      sellingPrice: "Affiliate commissions",
    },
  ],
  [VENTURE_TYPE_KEYS.CONTENT]: [
    {
      productName: "AI Tools Weekly Newsletter",
      productDescription: "Curated newsletter covering AI productivity tools.",
      whyTrending: "Newsletter sponsorships in AI niche growing.",
      targetCustomer: "Tech professionals and founders",
      demandScore: 75,
      competition: 42,
      opportunityScore: 67,
      riskRating: 3,
      profitMargin: "80%",
      sellingPrice: "Sponsorship + ads",
    },
    {
      productName: "Side Hustle Case Study Blog",
      productDescription: "Content property documenting micro-business experiments.",
      whyTrending: "Audience demand for transparent build-in-public stories.",
      targetCustomer: "Aspiring entrepreneurs",
      demandScore: 69,
      competition: 36,
      opportunityScore: 63,
      riskRating: 2,
      profitMargin: "72%",
      sellingPrice: "Ads + digital products",
    },
  ],
  [VENTURE_TYPE_KEYS.SAAS]: [
    {
      productName: "Invoice Reminder Micro-SaaS",
      productDescription: "Automated payment reminder tool for freelancers.",
      whyTrending: "Micro-SaaS for solopreneurs trending on Indie Hackers.",
      targetCustomer: "Freelancers and small agencies",
      demandScore: 71,
      competition: 44,
      opportunityScore: 69,
      riskRating: 4,
      profitMargin: "78%",
      sellingPrice: "£9/mo",
    },
    {
      productName: "Client Onboarding Checklist SaaS",
      productDescription: "Template-driven client onboarding workflow tool.",
      whyTrending: "Agency ops automation demand increasing.",
      targetCustomer: "Agencies and consultants",
      demandScore: 67,
      competition: 48,
      opportunityScore: 65,
      riskRating: 4,
      profitMargin: "76%",
      sellingPrice: "£19/mo",
    },
  ],
  [VENTURE_TYPE_KEYS.AMAZON]: [
    {
      productName: "Silicone Kitchen Utensil Rest Set",
      productDescription: "Heat-resistant spoon rests for Amazon FBA.",
      whyTrending: "Kitchen gadget category stable on Amazon.",
      targetCustomer: "Home cooks on Amazon",
      demandScore: 73,
      competition: 52,
      opportunityScore: 64,
      riskRating: 5,
      profitMargin: "45%",
      sellingPrice: "£14.99",
    },
    {
      productName: "Travel Cable Organizer Pouch",
      productDescription: "Compact electronics organizer for FBA launch.",
      whyTrending: "Travel accessory demand recovering post-pandemic.",
      targetCustomer: "Frequent travelers",
      demandScore: 70,
      competition: 47,
      opportunityScore: 62,
      riskRating: 5,
      profitMargin: "42%",
      sellingPrice: "£16.99",
    },
  ],
  [VENTURE_TYPE_KEYS.AGENCY]: [],
  [VENTURE_TYPE_KEYS.LICENSING]: [],
  [VENTURE_TYPE_KEYS.ACQUISITIONS]: [],
};

function pickIdea(ideas: IdeaSeed[], salt = ""): IdeaSeed {
  const index =
    Math.abs(hashString(salt || String(Date.now()))) % ideas.length;
  return ideas[index]!;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function templateKeyForVentureType(
  ventureTypeKey: VentureTypeKey
): VentureTemplateKey {
  return VENTURE_TEMPLATE_BY_TYPE[ventureTypeKey];
}

/** Generate a scout opportunity draft — no Empire Pipeline side effects. */
export function generateScoutOpportunity(
  scout: ScoutDefinition,
  options?: { salt?: string }
): ScoutOpportunityDraft {
  const ideas = SCOUT_IDEA_POOL[scout.ventureTypeKey];
  if (!ideas.length) {
    throw new Error(`No idea pool for venture type ${scout.ventureTypeKey}`);
  }

  const idea = pickIdea(ideas, options?.salt ?? scout.key);
  const templateKey = templateKeyForVentureType(scout.ventureTypeKey);

  return {
    scoutKey: scout.key,
    ventureTypeKey: scout.ventureTypeKey,
    templateKey,
    productName: idea.productName,
    productDescription: idea.productDescription,
    whyTrending: idea.whyTrending,
    targetCustomer: idea.targetCustomer,
    category: scoutCategory(scout.key),
    demandScore: idea.demandScore,
    competition: idea.competition,
    opportunityScore: idea.opportunityScore,
    riskRating: idea.riskRating,
    profitMargin: idea.profitMargin,
    sellingPrice: idea.sellingPrice,
  };
}

export function generateAllScoutOpportunities(
  scouts: ScoutDefinition[]
): ScoutOpportunityDraft[] {
  return scouts.map((scout) => generateScoutOpportunity(scout));
}

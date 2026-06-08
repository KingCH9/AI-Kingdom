import type { DiversityContext } from "@/lib/opportunity/generation-diversity";
import { ROTATION_TARGET_CATEGORIES } from "@/lib/opportunity/generation-diversity";

const TARGET_CATEGORY_LIST = ROTATION_TARGET_CATEGORIES.join(", ");

/**
 * Builds the Claude prompt with diversity constraints from recent opportunities.
 */
export function buildOpportunityGenerationPrompt(
  context: DiversityContext
): string {
  const recentBlock =
    context.recent.length === 0
      ? "No recent opportunities in the database yet."
      : context.recent
          .map(
            (row, index) =>
              `${index + 1}. "${row.productName}" — category: ${row.category}, niche: ${row.niche}`
          )
          .join("\n");

  const doNotRepeatNames =
    context.doNotRepeat.productNames.length > 0
      ? context.doNotRepeat.productNames.map((name) => `- ${name}`).join("\n")
      : "- (none)";

  const doNotRepeatCategories =
    context.doNotRepeat.categories.length > 0
      ? context.doNotRepeat.categories.map((cat) => `- ${cat}`).join("\n")
      : "- (none)";

  const doNotRepeatNiches =
    context.doNotRepeat.niches.length > 0
      ? context.doNotRepeat.niches.map((niche) => `- ${niche}`).join("\n")
      : "- (none)";

  const blocked =
    context.blockedCategories.length > 0
      ? context.blockedCategories.join(", ")
      : "(none)";

  const preferred =
    context.preferredCategories.length > 0
      ? context.preferredCategories.slice(0, 6).join(", ")
      : TARGET_CATEGORY_LIST;

  return `
You are a world-class ecommerce strategist scouting diverse product opportunities for an autonomous ecommerce empire.

Your task is to identify ONE specific, novel ecommerce opportunity that is clearly different from recent discoveries.

## CATEGORY ROTATION (mandatory)

Choose the "category" field from this target list only:
${TARGET_CATEGORY_LIST}

Rules:
- Do NOT use any category used by the last 3 opportunities: ${blocked}
- Prefer underrepresented categories from recent history. Top picks now: ${preferred}
- Avoid wellness/red-light/sauna/posture-corrector clusters unless category is genuinely underrepresented and the product concept is structurally different
- Pick a specific niche within the category — not a generic category label

## DO NOT REPEAT (last ${context.recent.length} opportunities)

Recent opportunities:
${recentBlock}

Do NOT repeat these product names:
${doNotRepeatNames}

Do NOT repeat these categories (already saturated in recent batch):
${doNotRepeatCategories}

Do NOT repeat these niches/concepts:
${doNotRepeatNiches}

Avoid similar product concepts (same mechanism, same use case, same buyer, cosmetic rename).

## STRUCTURED SCORING SIGNALS (Phase D2 — required)

Provide honest numeric estimates (integers 0–100). These drive deterministic scoring — do NOT copy the same number into every field.

- trendStrength — overall market momentum for this niche right now
- competitionEstimate — how crowded the niche is (higher = more competitive)
- demandSignals.searchGrowth — search/social demand trajectory
- demandSignals.sourcingEase — ease of finding reliable suppliers
- demandSignals.otherFactors — optional object of numeric sub-scores, e.g. { "adPotential": 75, "marginStability": 80 }
- opportunityScore — your holistic self-assessment (logged for cross-check only; not used as demandScore)

## REQUIRED RATIONALE FIELDS

You MUST explain in dedicated fields:
- nicheDifferentiation — why this niche is structurally different from the recent opportunities above
- demandRationale — why demand exists now (trends, behavior shift, seasonality)
- competitionRationale — why competition is manageable for a new entrant

## ANALYSIS CRITERIA

Analyze:
- Current market trends
- Competition levels
- Profit margins
- Demand growth
- Ease of sourcing
- Advertising potential
- Long-term scalability

Return ONLY valid JSON in this exact format:

{
  "productName": "",
  "productDescription": "",
  "whyTrending": "",
  "targetCustomer": "",
  "sellingPrice": "",
  "estimatedCostPerUnit": "",
  "profitMargin": "",
  "marketingAngles": [],
  "tiktokIdeas": [],
  "facebookAdIdeas": [],
  "shopifyStoreNames": [],
  "supplierSearch": "",
  "alibabaKeywords": [],
  "launchPlan": [],
  "category": "",
  "nicheDifferentiation": "",
  "demandRationale": "",
  "competitionRationale": "",
  "trendStrength": 0,
  "competitionEstimate": 0,
  "demandSignals": {
    "searchGrowth": 0,
    "sourcingEase": 0,
    "otherFactors": {}
  },
  "riskRating": 0,
  "opportunityScore": 0
}

Do not include markdown.
Return raw JSON only.
`.trim();
}

/** @deprecated Use buildOpportunityGenerationPrompt with diversity context. */
export const OPPORTUNITY_GENERATION_PROMPT = buildOpportunityGenerationPrompt({
  recent: [],
  doNotRepeat: { productNames: [], categories: [], niches: [] },
  blockedCategories: [],
  preferredCategories: [...ROTATION_TARGET_CATEGORIES],
});

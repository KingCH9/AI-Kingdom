/**
 * Prompt template for Claude opportunity discovery.
 * Kept separate from route handlers so agents can reuse it later.
 */
export const OPPORTUNITY_GENERATION_PROMPT = `
You are a world-class ecommerce strategist.

Your task is to identify the single best ecommerce opportunity right now.

Analyze:
- Current market trends
- Competition levels
- Profit margins
- Demand growth
- Ease of sourcing
- Advertising potential
- Long-term scalability

Choose one specific ecommerce category for the "category" field (examples: Pets, Fitness, Beauty, Home, Tech, Fashion, Health, Baby, Outdoor).

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
  "riskRating": 0,
  "opportunityScore": 0
}

Do not include markdown.
Return raw JSON only.
`.trim();

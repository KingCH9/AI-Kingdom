import type { MarketingPlanInput } from "../types";

type ProductPagePromptInput = {
  productName: string;
  productDescription: string | null;
  targetCustomer: string | null;
  sellingPrice: string | null;
  price: number;
  category: string | null;
  marketingPlan: MarketingPlanInput;
};

export function buildProductPagePrompt(input: ProductPagePromptInput): string {
  const campaignNotes = input.marketingPlan.campaignNotes
    .slice(0, 6)
    .map((note) => `- ${note}`)
    .join("\n");

  return `
You are an expert ecommerce copywriter building a high-converting product sales page.

Write compelling, specific copy for this product. Use the marketing plan as guidance.

## Product
- Name: ${input.productName}
- Description: ${input.productDescription ?? "Not provided"}
- Target customer: ${input.targetCustomer ?? "General ecommerce buyer"}
- Category: ${input.category ?? "General"}
- Price: ${input.sellingPrice ?? `$${input.price.toFixed(2)}`}

## Marketing plan
${input.marketingPlan.marketingSummary}

Launch recommendation: ${input.marketingPlan.launchRecommendation}

Campaign notes:
${campaignNotes || "- Lead with problem-solution and social proof"}

Return ONLY valid JSON in this exact format:

{
  "heroHeadline": "",
  "subheadline": "",
  "salesCopy": "",
  "benefits": ["", "", ""],
  "features": ["", "", ""],
  "faq": [
    { "question": "", "answer": "" },
    { "question": "", "answer": "" },
    { "question": "", "answer": "" }
  ],
  "ctaText": "",
  "seoTitle": "",
  "seoDescription": ""
}

Rules:
- heroHeadline: punchy, benefit-led, max 12 words
- subheadline: expand the promise, max 25 words
- salesCopy: 2-4 short paragraphs, persuasive and scannable
- benefits: 3-5 customer outcomes (not features)
- features: 3-5 product specifics
- faq: 3-5 common buyer objections answered
- ctaText: short button label (e.g. "Get Yours Today")
- seoTitle: max 60 characters
- seoDescription: max 155 characters

Do not include markdown. Return raw JSON only.
`.trim();
}

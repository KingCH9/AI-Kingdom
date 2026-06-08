import type { Opportunity, Product, ProductPage, Store } from "@prisma/client";
import type { MarketingPlanInput } from "@/lib/product-page/types";
import type { MarketingLaunchPackageContent } from "../constants";

type LaunchPackagePromptInput = {
  opportunity: Opportunity;
  product: Product;
  store: Store;
  marketingPlan: MarketingPlanInput;
};

export function buildLaunchPackagePrompt(
  input: LaunchPackagePromptInput
): string {
  const { opportunity, product, store, marketingPlan } = input;

  return `
You are Gamma, the Marketing Manager for an autonomous ecommerce empire.
Create a launch-ready marketing package for this store.

## Store
- Name: ${store.name}
- Niche: ${store.niche}
- Product: ${product.name}
- Price: £${product.price.toFixed(2)}

## Opportunity
- Description: ${opportunity.productDescription ?? "N/A"}
- Target customer: ${opportunity.targetCustomer ?? "General buyer"}
- Category: ${opportunity.category ?? "General"}

## Existing marketing plan summary
${marketingPlan.marketingSummary}

Recommendation: ${marketingPlan.launchRecommendation}

Return ONLY valid JSON:

{
  "launchStrategy": "",
  "budgetTiers": [
    { "name": "Test", "dailyBudget": "£20-50", "focus": "" },
    { "name": "Scale", "dailyBudget": "£100-200", "focus": "" },
    { "name": "Aggressive", "dailyBudget": "£300+", "focus": "" }
  ],
  "tiktokStrategy": "",
  "metaStrategy": "",
  "influencerStrategy": "",
  "emailStrategy": ""
}

Do not include markdown. Return raw JSON only.
`.trim();
}

type AssetPromptInput = LaunchPackagePromptInput & {
  productPage: ProductPage;
  launchPackage: MarketingLaunchPackageContent;
};

export function buildAssetGenerationPrompt(input: AssetPromptInput): string {
  const { opportunity, product, productPage, launchPackage } = input;

  return `
You are the Asset Generation Agent for an ecommerce launch.
Create marketing assets for image generation, UGC, paid social, and email.

## Product
- Name: ${product.name}
- Headline: ${productPage.heroHeadline}
- Subheadline: ${productPage.subheadline}
- Price: £${product.price.toFixed(2)}

## Launch strategy
${launchPackage.launchStrategy}

## TikTok strategy
${launchPackage.tiktokStrategy}

## Meta strategy
${launchPackage.metaStrategy}

## Target customer
${opportunity.targetCustomer ?? "General ecommerce buyer"}

Return ONLY valid JSON:

{
  "heroImagePrompt": "",
  "lifestyleImagePrompts": ["", ""],
  "ugcVideoPrompts": ["", ""],
  "tiktokCreativeBriefs": ["", ""],
  "metaAdCreativeBriefs": ["", ""],
  "emailCampaignCopy": ["", ""],
  "shortFormAdCopy": ["", "", ""],
  "longFormAdCopy": ["", ""]
}

Rules:
- Image prompts: detailed, photorealistic, product-focused, no text in image
- UGC prompts: authentic creator-style video concepts
- Ad copy: punchy, platform-appropriate
- Email copy: subject + body pairs in each string separated by " | "

Do not include markdown. Return raw JSON only.
`.trim();
}

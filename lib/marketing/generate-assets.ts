import type {
  Opportunity,
  Product,
  ProductPage,
  Store,
} from "@prisma/client";
import { getAnthropicApiKey } from "@/lib/env";
import { getAnthropicClient } from "@/lib/ai/client";
import { DEFAULT_CLAUDE_MODEL, PRODUCT_PAGE_MAX_TOKENS } from "@/lib/ai/config";
import {
  extractTextFromMessage,
  parseJsonFromClaudeText,
} from "@/lib/ai/parse-response";
import type { MarketingPlanInput } from "@/lib/product-page/types";
import { buildFallbackGeneratedAssets } from "./build-fallback";
import { buildAssetGenerationPrompt } from "./prompts/marketing-generation";
import type {
  GeneratedMarketingAssets,
  MarketingLaunchPackageContent,
} from "./constants";

const LOG_PREFIX = "[asset-agent]";

export type GenerateAssetsInput = {
  store: Store;
  product: Product;
  opportunity: Opportunity;
  productPage: ProductPage;
  marketingPlan: MarketingPlanInput;
  launchPackage: MarketingLaunchPackageContent;
};

export async function generateMarketingAssetsContent(
  input: GenerateAssetsInput
): Promise<GeneratedMarketingAssets> {
  console.log(`${LOG_PREFIX} generating assets store=${input.store.id}`);

  const fallback = buildFallbackGeneratedAssets({
    opportunity: input.opportunity,
    product: input.product,
    productPageHeadline: input.productPage.heroHeadline,
  });

  if (!getAnthropicApiKey()) {
    console.warn(`${LOG_PREFIX} ANTHROPIC_API_KEY missing — using fallback assets`);
    return fallback;
  }

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: PRODUCT_PAGE_MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildAssetGenerationPrompt(input),
        },
      ],
    });

    const text = extractTextFromMessage(response);
    if (!text) {
      throw new Error("Empty Claude response");
    }

    const parsed = parseJsonFromClaudeText<GeneratedMarketingAssets>(text);

    return {
      heroImagePrompt: parsed.heroImagePrompt || fallback.heroImagePrompt,
      lifestyleImagePrompts:
        parsed.lifestyleImagePrompts?.length > 0
          ? parsed.lifestyleImagePrompts
          : fallback.lifestyleImagePrompts,
      ugcVideoPrompts:
        parsed.ugcVideoPrompts?.length > 0
          ? parsed.ugcVideoPrompts
          : fallback.ugcVideoPrompts,
      tiktokCreativeBriefs:
        parsed.tiktokCreativeBriefs?.length > 0
          ? parsed.tiktokCreativeBriefs
          : fallback.tiktokCreativeBriefs,
      metaAdCreativeBriefs:
        parsed.metaAdCreativeBriefs?.length > 0
          ? parsed.metaAdCreativeBriefs
          : fallback.metaAdCreativeBriefs,
      emailCampaignCopy:
        parsed.emailCampaignCopy?.length > 0
          ? parsed.emailCampaignCopy
          : fallback.emailCampaignCopy,
      shortFormAdCopy:
        parsed.shortFormAdCopy?.length > 0
          ? parsed.shortFormAdCopy
          : fallback.shortFormAdCopy,
      longFormAdCopy:
        parsed.longFormAdCopy?.length > 0
          ? parsed.longFormAdCopy
          : fallback.longFormAdCopy,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Claude failed (${message}) — using fallback`);
    return fallback;
  }
}

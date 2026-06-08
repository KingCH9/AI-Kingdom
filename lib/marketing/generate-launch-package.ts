import type { Opportunity, Product, Store } from "@prisma/client";
import { getAnthropicApiKey } from "@/lib/env";
import { getAnthropicClient } from "@/lib/ai/client";
import { DEFAULT_CLAUDE_MODEL, PRODUCT_PAGE_MAX_TOKENS } from "@/lib/ai/config";
import {
  extractTextFromMessage,
  parseJsonFromClaudeText,
} from "@/lib/ai/parse-response";
import type { MarketingPlanInput } from "@/lib/product-page/types";
import { buildFallbackLaunchPackage } from "./build-fallback";
import { buildLaunchPackagePrompt } from "./prompts/marketing-generation";
import type { MarketingLaunchPackageContent } from "./constants";

const LOG_PREFIX = "[marketing-agent]";

export type GenerateLaunchPackageInput = {
  store: Store;
  product: Product;
  opportunity: Opportunity;
  marketingPlan: MarketingPlanInput;
};

export async function generateLaunchPackageContent(
  input: GenerateLaunchPackageInput
): Promise<MarketingLaunchPackageContent> {
  console.log(`${LOG_PREFIX} generating launch package store=${input.store.id}`);

  const fallback = buildFallbackLaunchPackage({
    opportunity: input.opportunity,
    product: input.product,
    store: input.store,
    marketingPlan: input.marketingPlan,
  });

  if (!getAnthropicApiKey()) {
    console.warn(`${LOG_PREFIX} ANTHROPIC_API_KEY missing — using fallback package`);
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
          content: buildLaunchPackagePrompt(input),
        },
      ],
    });

    const text = extractTextFromMessage(response);
    if (!text) {
      throw new Error("Empty Claude response");
    }

    const parsed = parseJsonFromClaudeText<MarketingLaunchPackageContent>(text);

    return {
      launchStrategy: parsed.launchStrategy || fallback.launchStrategy,
      budgetTiers:
        Array.isArray(parsed.budgetTiers) && parsed.budgetTiers.length > 0
          ? parsed.budgetTiers
          : fallback.budgetTiers,
      tiktokStrategy: parsed.tiktokStrategy || fallback.tiktokStrategy,
      metaStrategy: parsed.metaStrategy || fallback.metaStrategy,
      influencerStrategy:
        parsed.influencerStrategy || fallback.influencerStrategy,
      emailStrategy: parsed.emailStrategy || fallback.emailStrategy,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Claude failed (${message}) — using fallback`);
    return fallback;
  }
}

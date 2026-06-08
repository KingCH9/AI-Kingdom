import type { Opportunity, Product } from "@prisma/client";
import { getAnthropicApiKey } from "@/lib/env";
import { getAnthropicClient } from "@/lib/ai/client";
import {
  DEFAULT_CLAUDE_MODEL,
  PRODUCT_PAGE_MAX_TOKENS,
} from "@/lib/ai/config";
import {
  extractTextFromMessage,
  parseJsonFromClaudeText,
} from "@/lib/ai/parse-response";
import { buildFallbackProductPageContent } from "./build-fallback";
import { buildProductPagePrompt } from "./prompts/product-page-generation";
import type { MarketingPlanInput, ProductPageContent } from "./types";

const LOG_PREFIX = "[product-page-agent]";

function normalizeContent(raw: ProductPageContent): ProductPageContent {
  return {
    heroHeadline: String(raw.heroHeadline ?? "").trim(),
    subheadline: String(raw.subheadline ?? "").trim(),
    salesCopy: String(raw.salesCopy ?? "").trim(),
    benefits: Array.isArray(raw.benefits)
      ? raw.benefits.map(String).filter(Boolean)
      : [],
    features: Array.isArray(raw.features)
      ? raw.features.map(String).filter(Boolean)
      : [],
    faq: Array.isArray(raw.faq)
      ? raw.faq
          .filter(
            (item) =>
              item &&
              typeof item === "object" &&
              "question" in item &&
              "answer" in item
          )
          .map((item) => ({
            question: String(item.question).trim(),
            answer: String(item.answer).trim(),
          }))
          .filter((item) => item.question && item.answer)
      : [],
    ctaText: String(raw.ctaText ?? "Buy Now").trim() || "Buy Now",
    seoTitle: String(raw.seoTitle ?? "").trim(),
    seoDescription: String(raw.seoDescription ?? "").trim(),
  };
}

export type GenerateProductPageInput = {
  opportunity: Opportunity;
  product: Product;
  marketingPlan: MarketingPlanInput;
};

/**
 * Generates sales page content via Claude, with deterministic fallback.
 */
export async function generateProductPageContent(
  input: GenerateProductPageInput
): Promise<ProductPageContent> {
  const { opportunity, product, marketingPlan } = input;

  console.log(
    `${LOG_PREFIX} generating page storeProduct="${product.name}" opportunity=#${opportunity.id}`
  );

  if (!getAnthropicApiKey()) {
    console.warn(`${LOG_PREFIX} ANTHROPIC_API_KEY missing — using fallback copy`);
    return buildFallbackProductPageContent({
      opportunity,
      product,
      marketingPlan,
    });
  }

  const prompt = buildProductPagePrompt({
    productName: product.name,
    productDescription: opportunity.productDescription,
    targetCustomer: opportunity.targetCustomer,
    sellingPrice: opportunity.sellingPrice,
    price: product.price,
    category: opportunity.category,
    marketingPlan,
  });

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: DEFAULT_CLAUDE_MODEL,
      max_tokens: PRODUCT_PAGE_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractTextFromMessage(response);
    if (!text) {
      throw new Error("Claude returned empty response");
    }

    const parsed = normalizeContent(
      parseJsonFromClaudeText<ProductPageContent>(text)
    );

    if (!parsed.heroHeadline || !parsed.salesCopy) {
      throw new Error("Claude returned incomplete product page content");
    }

    console.log(
      `${LOG_PREFIX} generated page headline="${parsed.heroHeadline.slice(0, 48)}..."`
    );

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG_PREFIX} Claude failed (${message}) — using fallback copy`);
    return buildFallbackProductPageContent({
      opportunity,
      product,
      marketingPlan,
    });
  }
}

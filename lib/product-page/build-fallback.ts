import type { Opportunity, Product } from "@prisma/client";
import { parseStoredJsonArray } from "@/lib/opportunity/parse-stored-fields";
import type { MarketingPlanInput, ProductPageContent } from "./types";

/** Deterministic fallback when Claude is unavailable. */
export function buildFallbackProductPageContent(input: {
  opportunity: Pick<
    Opportunity,
    | "productName"
    | "productDescription"
    | "targetCustomer"
    | "sellingPrice"
    | "marketingAngles"
    | "category"
  >;
  product: Pick<Product, "name" | "price">;
  marketingPlan?: MarketingPlanInput;
}): ProductPageContent {
  const { opportunity, product } = input;
  const angles = parseStoredJsonArray(opportunity.marketingAngles);
  const name = product.name;

  const benefits =
    angles.length > 0
      ? angles.slice(0, 4)
      : [
          "Designed for everyday use with premium quality",
          "Backed by real customer demand and trend data",
          "Simple setup — start using it right away",
          "Great value at this price point",
        ];

  const features = [
    opportunity.category
      ? `Built for the ${opportunity.category} category`
      : "Purpose-built for modern buyers",
    `Clear value at $${product.price.toFixed(2)}`,
    "Ships fast with reliable support",
  ];

  const faq = [
    {
      question: "Who is this product for?",
      answer:
        opportunity.targetCustomer ??
        "Anyone looking for a practical, high-quality solution.",
    },
    {
      question: "What makes this different?",
      answer:
        opportunity.productDescription?.slice(0, 200) ??
        `${name} is selected for strong market demand and margin potential.`,
    },
    {
      question: "Is there a guarantee?",
      answer:
        "We stand behind every order with responsive customer support and a hassle-free return policy.",
    },
  ];

  return {
    heroHeadline: name,
    subheadline:
      opportunity.productDescription?.slice(0, 120) ??
      `Discover ${name} — built for ${opportunity.targetCustomer ?? "you"}.`,
    salesCopy: [
      opportunity.productDescription ??
        `${name} delivers the results customers are searching for right now.`,
      input.marketingPlan?.launchRecommendation ??
        "Start with confidence — this product was validated by our AI opportunity pipeline.",
      `Priced at $${product.price.toFixed(2)}, it's an accessible upgrade for ${opportunity.targetCustomer ?? "everyday buyers"}.`,
    ].join("\n\n"),
    benefits,
    features,
    faq,
    ctaText: "Buy Now",
    seoTitle: `${name} | Official Store`.slice(0, 60),
    seoDescription: (
      opportunity.productDescription ??
      `Shop ${name} — premium quality, fast shipping, great value.`
    ).slice(0, 155),
  };
}

import type { Opportunity, Product, Store } from "@prisma/client";
import { parseStoredJsonArray } from "@/lib/opportunity/parse-stored-fields";
import type { MarketingPlanInput } from "@/lib/product-page/types";
import type {
  BudgetTier,
  MarketingLaunchPackageContent,
} from "./constants";

export function buildFallbackLaunchPackage(input: {
  opportunity: Pick<
    Opportunity,
    "productName" | "targetCustomer" | "productDescription"
  >;
  product: Pick<Product, "name" | "price">;
  store: Pick<Store, "niche">;
  marketingPlan: MarketingPlanInput;
}): MarketingLaunchPackageContent {
  const budgetTiers: BudgetTier[] = [
    {
      name: "Test",
      dailyBudget: "£25–50",
      focus: "Organic TikTok + £25/day Meta test creatives",
    },
    {
      name: "Scale",
      dailyBudget: "£100–150",
      focus: "Scale winning ads + creator seeding",
    },
    {
      name: "Aggressive",
      dailyBudget: "£250+",
      focus: "Full funnel retargeting + lookalikes",
    },
  ];

  return {
    launchStrategy: [
      `Launch ${input.product.name} to ${input.opportunity.targetCustomer ?? "core buyers"}.`,
      input.marketingPlan.launchRecommendation,
      `Lead with problem-solution hooks in ${input.store.niche} niche.`,
      "Week 1: organic validation. Week 2: paid tests. Week 3: scale winners.",
    ].join(" "),
    budgetTiers,
    tiktokStrategy:
      "Post 2x daily: unboxing, demo, before/after. Spark Ads on top 2 organic winners.",
    metaStrategy:
      "Test 3 creatives × 2 audiences. Retarget site visitors after 500 sessions.",
    influencerStrategy:
      "Seed 10–15 micro-creators (10K–50K) with product-only or small fee + UGC rights.",
    emailStrategy:
      "Welcome series (3 emails) + abandoned browse. Lead magnet: buying guide PDF.",
  };
}

export function buildFallbackGeneratedAssets(input: {
  opportunity: Pick<
    Opportunity,
    "productName" | "productDescription" | "tiktokIdeas" | "facebookAdIdeas"
  >;
  product: Pick<Product, "name" | "price">;
  productPageHeadline: string;
}): import("./constants").GeneratedMarketingAssets {
  const tiktok = parseStoredJsonArray(input.opportunity.tiktokIdeas);
  const meta = parseStoredJsonArray(input.opportunity.facebookAdIdeas);

  return {
    heroImagePrompt: `Professional product photo of ${input.product.name}, clean white background, soft studio lighting, e-commerce hero shot, high detail`,
    lifestyleImagePrompts: [
      `${input.product.name} in use by target customer, natural daylight, lifestyle setting`,
      `Close-up hands using ${input.product.name}, warm tones, authentic home environment`,
    ],
    ugcVideoPrompts: [
      tiktok[0] ??
        `Creator unboxing ${input.product.name}, genuine reaction, vertical 9:16`,
      `Day-in-the-life using ${input.product.name}, quick cuts, trending audio`,
    ],
    tiktokCreativeBriefs: tiktok.slice(0, 3).length
      ? tiktok.slice(0, 3)
      : [
          `Hook: "I didn't expect this from ${input.product.name}" — demo + CTA`,
          `Before/after transformation using ${input.product.name}`,
        ],
    metaAdCreativeBriefs: meta.slice(0, 3).length
      ? meta.slice(0, 3)
      : [
          `Carousel: 3 benefits of ${input.product.name} with lifestyle imagery`,
          `Video ad: problem → solution with ${input.product.name}`,
        ],
    emailCampaignCopy: [
      `Welcome | Discover ${input.product.name} — ${input.productPageHeadline}`,
      `Launch offer | Get started with ${input.product.name} at £${input.product.price.toFixed(2)}`,
    ],
    shortFormAdCopy: [
      `${input.productPageHeadline} — Shop now.`,
      `Finally: ${input.product.name} that actually delivers.`,
      `Limited launch — ${input.product.name} from £${input.product.price.toFixed(2)}`,
    ],
    longFormAdCopy: [
      input.opportunity.productDescription?.slice(0, 300) ??
        `${input.product.name} is built for customers who want results without compromise.`,
    ],
  };
}

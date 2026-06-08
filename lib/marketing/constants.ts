/** Canonical marketing asset types stored in MarketingAsset.assetType. */
export const MARKETING_ASSET_TYPES = {
  HERO_IMAGE: "hero_image",
  LIFESTYLE_IMAGE: "lifestyle_image",
  TIKTOK_SCRIPT: "tiktok_script",
  META_AD: "meta_ad",
  EMAIL_CAMPAIGN: "email_campaign",
  AD_COPY: "ad_copy",
  CREATIVE_BRIEF: "creative_brief",
} as const;

export type MarketingAssetType =
  (typeof MARKETING_ASSET_TYPES)[keyof typeof MARKETING_ASSET_TYPES];

export const MARKETING_PLATFORMS = {
  TIKTOK: "tiktok",
  META: "meta",
  EMAIL: "email",
  UGC: "ugc",
  GENERAL: "general",
  IMAGE: "image",
} as const;

export type MarketingPlatform =
  (typeof MARKETING_PLATFORMS)[keyof typeof MARKETING_PLATFORMS];

export type BudgetTier = {
  name: string;
  dailyBudget: string;
  focus: string;
};

export type MarketingLaunchPackageContent = {
  launchStrategy: string;
  budgetTiers: BudgetTier[];
  tiktokStrategy: string;
  metaStrategy: string;
  influencerStrategy: string;
  emailStrategy: string;
};

export type MarketingAssetDraft = {
  assetType: MarketingAssetType;
  title: string;
  content: string;
  platform: MarketingPlatform | string;
};

export type GeneratedMarketingAssets = {
  heroImagePrompt: string;
  lifestyleImagePrompts: string[];
  ugcVideoPrompts: string[];
  tiktokCreativeBriefs: string[];
  metaAdCreativeBriefs: string[];
  emailCampaignCopy: string[];
  shortFormAdCopy: string[];
  longFormAdCopy: string[];
};

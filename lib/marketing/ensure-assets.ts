import type { MarketingAsset } from "@prisma/client";
import {
  MARKETING_ASSET_TYPES,
  MARKETING_PLATFORMS,
  type GeneratedMarketingAssets,
  type MarketingAssetDraft,
} from "./constants";
import { generateMarketingAssetsContent } from "./generate-assets";
import type { GenerateAssetsInput } from "./generate-assets";
import { prisma } from "@/lib/prisma";

const LOG_PREFIX = "[asset-agent]";

function draftsFromGenerated(
  generated: GeneratedMarketingAssets
): MarketingAssetDraft[] {
  const drafts: MarketingAssetDraft[] = [];

  drafts.push({
    assetType: MARKETING_ASSET_TYPES.HERO_IMAGE,
    title: "Hero product shot",
    content: generated.heroImagePrompt,
    platform: MARKETING_PLATFORMS.IMAGE,
  });

  generated.lifestyleImagePrompts.forEach((prompt, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.LIFESTYLE_IMAGE,
      title: `Lifestyle image ${index + 1}`,
      content: prompt,
      platform: MARKETING_PLATFORMS.IMAGE,
    });
  });

  generated.ugcVideoPrompts.forEach((prompt, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.CREATIVE_BRIEF,
      title: `UGC video brief ${index + 1}`,
      content: prompt,
      platform: MARKETING_PLATFORMS.UGC,
    });
  });

  generated.tiktokCreativeBriefs.forEach((brief, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.TIKTOK_SCRIPT,
      title: `TikTok creative ${index + 1}`,
      content: brief,
      platform: MARKETING_PLATFORMS.TIKTOK,
    });
  });

  generated.metaAdCreativeBriefs.forEach((brief, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.META_AD,
      title: `Meta ad creative ${index + 1}`,
      content: brief,
      platform: MARKETING_PLATFORMS.META,
    });
  });

  generated.emailCampaignCopy.forEach((copy, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.EMAIL_CAMPAIGN,
      title: `Email campaign ${index + 1}`,
      content: copy,
      platform: MARKETING_PLATFORMS.EMAIL,
    });
  });

  generated.shortFormAdCopy.forEach((copy, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.AD_COPY,
      title: `Short-form ad ${index + 1}`,
      content: copy,
      platform: MARKETING_PLATFORMS.GENERAL,
    });
  });

  generated.longFormAdCopy.forEach((copy, index) => {
    drafts.push({
      assetType: MARKETING_ASSET_TYPES.AD_COPY,
      title: `Long-form ad ${index + 1}`,
      content: copy,
      platform: MARKETING_PLATFORMS.GENERAL,
    });
  });

  return drafts;
}

export async function ensureMarketingAssetsForStore(
  input: GenerateAssetsInput
): Promise<MarketingAsset[]> {
  const existingCount = await prisma.marketingAsset.count({
    where: { storeId: input.store.id },
  });

  if (existingCount > 0) {
    console.log(
      `${LOG_PREFIX} assets already exist store=${input.store.id} count=${existingCount}`
    );
    return prisma.marketingAsset.findMany({
      where: { storeId: input.store.id },
      orderBy: { createdAt: "asc" },
    });
  }

  const generated = await generateMarketingAssetsContent(input);
  const drafts = draftsFromGenerated(generated);

  const created: MarketingAsset[] = [];

  for (const draft of drafts) {
    const row = await prisma.marketingAsset.create({
      data: {
        storeId: input.store.id,
        assetType: draft.assetType,
        title: draft.title,
        content: draft.content,
        platform: draft.platform,
      },
    });
    created.push(row);
  }

  console.log(
    `${LOG_PREFIX} created ${created.length} assets store=${input.store.id}`
  );

  return created;
}

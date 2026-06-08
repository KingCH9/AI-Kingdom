import { prisma } from "@/lib/prisma";
import {
  MARKETING_ASSET_TYPES,
  MARKETING_PLATFORMS,
} from "./constants";

export async function getMarketingAssetsForAdmin() {
  return prisma.marketingAsset.findMany({
    include: {
      store: {
        select: { id: true, name: true, slug: true, status: true },
      },
    },
    orderBy: [{ storeId: "asc" }, { assetType: "asc" }, { createdAt: "asc" }],
  });
}

export async function getMarketingAssetsByStoreId(storeId: number) {
  return prisma.marketingAsset.findMany({
    where: { storeId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getMarketingStats() {
  const [total, byType, byPlatform, storeCount] = await Promise.all([
    prisma.marketingAsset.count(),
    prisma.marketingAsset.groupBy({
      by: ["assetType"],
      _count: { assetType: true },
    }),
    prisma.marketingAsset.groupBy({
      by: ["platform"],
      _count: { platform: true },
    }),
    prisma.marketingAsset.findMany({
      distinct: ["storeId"],
      select: { storeId: true },
    }),
  ]);

  return {
    total,
    storesCovered: storeCount.length,
    byType: Object.fromEntries(
      byType.map((row) => [row.assetType, row._count.assetType])
    ),
    byPlatform: Object.fromEntries(
      byPlatform.map((row) => [row.platform, row._count.platform])
    ),
  };
}

/** Highlights for public storefront from ad_copy and creative briefs. */
export function pickShopMarketingHighlights(
  assets: Array<{ assetType: string; content: string; title: string }>
) {
  return assets
    .filter(
      (asset) =>
        asset.assetType === MARKETING_ASSET_TYPES.AD_COPY ||
        asset.assetType === MARKETING_ASSET_TYPES.TIKTOK_SCRIPT
    )
    .slice(0, 4)
    .map((asset) => asset.content);
}

export function pickShopSocialProof(
  assets: Array<{ assetType: string; content: string }>
) {
  const shortCopy = assets.filter(
    (a) => a.assetType === MARKETING_ASSET_TYPES.AD_COPY
  );
  return shortCopy.slice(0, 3).map((a) => a.content);
}

export { MARKETING_ASSET_TYPES, MARKETING_PLATFORMS };

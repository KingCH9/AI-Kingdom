import { prisma } from "@/lib/prisma";
import {
  pickShopMarketingHighlights,
  pickShopSocialProof,
} from "@/lib/marketing/queries";
import { parseBudgetTiers } from "@/lib/marketing/ensure-launch-package";
import { parseProductPageJsonFields } from "./ensure-product-page";

export async function getShopPageBySlug(slug: string) {
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      productPage: true,
      products: { orderBy: { id: "asc" }, take: 1 },
      opportunity: true,
      marketingLaunchPackage: true,
      marketingAssets: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!store?.productPage || store.products.length === 0) {
    return null;
  }

  const parsed = parseProductPageJsonFields(store.productPage);
  const marketingHighlights = pickShopMarketingHighlights(store.marketingAssets);
  const socialProofLines = pickShopSocialProof(store.marketingAssets);
  const budgetTiers = store.marketingLaunchPackage
    ? parseBudgetTiers(store.marketingLaunchPackage)
    : [];

  return {
    store,
    product: store.products[0],
    page: store.productPage,
    launchPackage: store.marketingLaunchPackage,
    budgetTiers,
    marketingHighlights,
    socialProofLines,
    ...parsed,
  };
}

import type {
  Opportunity,
  Product,
  ProductPage,
  Store,
} from "@prisma/client";
import type { MarketingPlanInput } from "@/lib/product-page/types";
import { ensureMarketingAssetsForStore } from "./ensure-assets";
import { ensureMarketingLaunchPackage } from "./ensure-launch-package";
import { parseBudgetTiers } from "./ensure-launch-package";

export type RunLaunchMarketingInput = {
  store: Store;
  product: Product;
  opportunity: Opportunity;
  productPage: ProductPage;
  marketingPlan: MarketingPlanInput;
};

/** Runs marketing launch package + asset generation after product page exists. */
export async function runLaunchMarketingExecution(
  input: RunLaunchMarketingInput
) {
  const launchPackage = await ensureMarketingLaunchPackage({
    store: input.store,
    product: input.product,
    opportunity: input.opportunity,
    marketingPlan: input.marketingPlan,
  });

  const budgetTiers = parseBudgetTiers(launchPackage);

  const assets = await ensureMarketingAssetsForStore({
    store: input.store,
    product: input.product,
    opportunity: input.opportunity,
    productPage: input.productPage,
    marketingPlan: input.marketingPlan,
    launchPackage: {
      launchStrategy: launchPackage.launchStrategy,
      budgetTiers,
      tiktokStrategy: launchPackage.tiktokStrategy,
      metaStrategy: launchPackage.metaStrategy,
      influencerStrategy: launchPackage.influencerStrategy,
      emailStrategy: launchPackage.emailStrategy,
    },
  });

  return { launchPackage, assets };
}

import { prisma } from "@/lib/prisma";
import { TASK_STATUSES, TASK_TITLE_PREFIX } from "@/lib/tasks/constants";
import { runLaunchMarketingExecution } from "@/lib/marketing/run-launch-marketing";
import type { MarketingPlanInput } from "@/lib/product-page/types";

const LOG_PREFIX = "[asset-agent]";

function parseMarketingPlanFromTask(result: string | null): MarketingPlanInput | null {
  if (!result) return null;
  try {
    const parsed = JSON.parse(result) as MarketingPlanInput;
    if (parsed.marketingSummary && parsed.launchRecommendation) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function defaultMarketingPlan(productName: string): MarketingPlanInput {
  return {
    marketingSummary: `Product: ${productName}`,
    launchRecommendation:
      "Launch with organic content tests before scaling ad spend.",
    campaignNotes: [],
  };
}

/** Backfills marketing launch packages and assets for launched stores. */
export async function ensureMissingMarketingAssets(): Promise<{
  processed: number;
  created: number;
  skipped: number;
}> {
  const stores = await prisma.store.findMany({
    where: {
      productPage: { isNot: null },
      marketingAssets: { none: {} },
    },
    include: {
      products: { orderBy: { id: "asc" }, take: 1 },
      productPage: true,
      opportunity: true,
    },
  });

  let processed = 0;
  let created = 0;
  let skipped = 0;

  console.log(
    `${LOG_PREFIX} bootstrap checking ${stores.length} store(s) without marketing assets`
  );

  for (const store of stores) {
    processed += 1;

    if (
      !store.opportunity ||
      !store.productPage ||
      store.products.length === 0
    ) {
      skipped += 1;
      continue;
    }

    const marketingTask = await prisma.task.findFirst({
      where: {
        opportunityId: store.opportunityId ?? undefined,
        status: TASK_STATUSES.COMPLETED,
        title: { startsWith: TASK_TITLE_PREFIX.MARKETING_PLAN },
      },
      orderBy: { completedAt: "desc" },
    });

    const marketingPlan =
      parseMarketingPlanFromTask(marketingTask?.result ?? null) ??
      defaultMarketingPlan(store.products[0].name);

    await runLaunchMarketingExecution({
      store,
      product: store.products[0],
      opportunity: store.opportunity,
      productPage: store.productPage,
      marketingPlan,
    });

    created += 1;
  }

  console.log(
    `${LOG_PREFIX} bootstrap complete processed=${processed} created=${created} skipped=${skipped}`
  );

  return { processed, created, skipped };
}

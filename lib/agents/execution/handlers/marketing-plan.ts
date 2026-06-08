import { OPPORTUNITY_THRESHOLDS } from "@/lib/opportunity/thresholds";
import { parseStoredJsonArray } from "@/lib/opportunity/parse-stored-fields";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { updateOpportunityStatus } from "@/lib/opportunity/update-status";
import { ensureProductForStore } from "@/lib/store/ensure-product";
import {
  STORE_STATUSES,
  syncStoreStatusForOpportunity,
} from "@/lib/store/sync-lifecycle";
import { ensureProductPageForStore } from "@/lib/product-page/ensure-product-page";
import { prisma } from "@/lib/prisma";
import type { TaskExecutionContext } from "../types";

interface MarketingPlanResult {
  marketingSummary: string;
  launchRecommendation: string;
  campaignNotes: string[];
}

function buildMarketingPlan(opportunity: {
  productName: string;
  productDescription: string | null;
  targetCustomer: string | null;
  profitMargin: string | null;
  sellingPrice: string | null;
  marketingAngles: string | null;
  tiktokIdeas: string | null;
  facebookAdIdeas: string | null;
  launchPlan: string | null;
  opportunityScore: number | null;
}): MarketingPlanResult {
  const angles = parseStoredJsonArray(opportunity.marketingAngles);
  const tiktok = parseStoredJsonArray(opportunity.tiktokIdeas);
  const facebook = parseStoredJsonArray(opportunity.facebookAdIdeas);
  const launchSteps = parseStoredJsonArray(opportunity.launchPlan);

  const marketingSummary = [
    `Product: ${opportunity.productName}`,
    opportunity.productDescription ?? "No description on file.",
    `Target customer: ${opportunity.targetCustomer ?? "General ecommerce buyer"}`,
    `Price point: ${opportunity.sellingPrice ?? "TBD"} | Margin: ${opportunity.profitMargin ?? "TBD"}`,
    angles.length > 0
      ? `Key angles: ${angles.slice(0, 3).join("; ")}`
      : "Key angles: Lead with problem-solution and social proof.",
  ].join("\n");

  const score = opportunity.opportunityScore ?? 0;
  const { LAUNCH_READY_MIN_SCORE, VALIDATED_MIN_SCORE } =
    OPPORTUNITY_THRESHOLDS;

  const launchRecommendation =
    score >= LAUNCH_READY_MIN_SCORE
      ? "Strong launch candidate — prioritize paid social and creator seeding within 7 days."
      : score >= VALIDATED_MIN_SCORE
        ? "Validated launch — start with organic content tests before scaling ad spend."
        : "Cautious launch — run small-budget tests and validate conversion before scaling.";

  const campaignNotes = [
    ...tiktok.slice(0, 3).map((idea) => `TikTok: ${idea}`),
    ...facebook.slice(0, 3).map((idea) => `Meta: ${idea}`),
    ...launchSteps.slice(0, 3).map((step) => `Launch step: ${step}`),
  ];

  if (campaignNotes.length === 0) {
    campaignNotes.push(
      "Week 1: Organic content on TikTok and Instagram.",
      "Week 2: Retargeting ads to site visitors.",
      "Week 3: Scale winning creative with lookalike audiences."
    );
  }

  return { marketingSummary, launchRecommendation, campaignNotes };
}

export async function executeMarketingPlanTask(
  ctx: TaskExecutionContext
): Promise<string> {
  const { opportunity } = ctx;

  if (!opportunity) {
    throw new Error(`No opportunity found for task: ${ctx.task.title}`);
  }

  const plan = buildMarketingPlan(opportunity);
  const currentStatus = normalizeOpportunityStatus(opportunity.status);

  if (currentStatus === "building") {
    await updateOpportunityStatus({
      opportunityId: opportunity.id,
      newStatus: "launched",
      actor: "operator",
    });

    const syncedStore = await syncStoreStatusForOpportunity(
      opportunity.id,
      STORE_STATUSES.LAUNCHED
    );

    const store =
      syncedStore ??
      (await prisma.store.findFirst({
        where: { opportunityId: opportunity.id },
      }));

    if (store) {
      const product = await ensureProductForStore(store.id, opportunity);
      const productPage = await ensureProductPageForStore({
        store,
        product,
        opportunity,
        marketingPlan: plan,
      });

      const { runLaunchMarketingExecution } = await import(
        "@/lib/marketing/run-launch-marketing"
      );
      await runLaunchMarketingExecution({
        store,
        product,
        opportunity,
        productPage,
        marketingPlan: plan,
      });
    }
  }

  return JSON.stringify(plan, null, 2);
}

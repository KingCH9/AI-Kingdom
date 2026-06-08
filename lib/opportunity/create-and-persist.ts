import type { Opportunity } from "@prisma/client";
import { generateOpportunityWithClaude } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { deriveScoresFromClaudeResponse } from "./derive-scores";
import { deriveOpportunityCategory } from "./derive-category";
import { buildOpportunityScores } from "./scoring";
import { getInitialOpportunityStatus } from "./status";
import { getOpportunityDiversityContext } from "./fetch-diversity-context";
import {
  computeDiversityScore,
  normalizeRotationCategory,
} from "./generation-diversity";

export type CreateOpportunitySuccess = {
  success: true;
  opportunity: Opportunity;
};

export type CreateOpportunityFailure = {
  success: false;
  message: string;
  raw?: string;
  status?: number;
  error?: unknown;
};

export type CreateOpportunityResult =
  | CreateOpportunitySuccess
  | CreateOpportunityFailure;

/**
 * Generates an opportunity via Claude, scores it deterministically, and persists.
 * Always enters researching — Atlas owns validation.
 */
export async function createOpportunityFromClaude(): Promise<CreateOpportunityResult> {
  const diversityContext = await getOpportunityDiversityContext();
  const generated = await generateOpportunityWithClaude({ diversityContext });

  if (!generated.success) {
    return {
      success: false,
      message: generated.message,
      raw: generated.raw,
    };
  }

  const data = generated.data;
  const scoreInput = deriveScoresFromClaudeResponse(data);
  const { opportunityScore } = buildOpportunityScores(scoreInput);
  const status = getInitialOpportunityStatus();
  const category = deriveOpportunityCategory(data);
  const rotationCategory = normalizeRotationCategory(category);
  const diversityScore = computeDiversityScore(
    data.productName ?? "",
    rotationCategory,
    diversityContext
  );

  console.log(`[opportunity-generator] category=${rotationCategory}`);
  console.log(`[opportunity-generator] diversity-score=${diversityScore}`);
  if (data.nicheDifferentiation?.trim()) {
    console.log(
      `[opportunity-generator] niche-differentiation=${data.nicheDifferentiation.slice(0, 120)}`
    );
  }

  try {
    console.log("[create-opportunity] Persisting to database");
    const opportunity = await prisma.opportunity.create({
      data: {
        productName: data.productName || "",
        productDescription: data.productDescription || "",
        whyTrending: data.whyTrending || "",
        targetCustomer: data.targetCustomer || "",
        sellingPrice: data.sellingPrice || "",
        estimatedCostPerUnit: data.estimatedCostPerUnit || "",
        profitMargin: data.profitMargin || "",
        supplierSearch: data.supplierSearch || "",
        supplier: data.supplierSearch || "",
        marketingAngles: JSON.stringify(data.marketingAngles || []),
        tiktokIdeas: JSON.stringify(data.tiktokIdeas || []),
        facebookAdIdeas: JSON.stringify(data.facebookAdIdeas || []),
        alibabaKeywords: JSON.stringify(data.alibabaKeywords || []),
        launchPlan: JSON.stringify(data.launchPlan || []),
        category,
        demandScore: scoreInput.demandScore,
        competition: scoreInput.competition,
        riskRating: scoreInput.riskRating,
        opportunityScore,
        status,
      },
    });

    console.log(`[create-opportunity] Saved opportunity id=${opportunity.id}`);
    return {
      success: true,
      opportunity,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database save failed";
    console.error("[create-opportunity] Prisma error:", message, error);
    return {
      success: false,
      message: `Failed to save opportunity: ${message}`,
    };
  }
}

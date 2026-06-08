/**
 * Phase D2 regression tests — pipeline gates, CEO decisions, structured scoring.
 * Run: npm run test:scoring
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Opportunity } from "@prisma/client";

import { evaluateCeoDecision } from "@/lib/opportunity/evaluate-ceo-decision";
import { evaluateValidationDecision } from "@/lib/opportunity/validate-opportunity";
import {
  deriveDemandScoreFromSignals,
  deriveScoresFromClaudeResponse,
  deriveScoresLegacy,
} from "@/lib/opportunity/derive-scores";
import { buildOpportunityScores } from "@/lib/opportunity/scoring";
import {
  buildDiversityContext,
  ROTATION_TARGET_CATEGORIES,
} from "@/lib/opportunity/generation-diversity";
import type { ClaudeOpportunityResponse } from "@/lib/types";

function mockOpportunity(
  overrides: Partial<Opportunity> & { opportunityScore: number }
): Opportunity {
  return {
    id: 1,
    productName: "Test Product",
    productDescription: null,
    whyTrending: null,
    targetCustomer: null,
    sellingPrice: null,
    estimatedCostPerUnit: null,
    profitMargin: "70%",
    supplierSearch: null,
    supplier: null,
    marketingAngles: null,
    tiktokIdeas: null,
    facebookAdIdeas: null,
    alibabaKeywords: null,
    launchPlan: null,
    category: "Pets",
    demandScore: 85,
    competition: 25,
    riskRating: 3,
    status: "validated",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Opportunity;
}

describe("CEO and validator gates at launch_ready min 79", () => {
  it("approves launch_ready when score >= 79 and all gates pass", () => {
    const opp = mockOpportunity({
      opportunityScore: 79,
      demandScore: 96,
      competition: 30,
      riskRating: 3,
      profitMargin: "70%",
    });

    assert.equal(evaluateCeoDecision(opp), "approve");
  });

  it("holds scores 70–78 in CEO queue", () => {
    const holdCases = [
      { demandScore: 70, expectedFloor: 70 },
      { demandScore: 93, expectedFloor: 78 },
      { demandScore: 88, expectedFloor: 75 },
    ];

    for (const { demandScore } of holdCases) {
      const opp = mockOpportunity({
        opportunityScore: 75,
        demandScore,
        competition: 30,
        riskRating: 3,
        profitMargin: "70%",
      });
      assert.equal(evaluateCeoDecision(opp), "hold");
    }
  });

  it("rejects opportunities below validated threshold (< 70)", () => {
    const opp = mockOpportunity({
      opportunityScore: 69,
      demandScore: 67,
      competition: 30,
      riskRating: 3,
      profitMargin: "70%",
      status: "researching",
    });

    assert.equal(evaluateValidationDecision(opp), "reject");
    assert.equal(evaluateCeoDecision(opp), "reject");
  });
});

describe("Phase D2 structured demand scoring", () => {
  const structured: ClaudeOpportunityResponse = {
    profitMargin: "72%",
    riskRating: 3,
    trendStrength: 85,
    competitionEstimate: 35,
    demandSignals: {
      searchGrowth: 80,
      sourcingEase: 75,
      otherFactors: { adPotential: 70, marginStability: 65 },
    },
    opportunityScore: 91,
  };

  it("does not map Claude opportunityScore directly to demandScore", () => {
    const input = deriveScoresFromClaudeResponse(structured);
    assert.notEqual(input.demandScore, 91);
    assert.equal(input.demandScore, deriveDemandScoreFromSignals(structured, 72, 3));
  });

  it("produces wider spread than legacy when signals vary", () => {
    const high: ClaudeOpportunityResponse = {
      ...structured,
      trendStrength: 92,
      competitionEstimate: 20,
      demandSignals: { searchGrowth: 90, sourcingEase: 88, otherFactors: { x: 85 } },
      opportunityScore: 91,
    };
    const low: ClaudeOpportunityResponse = {
      ...structured,
      trendStrength: 55,
      competitionEstimate: 60,
      demandSignals: { searchGrowth: 50, sourcingEase: 45, otherFactors: { x: 40 } },
      opportunityScore: 91,
    };

    const highScore = buildOpportunityScores(
      deriveScoresFromClaudeResponse(high)
    ).opportunityScore;
    const lowScore = buildOpportunityScores(
      deriveScoresFromClaudeResponse(low)
    ).opportunityScore;
    const legacyHigh = buildOpportunityScores(deriveScoresLegacy(high)).opportunityScore;
    const legacyLow = buildOpportunityScores(deriveScoresLegacy(low)).opportunityScore;

    assert.ok(highScore - lowScore > legacyHigh - legacyLow);
  });
});

describe("Phase D1 diversity compatibility", () => {
  it("target category list has at least 12 categories", () => {
    assert.ok(ROTATION_TARGET_CATEGORIES.length >= 12);
  });

  it("buildDiversityContext tracks underrepresented categories across 20 rows", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      id: index + 1,
      productName: `Product ${index}`,
      category: ROTATION_TARGET_CATEGORIES[index % ROTATION_TARGET_CATEGORIES.length],
    }));

    const context = buildDiversityContext(rows);
    const unique = new Set(context.recent.map((row) => row.category));

    assert.ok(unique.size >= 6);
    assert.ok(context.preferredCategories.length > 0);
  });
});

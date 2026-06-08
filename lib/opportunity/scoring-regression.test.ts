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
import { runScoringSimulation } from "@/lib/opportunity/scoring-simulation";
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
      { demandScore: 72, competition: 30 },
      { demandScore: 75, competition: 32 },
      { demandScore: 70, competition: 35 },
    ];

    for (const { demandScore, competition } of holdCases) {
      const opp = mockOpportunity({
        opportunityScore: 75,
        demandScore,
        competition,
        riskRating: 3,
        profitMargin: "70%",
      });
      assert.equal(evaluateCeoDecision(opp), "hold");
    }
  });

  it("rejects opportunities below validated threshold (< 70)", () => {
    const opp = mockOpportunity({
      opportunityScore: 69,
      demandScore: 55,
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
    searchGrowth: 80,
    sourcingEase: 75,
    demandSignalsComposite: 68,
    competitionEstimate: 35,
    opportunityScore: 91,
  };

  it("does not map Claude opportunityScore directly to demandScore", () => {
    const input = deriveScoresFromClaudeResponse(structured);
    assert.notEqual(input.demandScore, 91);
    assert.equal(
      input.demandScore,
      deriveDemandScoreFromSignals(structured, 72, 3)
    );
  });

  it("uses top-level searchGrowth, sourcingEase, demandSignalsComposite", () => {
    const demand = deriveDemandScoreFromSignals(structured, 72, 3);
    // 0.4*85 + 0.3*80 + 0.2*75 + 0.1*68 = 34 + 24 + 15 + 6.8 = 79.8 → 79
    assert.equal(demand, 79);
  });

  it("produces wider spread than legacy when signals vary", () => {
    const high: ClaudeOpportunityResponse = {
      ...structured,
      trendStrength: 92,
      searchGrowth: 90,
      sourcingEase: 88,
      demandSignalsComposite: 85,
      competitionEstimate: 20,
      opportunityScore: 91,
    };
    const low: ClaudeOpportunityResponse = {
      ...structured,
      trendStrength: 55,
      searchGrowth: 50,
      sourcingEase: 45,
      demandSignalsComposite: 40,
      competitionEstimate: 60,
      opportunityScore: 91,
    };

    const highScore = buildOpportunityScores(
      deriveScoresFromClaudeResponse(high)
    ).opportunityScore;
    const lowScore = buildOpportunityScores(
      deriveScoresFromClaudeResponse(low)
    ).opportunityScore;
    const legacyHigh = buildOpportunityScores(
      deriveScoresLegacy(high)
    ).opportunityScore;
    const legacyLow = buildOpportunityScores(
      deriveScoresLegacy(low)
    ).opportunityScore;

    assert.ok(highScore - lowScore > legacyHigh - legacyLow);
  });

  it("blends competition 50/50 with competitionEstimate", () => {
    const highEstimate: ClaudeOpportunityResponse = {
      ...structured,
      competitionEstimate: 80,
    };
    const input = deriveScoresFromClaudeResponse(highEstimate);
    assert.ok(input.competition >= 0 && input.competition <= 100);
    assert.ok(input.competition < 80);
  });
});

describe("Phase D2 offline calibration simulation", () => {
  it("widens score distribution and targets launch_ready band on synthetic batch", () => {
    const report = runScoringSimulation(100);

    assert.ok(
      report.after.scoreStdDev >= report.before.scoreStdDev,
      `D2 stdDev ${report.after.scoreStdDev} should be >= legacy ${report.before.scoreStdDev}`
    );
    assert.ok(
      report.after.scoreStdDev >= 8,
      `stdDev ${report.after.scoreStdDev} should be >= 8`
    );
    assert.ok(
      report.after.launchReadyPct >= 10 && report.after.launchReadyPct <= 20,
      `launch_ready ${report.after.launchReadyPct}% should be 10–20%`
    );
    assert.ok(report.after.uniqueCategories >= 6);
    assert.ok(report.after.duplicateProductRatePct < 10);
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
      category:
        ROTATION_TARGET_CATEGORIES[index % ROTATION_TARGET_CATEGORIES.length],
    }));

    const context = buildDiversityContext(rows);
    const unique = new Set(context.recent.map((row) => row.category));

    assert.ok(unique.size >= 6);
    assert.ok(context.preferredCategories.length > 0);
  });
});

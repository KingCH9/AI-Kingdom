import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { parseProfitMargin } from "@/lib/opportunity/parse-margin";
import { normalizeStoreStatus } from "@/lib/store/status";
import type {
  CategoryMetric,
  EmpireDataset,
  EmpirePerformanceAnalysis,
  MarginBandMetric,
  NicheMetric,
  ScoreBandMetric,
} from "./types";

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

function resolveCategory(
  opportunity: EmpireDataset["opportunities"][number],
  storesByOpportunity: Map<number, EmpireDataset["stores"][number]>
): string {
  if (opportunity.category?.trim()) {
    return opportunity.category.trim();
  }

  const store = storesByOpportunity.get(opportunity.id);
  if (store?.niche?.trim()) {
    return store.niche.trim();
  }

  return "Uncategorized";
}

function buildCategoryMetrics(dataset: EmpireDataset): CategoryMetric[] {
  const storesByOpportunity = new Map<number, EmpireDataset["stores"][number]>();

  for (const store of dataset.stores) {
    if (store.opportunityId) {
      storesByOpportunity.set(store.opportunityId, store);
    }
  }

  const groups = new Map<
    string,
    {
      count: number;
      profitableCount: number;
      launchedCount: number;
      killedCount: number;
      scoreSum: number;
      scoreCount: number;
      marginSum: number;
      marginCount: number;
    }
  >();

  for (const opp of dataset.opportunities) {
    const label = resolveCategory(opp, storesByOpportunity);
    const status = normalizeOpportunityStatus(opp.status);
    const entry = groups.get(label) ?? {
      count: 0,
      profitableCount: 0,
      launchedCount: 0,
      killedCount: 0,
      scoreSum: 0,
      scoreCount: 0,
      marginSum: 0,
      marginCount: 0,
    };

    entry.count += 1;

    if (status === "profitable") {
      entry.profitableCount += 1;
    }

    if (status === "launched" || status === "scaling" || status === "profitable") {
      entry.launchedCount += 1;
    }

    if (status === "killed") {
      entry.killedCount += 1;
    }

    if (opp.opportunityScore != null) {
      entry.scoreSum += opp.opportunityScore;
      entry.scoreCount += 1;
    }

    const margin = parseProfitMargin(opp.profitMargin);
    entry.marginSum += margin;
    entry.marginCount += 1;

    groups.set(label, entry);
  }

  return [...groups.entries()]
    .map(([label, data]) => ({
      label,
      count: data.count,
      profitableCount: data.profitableCount,
      launchedCount: data.launchedCount,
      killedCount: data.killedCount,
      avgScore:
        data.scoreCount > 0
          ? Math.round(data.scoreSum / data.scoreCount)
          : 0,
      avgMargin:
        data.marginCount > 0
          ? Math.round(data.marginSum / data.marginCount)
          : 0,
      profitabilityRate: pct(data.profitableCount, data.launchedCount),
    }))
    .sort((a, b) => b.profitabilityRate - a.profitabilityRate || b.count - a.count);
}

function buildNicheMetrics(dataset: EmpireDataset): NicheMetric[] {
  const groups = new Map<
    string,
    { storeCount: number; totalRevenue: number; profitableCount: number }
  >();

  for (const store of dataset.stores) {
    const niche = store.niche?.trim() || "Unknown";
    const status = normalizeStoreStatus(store.status);
    const entry = groups.get(niche) ?? {
      storeCount: 0,
      totalRevenue: 0,
      profitableCount: 0,
    };

    entry.storeCount += 1;
    entry.totalRevenue += store.revenue;

    if (status === "profitable") {
      entry.profitableCount += 1;
    }

    groups.set(niche, entry);
  }

  return [...groups.entries()]
    .map(([niche, data]) => ({
      niche,
      storeCount: data.storeCount,
      totalRevenue: Math.round(data.totalRevenue),
      profitableCount: data.profitableCount,
      profitabilityRate: pct(data.profitableCount, data.storeCount),
    }))
    .sort((a, b) => b.profitabilityRate - a.profitabilityRate || b.totalRevenue - a.totalRevenue);
}

function buildScoreBandMetrics(dataset: EmpireDataset): ScoreBandMetric[] {
  const bands = [
    { band: "90+", minScore: 90 },
    { band: "80–89", minScore: 80 },
    { band: "70–79", minScore: 70 },
    { band: "Below 70", minScore: 0 },
  ];

  return bands.map(({ band, minScore }) => {
    const nextMin =
      bands.find((item) => item.minScore > minScore)?.minScore ?? 101;

    const matched = dataset.opportunities.filter((opp) => {
      const score = opp.opportunityScore ?? 0;
      if (minScore === 0) {
        return score < 70;
      }
      return score >= minScore && score < nextMin;
    });

    const profitableCount = matched.filter(
      (opp) => normalizeOpportunityStatus(opp.status) === "profitable"
    ).length;

    const launchedCount = matched.filter((opp) => {
      const status = normalizeOpportunityStatus(opp.status);
      return status === "launched" || status === "scaling" || status === "profitable";
    }).length;

    return {
      band,
      minScore,
      count: matched.length,
      profitableCount,
      profitabilityRate: pct(profitableCount, launchedCount),
    };
  });
}

function buildMarginBandMetrics(dataset: EmpireDataset): MarginBandMetric[] {
  const bands = [
    { band: "75%+", minMargin: 75 },
    { band: "65–74%", minMargin: 65 },
    { band: "Below 65%", minMargin: 0 },
  ];

  return bands.map(({ band, minMargin }) => {
    const nextMin =
      bands.find((item) => item.minMargin > minMargin)?.minMargin ?? 101;

    const matched = dataset.opportunities.filter((opp) => {
      const margin = parseProfitMargin(opp.profitMargin);
      if (minMargin === 0) {
        return margin < 65;
      }
      return margin >= minMargin && margin < nextMin;
    });

    const profitableCount = matched.filter(
      (opp) => normalizeOpportunityStatus(opp.status) === "profitable"
    ).length;

    const launchedCount = matched.filter((opp) => {
      const status = normalizeOpportunityStatus(opp.status);
      return status === "launched" || status === "scaling" || status === "profitable";
    }).length;

    return {
      band,
      minMargin,
      count: matched.length,
      profitableCount,
      profitabilityRate: pct(profitableCount, launchedCount),
    };
  });
}

function buildRecommendations(
  analysis: Omit<EmpirePerformanceAnalysis, "recommendations">
): string[] {
  const recommendations: string[] = [];

  const topCategory = analysis.strongestCategories.find(
    (item) => item.launchedCount > 0 && item.profitabilityRate > 0
  );

  if (topCategory) {
    recommendations.push(
      `Prioritize "${topCategory.label}" — ${topCategory.profitabilityRate}% of launched opportunities in this category reached profitability (${topCategory.profitableCount}/${topCategory.launchedCount}).`
    );
  }

  const weakest = analysis.weakestCategories.find(
    (item) => item.killedCount >= 2 && item.count >= 2
  );

  if (weakest) {
    recommendations.push(
      `Increase risk scrutiny for "${weakest.label}" — ${weakest.killedCount} of ${weakest.count} opportunities were killed.`
    );
  }

  const topNiche = analysis.topNiches.find((item) => item.storeCount >= 1);
  if (topNiche && topNiche.profitabilityRate > 0) {
    recommendations.push(
      `Double down on "${topNiche.niche}" stores — ${topNiche.profitableCount}/${topNiche.storeCount} stores profitable with £${topNiche.totalRevenue.toLocaleString()} total revenue.`
    );
  }

  const bestScoreBand = [...analysis.strongestScores]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.profitabilityRate - a.profitabilityRate)[0];

  if (bestScoreBand && bestScoreBand.profitabilityRate > 0) {
    recommendations.push(
      `Favor opportunity scores in the ${bestScoreBand.band} band — ${bestScoreBand.profitabilityRate}% launch-to-profit rate across ${bestScoreBand.count} opportunities.`
    );
  }

  const bestMarginBand = [...analysis.strongestMargins]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.profitabilityRate - a.profitabilityRate)[0];

  if (bestMarginBand && bestMarginBand.profitabilityRate > 0) {
    recommendations.push(
      `Target profit margins in the ${bestMarginBand.band} range — ${bestMarginBand.profitabilityRate}% profitability rate (${bestMarginBand.profitableCount} profitable).`
    );
  }

  if (analysis.launchSuccessRate < 50 && analysis.validationSuccessRate > 0) {
    recommendations.push(
      `Launch success rate is ${analysis.launchSuccessRate}% — tighten CEO approval criteria or improve build/marketing task execution before scaling new launches.`
    );
  }

  if (analysis.profitableStoreRate === 0 && analysis.topNiches.length > 0) {
    recommendations.push(
      "No profitable stores yet — focus on driving revenue past £5,000 on launched stores before expanding categories."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Insufficient outcome data — launch more stores and record revenue to generate actionable intelligence."
    );
  }

  return recommendations;
}

/** Analyzes empire performance and generates data-driven recommendations. */
export function analyzeEmpirePerformance(
  dataset: EmpireDataset
): EmpirePerformanceAnalysis {
  const categoryMetrics = buildCategoryMetrics(dataset);

  const launchedCount = dataset.opportunities.filter((opp) => {
    const status = normalizeOpportunityStatus(opp.status);
    return status === "launched" || status === "scaling" || status === "profitable";
  }).length;

  const profitableOpportunities = dataset.opportunities.filter(
    (opp) => normalizeOpportunityStatus(opp.status) === "profitable"
  ).length;

  const researched = dataset.opportunities.filter(
    (opp) => normalizeOpportunityStatus(opp.status) !== "killed"
  ).length;

  const validatedOrBeyond = dataset.opportunities.filter((opp) => {
    const status = normalizeOpportunityStatus(opp.status);
    return status !== "researching" && status !== "killed";
  }).length;

  const profitableStores = dataset.stores.filter(
    (store) => normalizeStoreStatus(store.status) === "profitable"
  ).length;

  const launchedStores = dataset.stores.filter((store) => {
    const status = normalizeStoreStatus(store.status);
    return status === "launched" || status === "scaling" || status === "profitable";
  }).length;

  const totalOrders = dataset.orders.length;
  const orderRevenue = dataset.orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue =
    totalOrders > 0 ? Math.round((orderRevenue / totalOrders) * 100) / 100 : 0;

  const strongestCategories = categoryMetrics
    .filter((item) => item.launchedCount > 0)
    .slice(0, 5);

  const weakestCategories = [...categoryMetrics]
    .sort((a, b) => a.profitabilityRate - b.profitabilityRate || b.killedCount - a.killedCount)
    .slice(0, 5);

  const partial: Omit<EmpirePerformanceAnalysis, "recommendations"> = {
    strongestCategories,
    strongestMargins: buildMarginBandMetrics(dataset),
    strongestScores: buildScoreBandMetrics(dataset),
    weakestCategories,
    topNiches: buildNicheMetrics(dataset).slice(0, 5),
    profitableStoreRate: pct(profitableStores, launchedStores),
    launchSuccessRate: pct(profitableOpportunities, launchedCount),
    validationSuccessRate: pct(validatedOrBeyond, researched),
    totalOrders,
    averageOrderValue,
  };

  return {
    ...partial,
    recommendations: buildRecommendations(partial),
  };
}

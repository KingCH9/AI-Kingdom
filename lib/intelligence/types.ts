import type { Opportunity, Order, Store } from "@prisma/client";

export interface CategoryMetric {
  label: string;
  count: number;
  profitableCount: number;
  launchedCount: number;
  killedCount: number;
  avgScore: number;
  avgMargin: number;
  profitabilityRate: number;
}

export interface NicheMetric {
  niche: string;
  storeCount: number;
  totalRevenue: number;
  profitableCount: number;
  profitabilityRate: number;
}

export interface ScoreBandMetric {
  band: string;
  minScore: number;
  count: number;
  profitableCount: number;
  profitabilityRate: number;
}

export interface MarginBandMetric {
  band: string;
  minMargin: number;
  count: number;
  profitableCount: number;
  profitabilityRate: number;
}

export interface EmpirePerformanceAnalysis {
  strongestCategories: CategoryMetric[];
  strongestMargins: MarginBandMetric[];
  strongestScores: ScoreBandMetric[];
  weakestCategories: CategoryMetric[];
  topNiches: NicheMetric[];
  profitableStoreRate: number;
  launchSuccessRate: number;
  validationSuccessRate: number;
  totalOrders: number;
  averageOrderValue: number;
  recommendations: string[];
}

export interface EmpireDataset {
  opportunities: Opportunity[];
  stores: Store[];
  orders: Order[];
  generatedAt: Date;
}

export interface IntelligenceSnapshot {
  analysis: EmpirePerformanceAnalysis;
  generatedAt: string;
  opportunityCount: number;
  storeCount: number;
}

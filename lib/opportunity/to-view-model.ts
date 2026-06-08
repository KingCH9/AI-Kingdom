import type { Opportunity } from "@prisma/client";
import { parseStoredJsonArray } from "./parse-stored-fields";

export interface OpportunityViewModel {
  id: number;
  productName: string;
  productDescription: string | null;
  whyTrending: string | null;
  targetCustomer: string | null;
  sellingPrice: string | null;
  estimatedCostPerUnit: string | null;
  profitMargin: string | null;
  supplierSearch: string | null;
  supplier: string | null;
  category: string | null;
  demandScore: number | null;
  competition: number | null;
  riskRating: number | null;
  opportunityScore: number | null;
  status: string;
  createdAt: Date;
  marketingAngles: string[];
  tiktokIdeas: string[];
  facebookAdIdeas: string[];
  alibabaKeywords: string[];
  launchPlan: string[];
}

/** Maps a Prisma Opportunity record to a display-ready view model. */
export function toOpportunityViewModel(
  opportunity: Opportunity
): OpportunityViewModel {
  return {
    id: opportunity.id,
    productName: opportunity.productName,
    productDescription: opportunity.productDescription,
    whyTrending: opportunity.whyTrending,
    targetCustomer: opportunity.targetCustomer,
    sellingPrice: opportunity.sellingPrice,
    estimatedCostPerUnit: opportunity.estimatedCostPerUnit,
    profitMargin: opportunity.profitMargin,
    supplierSearch: opportunity.supplierSearch,
    supplier: opportunity.supplier,
    category: opportunity.category,
    demandScore: opportunity.demandScore,
    competition: opportunity.competition,
    riskRating: opportunity.riskRating,
    opportunityScore: opportunity.opportunityScore,
    status: opportunity.status,
    createdAt: opportunity.createdAt,
    marketingAngles: parseStoredJsonArray(opportunity.marketingAngles),
    tiktokIdeas: parseStoredJsonArray(opportunity.tiktokIdeas),
    facebookAdIdeas: parseStoredJsonArray(opportunity.facebookAdIdeas),
    alibabaKeywords: parseStoredJsonArray(opportunity.alibabaKeywords),
    launchPlan: parseStoredJsonArray(opportunity.launchPlan),
  };
}

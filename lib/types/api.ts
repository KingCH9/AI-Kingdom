import type { OpportunityStatus } from "./opportunity";

/** Standard success envelope for empire/opportunity API routes. */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  status?: number;
  error?: unknown;
  raw?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface GeneratedOpportunityPayload {
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
  marketingAngles: string | null;
  tiktokIdeas: string | null;
  facebookAdIdeas: string | null;
  alibabaKeywords: string | null;
  launchPlan: string | null;
  category: string | null;
  demandScore: number | null;
  competition: number | null;
  riskRating: number | null;
  opportunityScore: number | null;
  status: OpportunityStatus;
  createdAt: Date;
}

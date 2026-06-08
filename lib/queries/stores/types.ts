import type { StoreStatus } from "@/lib/types/store";
import type { OpportunityStatus } from "@/lib/types";
import type { MarketingPlanView } from "@/lib/store/parse-marketing-plan";
import type { TaskStatus } from "@/lib/types";

export interface StoreListItem {
  id: number;
  name: string;
  niche: string;
  revenue: number;
  status: StoreStatus;
  rawStatus: string;
  opportunityId: number | null;
  opportunityName: string | null;
  opportunityScore: number | null;
  createdAt: Date;
}

export interface StoreDashboardStats {
  total: number;
  building: number;
  launched: number;
  scaling: number;
  profitable: number;
}

export interface StoreAgentLogEntry {
  id: number;
  agentName: string;
  action: string;
  createdAt: Date;
  agentRole: "ceo" | "validator" | "store_builder" | "marketing" | "other";
}

export interface StoreProductEntry {
  id: number;
  name: string;
  price: number;
}

export interface StoreCommerceMetrics {
  totalCustomers: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface StoreOrderEntry {
  id: number;
  placedAt: Date;
  customerEmail: string;
  customerName: string | null;
  source: string;
  total: number;
  status: string;
}

export interface StoreTaskEntry {
  id: number;
  title: string;
  agent: string;
  status: TaskStatus;
  result: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface StoreTasksByStatus {
  pending: StoreTaskEntry[];
  in_progress: StoreTaskEntry[];
  completed: StoreTaskEntry[];
  failed: StoreTaskEntry[];
}

export interface StoreDetailViewModel {
  id: number;
  name: string;
  niche: string;
  revenue: number;
  status: StoreStatus;
  rawStatus: string;
  createdAt: Date;
  productCount: number;
  products: StoreProductEntry[];
  revenueEntryCount: number;
  commerce: StoreCommerceMetrics;
  orders: StoreOrderEntry[];
  opportunity: {
    id: number;
    productName: string;
    productDescription: string | null;
    targetCustomer: string | null;
    profitMargin: string | null;
    supplier: string | null;
    whyTrending: string | null;
    opportunityScore: number | null;
    lifecycleStage: OpportunityStatus;
  } | null;
  marketingPlan: MarketingPlanView | null;
  agentLogs: StoreAgentLogEntry[];
  tasks: StoreTasksByStatus;
}

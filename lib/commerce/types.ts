export type RecordOrderRevenueInput = {
  storeId: number;
  email: string;
  name?: string | null;
  total: number;
  currency?: string;
  source: string;
  externalId?: string | null;
  lineItemsJson?: string;
  placedAt?: Date;
  customerExternalId?: string | null;
  productId?: number | null;
  opportunityId?: number | null;
};

export type RecordOrderRevenueResult = {
  duplicate: boolean;
  orderId: number;
  customerId: number;
  revenueId: number;
  storeId: number;
  amount: number;
  totalRevenue: number;
  storeStatus: string;
};

-- Phase D3.8 — order links + shop analytics (PostgreSQL)

ALTER TABLE "Order" ADD COLUMN "productId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "opportunityId" INTEGER;

CREATE INDEX "Order_productId_idx" ON "Order"("productId");
CREATE INDEX "Order_opportunityId_idx" ON "Order"("opportunityId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopAnalyticsEvent" (
    "id" SERIAL NOT NULL,
    "storeId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopAnalyticsEvent_storeId_idx" ON "ShopAnalyticsEvent"("storeId");
CREATE INDEX "ShopAnalyticsEvent_eventType_idx" ON "ShopAnalyticsEvent"("eventType");
CREATE INDEX "ShopAnalyticsEvent_createdAt_idx" ON "ShopAnalyticsEvent"("createdAt");

ALTER TABLE "ShopAnalyticsEvent" ADD CONSTRAINT "ShopAnalyticsEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

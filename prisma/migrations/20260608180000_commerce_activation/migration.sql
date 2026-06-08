-- Phase D3.8 — order links + shop analytics (SQLite)

ALTER TABLE "Order" ADD COLUMN "productId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "opportunityId" INTEGER;

CREATE INDEX "Order_productId_idx" ON "Order"("productId");
CREATE INDEX "Order_opportunityId_idx" ON "Order"("opportunityId");

CREATE TABLE "ShopAnalyticsEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopAnalyticsEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "ShopAnalyticsEvent_storeId_idx" ON "ShopAnalyticsEvent"("storeId");
CREATE INDEX "ShopAnalyticsEvent_eventType_idx" ON "ShopAnalyticsEvent"("eventType");
CREATE INDEX "ShopAnalyticsEvent_createdAt_idx" ON "ShopAnalyticsEvent"("createdAt");

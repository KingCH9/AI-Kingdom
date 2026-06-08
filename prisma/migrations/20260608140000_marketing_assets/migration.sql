-- Phase D3.4 — marketing launch packages and assets (SQLite)

CREATE TABLE "MarketingLaunchPackage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "launchStrategy" TEXT NOT NULL,
    "budgetTiers" TEXT NOT NULL DEFAULT '[]',
    "tiktokStrategy" TEXT NOT NULL,
    "metaStrategy" TEXT NOT NULL,
    "influencerStrategy" TEXT NOT NULL,
    "emailStrategy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarketingLaunchPackage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MarketingLaunchPackage_storeId_key" ON "MarketingLaunchPackage"("storeId");
CREATE INDEX "MarketingLaunchPackage_storeId_idx" ON "MarketingLaunchPackage"("storeId");

CREATE TABLE "MarketingAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "assetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketingAsset_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MarketingAsset_storeId_assetType_title_key" ON "MarketingAsset"("storeId", "assetType", "title");
CREATE INDEX "MarketingAsset_storeId_idx" ON "MarketingAsset"("storeId");
CREATE INDEX "MarketingAsset_assetType_idx" ON "MarketingAsset"("assetType");
CREATE INDEX "MarketingAsset_platform_idx" ON "MarketingAsset"("platform");

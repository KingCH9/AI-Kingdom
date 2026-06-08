-- Phase D3.3 — product pages and store slugs

ALTER TABLE "Store" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

CREATE TABLE "ProductPage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER,
    "heroHeadline" TEXT NOT NULL,
    "subheadline" TEXT NOT NULL,
    "salesCopy" TEXT NOT NULL,
    "benefits" TEXT NOT NULL DEFAULT '[]',
    "features" TEXT NOT NULL DEFAULT '[]',
    "faq" TEXT NOT NULL DEFAULT '[]',
    "ctaText" TEXT NOT NULL DEFAULT 'Buy Now',
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductPage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductPage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProductPage_storeId_key" ON "ProductPage"("storeId");
CREATE UNIQUE INDEX "ProductPage_productId_key" ON "ProductPage"("productId");
CREATE INDEX "ProductPage_storeId_idx" ON "ProductPage"("storeId");

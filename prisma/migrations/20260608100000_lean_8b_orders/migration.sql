-- Lean 8B: Customer, Order, Revenue.orderId

CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "externalId" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "total" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Customer_storeId_email_key" ON "Customer"("storeId", "email");
CREATE INDEX "Customer_storeId_idx" ON "Customer"("storeId");

CREATE UNIQUE INDEX "Order_source_externalId_key" ON "Order"("source", "externalId");
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_placedAt_idx" ON "Order"("placedAt");

ALTER TABLE "Revenue" ADD COLUMN "orderId" INTEGER;
CREATE INDEX "Revenue_orderId_idx" ON "Revenue"("orderId");

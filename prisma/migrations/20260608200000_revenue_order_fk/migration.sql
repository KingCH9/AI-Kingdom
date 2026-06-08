-- Phase 8D.0: Align Revenue.orderId with Prisma schema (FK to Order)
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Revenue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "amount" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Revenue_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Revenue_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Revenue" ("id", "amount", "source", "storeId", "orderId", "createdAt")
SELECT "id", "amount", "source", "storeId", "orderId", "createdAt" FROM "Revenue";

DROP TABLE "Revenue";
ALTER TABLE "new_Revenue" RENAME TO "Revenue";
CREATE INDEX "Revenue_orderId_idx" ON "Revenue"("orderId");

PRAGMA foreign_keys=ON;

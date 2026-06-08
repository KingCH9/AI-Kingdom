-- Migration: add_store_opportunity_link
-- Purpose: Link stores to the opportunity that created them (nullable, non-destructive)
--
-- Safe for existing data:
--   - Adds optional opportunityId column (NULL for existing stores)
--   - No columns removed, no data deleted

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "revenue" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "opportunityId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Store_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Store" ("createdAt", "id", "name", "niche", "revenue", "status")
SELECT "createdAt", "id", "name", "niche", "revenue", "status" FROM "Store";

DROP TABLE "Store";
ALTER TABLE "new_Store" RENAME TO "Store";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

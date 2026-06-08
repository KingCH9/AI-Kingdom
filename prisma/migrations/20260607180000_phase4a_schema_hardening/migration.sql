-- Phase 4a: Schema hardening — AgentLog traceability, Opportunity.updatedAt, indexes

-- Redefine Opportunity with updatedAt (SQLite table rebuild)
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Opportunity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productName" TEXT NOT NULL,
    "productDescription" TEXT,
    "whyTrending" TEXT,
    "targetCustomer" TEXT,
    "sellingPrice" TEXT,
    "estimatedCostPerUnit" TEXT,
    "profitMargin" TEXT,
    "supplierSearch" TEXT,
    "supplier" TEXT,
    "marketingAngles" TEXT,
    "tiktokIdeas" TEXT,
    "facebookAdIdeas" TEXT,
    "alibabaKeywords" TEXT,
    "launchPlan" TEXT,
    "category" TEXT,
    "demandScore" INTEGER,
    "competition" INTEGER,
    "riskRating" INTEGER,
    "opportunityScore" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'researching',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_Opportunity" (
    "id", "productName", "productDescription", "whyTrending", "targetCustomer",
    "sellingPrice", "estimatedCostPerUnit", "profitMargin", "supplierSearch", "supplier",
    "marketingAngles", "tiktokIdeas", "facebookAdIdeas", "alibabaKeywords", "launchPlan",
    "category", "demandScore", "competition", "riskRating", "opportunityScore", "status",
    "createdAt", "updatedAt"
)
SELECT
    "id", "productName", "productDescription", "whyTrending", "targetCustomer",
    "sellingPrice", "estimatedCostPerUnit", "profitMargin", "supplierSearch", "supplier",
    "marketingAngles", "tiktokIdeas", "facebookAdIdeas", "alibabaKeywords", "launchPlan",
    "category", "demandScore", "competition", "riskRating", "opportunityScore", "status",
    "createdAt", COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "Opportunity";

DROP TABLE "Opportunity";
ALTER TABLE "new_Opportunity" RENAME TO "Opportunity";

-- Redefine AgentLog with FK columns
CREATE TABLE "new_AgentLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agentName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "opportunityId" INTEGER,
    "taskId" INTEGER,
    "storeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentLog_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AgentLog" ("id", "agentName", "action", "createdAt")
SELECT "id", "agentName", "action", "createdAt" FROM "AgentLog";

DROP TABLE "AgentLog";
ALTER TABLE "new_AgentLog" RENAME TO "AgentLog";

PRAGMA foreign_keys=ON;

-- Indexes
CREATE INDEX "Agent_role_idx" ON "Agent"("role");
CREATE INDEX "Store_opportunityId_idx" ON "Store"("opportunityId");
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");
CREATE INDEX "Opportunity_opportunityScore_idx" ON "Opportunity"("opportunityScore");
CREATE INDEX "Task_status_createdAt_idx" ON "Task"("status", "createdAt");
CREATE INDEX "Task_agent_idx" ON "Task"("agent");
CREATE INDEX "Task_opportunityId_idx" ON "Task"("opportunityId");
CREATE INDEX "AgentLog_agentName_createdAt_idx" ON "AgentLog"("agentName", "createdAt");
CREATE INDEX "AgentLog_opportunityId_idx" ON "AgentLog"("opportunityId");
CREATE INDEX "AgentLog_taskId_idx" ON "AgentLog"("taskId");
CREATE INDEX "AgentLog_storeId_idx" ON "AgentLog"("storeId");

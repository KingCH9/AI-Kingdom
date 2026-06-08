-- Phase 3G — persistent HQ agent and scout performance snapshots

CREATE TABLE "AgentPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agentKey" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "score" REAL NOT NULL DEFAULT 0,
    "missionsWorked" INTEGER NOT NULL DEFAULT 0,
    "missionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "revenueInfluenced" REAL NOT NULL DEFAULT 0,
    "lastCalculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AgentPerformance_agentKey_key" ON "AgentPerformance"("agentKey");
CREATE INDEX "AgentPerformance_department_idx" ON "AgentPerformance"("department");
CREATE INDEX "AgentPerformance_level_idx" ON "AgentPerformance"("level");
CREATE INDEX "AgentPerformance_score_idx" ON "AgentPerformance"("score");

CREATE TABLE "ScoutPerformance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scoutKey" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "score" REAL NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesApproved" INTEGER NOT NULL DEFAULT 0,
    "missionsCreated" INTEGER NOT NULL DEFAULT 0,
    "missionsLaunched" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" REAL NOT NULL DEFAULT 0,
    "successRate" REAL NOT NULL DEFAULT 0,
    "lastCalculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ScoutPerformance_scoutKey_key" ON "ScoutPerformance"("scoutKey");
CREATE INDEX "ScoutPerformance_level_idx" ON "ScoutPerformance"("level");
CREATE INDEX "ScoutPerformance_score_idx" ON "ScoutPerformance"("score");

-- Phase 3G — persistent HQ agent and scout performance snapshots (PostgreSQL)

CREATE TABLE "AgentPerformance" (
    "id" SERIAL NOT NULL,
    "agentKey" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missionsWorked" INTEGER NOT NULL DEFAULT 0,
    "missionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "revenueInfluenced" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPerformance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentPerformance_agentKey_key" ON "AgentPerformance"("agentKey");
CREATE INDEX "AgentPerformance_department_idx" ON "AgentPerformance"("department");
CREATE INDEX "AgentPerformance_level_idx" ON "AgentPerformance"("level");
CREATE INDEX "AgentPerformance_score_idx" ON "AgentPerformance"("score");

CREATE TABLE "ScoutPerformance" (
    "id" SERIAL NOT NULL,
    "scoutKey" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opportunitiesFound" INTEGER NOT NULL DEFAULT 0,
    "opportunitiesApproved" INTEGER NOT NULL DEFAULT 0,
    "missionsCreated" INTEGER NOT NULL DEFAULT 0,
    "missionsLaunched" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutPerformance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScoutPerformance_scoutKey_key" ON "ScoutPerformance"("scoutKey");
CREATE INDEX "ScoutPerformance_level_idx" ON "ScoutPerformance"("level");
CREATE INDEX "ScoutPerformance_score_idx" ON "ScoutPerformance"("score");

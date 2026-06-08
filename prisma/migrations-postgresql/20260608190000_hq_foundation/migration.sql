-- Phase HQ 1a — departments, missions, constitution, budgets (PostgreSQL)

CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "monthlyBudgetGbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_key_key" ON "Department"("key");

ALTER TABLE "Agent" ADD COLUMN "departmentId" INTEGER;
ALTER TABLE "Agent" ADD COLUMN "hqPersona" TEXT;
ALTER TABLE "Agent" ADD COLUMN "agentKind" TEXT;
ALTER TABLE "Agent" ADD COLUMN "subRoleKey" TEXT;
ALTER TABLE "Agent" ADD COLUMN "avatarKey" TEXT;

CREATE INDEX "Agent_departmentId_idx" ON "Agent"("departmentId");
CREATE INDEX "Agent_hqPersona_idx" ON "Agent"("hqPersona");

ALTER TABLE "Agent" ADD CONSTRAINT "Agent_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Mission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'researching',
    "ownerPersona" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "opportunityId" INTEGER,
    "storeId" INTEGER,
    "revenueStream" TEXT NOT NULL DEFAULT 'shopify',
    "revenueTier" INTEGER NOT NULL DEFAULT 1,
    "targetRoi" DOUBLE PRECISION,
    "estimatedCostGbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCostGbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "humanOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mission_opportunityId_key" ON "Mission"("opportunityId");
CREATE INDEX "Mission_status_idx" ON "Mission"("status");
CREATE INDEX "Mission_departmentId_idx" ON "Mission"("departmentId");
CREATE INDEX "Mission_ownerPersona_idx" ON "Mission"("ownerPersona");
CREATE INDEX "Mission_storeId_idx" ON "Mission"("storeId");

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MissionTask" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ownerPersona" TEXT NOT NULL,
    "assignedAgentId" INTEGER,
    "legacyTaskId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostGbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionTask_missionId_idx" ON "MissionTask"("missionId");
CREATE INDEX "MissionTask_status_idx" ON "MissionTask"("status");
CREATE INDEX "MissionTask_legacyTaskId_idx" ON "MissionTask"("legacyTaskId");

ALTER TABLE "MissionTask" ADD CONSTRAINT "MissionTask_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MissionTask" ADD CONSTRAINT "MissionTask_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MissionTask" ADD CONSTRAINT "MissionTask_legacyTaskId_fkey" FOREIGN KEY ("legacyTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MissionEvent" (
    "id" SERIAL NOT NULL,
    "missionId" INTEGER NOT NULL,
    "agentPersona" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "estimatedCostGbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MissionEvent_missionId_idx" ON "MissionEvent"("missionId");

ALTER TABLE "MissionEvent" ADD CONSTRAINT "MissionEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "allocatedGbp" DOUBLE PRECISION NOT NULL,
    "spentGbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Budget_departmentId_periodMonth_key" ON "Budget"("departmentId", "periodMonth");

ALTER TABLE "Budget" ADD CONSTRAINT "Budget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ConstitutionRule" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstitutionRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConstitutionRule_key_key" ON "ConstitutionRule"("key");

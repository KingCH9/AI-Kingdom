-- Phase HQ 1a — departments, missions, constitution, budgets (SQLite)

ALTER TABLE "Agent" ADD COLUMN "departmentId" INTEGER;
ALTER TABLE "Agent" ADD COLUMN "hqPersona" TEXT;
ALTER TABLE "Agent" ADD COLUMN "agentKind" TEXT;
ALTER TABLE "Agent" ADD COLUMN "subRoleKey" TEXT;
ALTER TABLE "Agent" ADD COLUMN "avatarKey" TEXT;

CREATE INDEX "Agent_departmentId_idx" ON "Agent"("departmentId");
CREATE INDEX "Agent_hqPersona_idx" ON "Agent"("hqPersona");

CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "monthlyBudgetGbp" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Department_key_key" ON "Department"("key");

CREATE TABLE "Mission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'researching',
    "ownerPersona" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "opportunityId" INTEGER,
    "storeId" INTEGER,
    "revenueStream" TEXT NOT NULL DEFAULT 'shopify',
    "revenueTier" INTEGER NOT NULL DEFAULT 1,
    "targetRoi" REAL,
    "estimatedCostGbp" REAL NOT NULL DEFAULT 0,
    "actualCostGbp" REAL NOT NULL DEFAULT 0,
    "approvedAt" DATETIME,
    "approvedBy" TEXT,
    "humanOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Mission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Mission_opportunityId_key" ON "Mission"("opportunityId");
CREATE INDEX "Mission_status_idx" ON "Mission"("status");
CREATE INDEX "Mission_departmentId_idx" ON "Mission"("departmentId");
CREATE INDEX "Mission_ownerPersona_idx" ON "Mission"("ownerPersona");
CREATE INDEX "Mission_storeId_idx" ON "Mission"("storeId");

CREATE TABLE "MissionTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "missionId" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ownerPersona" TEXT NOT NULL,
    "assignedAgentId" INTEGER,
    "legacyTaskId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostGbp" REAL NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MissionTask_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissionTask_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MissionTask_legacyTaskId_fkey" FOREIGN KEY ("legacyTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "MissionTask_missionId_idx" ON "MissionTask"("missionId");
CREATE INDEX "MissionTask_status_idx" ON "MissionTask"("status");
CREATE INDEX "MissionTask_legacyTaskId_idx" ON "MissionTask"("legacyTaskId");

CREATE TABLE "MissionEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "missionId" INTEGER NOT NULL,
    "agentPersona" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "estimatedCostGbp" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MissionEvent_missionId_idx" ON "MissionEvent"("missionId");

CREATE TABLE "Budget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "departmentId" INTEGER NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "allocatedGbp" REAL NOT NULL,
    "spentGbp" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Budget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Budget_departmentId_periodMonth_key" ON "Budget"("departmentId", "periodMonth");

CREATE TABLE "ConstitutionRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "ConstitutionRule_key_key" ON "ConstitutionRule"("key");

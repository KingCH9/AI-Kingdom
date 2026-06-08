-- Migration: sync_agent_log_and_opportunity_fields
-- Purpose: Align database with prisma/schema.prisma (resolve schema drift)
--
-- ADDITIVE ONLY — no columns or tables removed.
-- Safe for existing data: all new Opportunity columns are nullable.
--
-- Drift resolved:
--   1. CREATE TABLE "AgentLog" (model existed in schema, never migrated)
--   2. ADD marketing/content columns to "Opportunity" (used by /api/empire)

-- CreateTable
CREATE TABLE "AgentLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agentName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- AlterTable: Opportunity marketing & launch fields
ALTER TABLE "Opportunity" ADD COLUMN "marketingAngles" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "tiktokIdeas" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "facebookAdIdeas" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "alibabaKeywords" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "launchPlan" TEXT;

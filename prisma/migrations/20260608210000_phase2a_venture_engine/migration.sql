-- Phase 2A — venture types, templates, mission venture links (SQLite)

CREATE TABLE "VentureType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "VentureType_key_key" ON "VentureType"("key");

CREATE TABLE "VentureTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ventureTypeId" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureTemplate_ventureTypeId_fkey" FOREIGN KEY ("ventureTypeId") REFERENCES "VentureType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VentureTemplate_key_key" ON "VentureTemplate"("key");
CREATE INDEX "VentureTemplate_ventureTypeId_idx" ON "VentureTemplate"("ventureTypeId");

ALTER TABLE "Mission" ADD COLUMN "ventureTypeId" INTEGER;
ALTER TABLE "Mission" ADD COLUMN "ventureTemplateId" INTEGER;

CREATE INDEX "Mission_ventureTypeId_idx" ON "Mission"("ventureTypeId");
CREATE INDEX "Mission_ventureTemplateId_idx" ON "Mission"("ventureTemplateId");

-- Phase 2A — venture types, templates, mission venture links (PostgreSQL)

CREATE TABLE "VentureType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VentureType_key_key" ON "VentureType"("key");

CREATE TABLE "VentureTemplate" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ventureTypeId" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentureTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VentureTemplate_key_key" ON "VentureTemplate"("key");
CREATE INDEX "VentureTemplate_ventureTypeId_idx" ON "VentureTemplate"("ventureTypeId");

ALTER TABLE "VentureTemplate" ADD CONSTRAINT "VentureTemplate_ventureTypeId_fkey"
    FOREIGN KEY ("ventureTypeId") REFERENCES "VentureType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Mission" ADD COLUMN "ventureTypeId" INTEGER;
ALTER TABLE "Mission" ADD COLUMN "ventureTemplateId" INTEGER;

CREATE INDEX "Mission_ventureTypeId_idx" ON "Mission"("ventureTypeId");
CREATE INDEX "Mission_ventureTemplateId_idx" ON "Mission"("ventureTemplateId");

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_ventureTypeId_fkey"
    FOREIGN KEY ("ventureTypeId") REFERENCES "VentureType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Mission" ADD CONSTRAINT "Mission_ventureTemplateId_fkey"
    FOREIGN KEY ("ventureTemplateId") REFERENCES "VentureTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

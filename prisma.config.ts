import { config } from "dotenv";
import { defineConfig } from "prisma/config";

function isRailwayOrProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID)
  );
}

// Local `.env` is SQLite. Never load it when the shell already has DATABASE_URL,
// or when running on Railway/production where PostgreSQL is the target.
if (!process.env.DATABASE_URL?.trim() && !isRailwayOrProduction()) {
  config();
}

function usesPostgresAssets(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";

  if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
    return true;
  }

  if (url.startsWith("file:")) {
    return false;
  }

  // Railway build/release may run before DATABASE_URL is injected.
  if (isRailwayOrProduction()) {
    return true;
  }

  return false;
}

/** Selects SQLite (local) or PostgreSQL (Railway/production) schema and migrations. */
export default defineConfig({
  schema: usesPostgresAssets()
    ? "prisma/schema.postgresql.prisma"
    : "prisma/schema.prisma",
  migrations: {
    path: usesPostgresAssets()
      ? "prisma/migrations-postgresql"
      : "prisma/migrations",
  },
});

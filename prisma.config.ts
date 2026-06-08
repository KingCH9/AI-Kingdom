import "dotenv/config";
import { defineConfig } from "prisma/config";

function isPostgresUrl(): boolean {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/** Selects SQLite (local) or PostgreSQL (Railway/production) schema and migrations. */
export default defineConfig({
  schema: isPostgresUrl()
    ? "prisma/schema.postgresql.prisma"
    : "prisma/schema.prisma",
  migrations: {
    path: isPostgresUrl()
      ? "prisma/migrations-postgresql"
      : "prisma/migrations",
  },
});

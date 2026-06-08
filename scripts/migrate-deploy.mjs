import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function assertMigrationSqlHasNoBom(migrationsDir) {
  for (const entry of readdirSync(migrationsDir)) {
    const migrationPath = join(migrationsDir, entry, "migration.sql");
    try {
      if (!statSync(migrationPath).isFile()) continue;
    } catch {
      continue;
    }

    const bytes = readFileSync(migrationPath);
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      throw new Error(
        `UTF-8 BOM detected in ${migrationPath} — save as UTF-8 without BOM`
      );
    }
  }
}

const url = process.env.DATABASE_URL?.trim() ?? "";
const scheme = url.startsWith("postgresql://")
  ? "postgresql"
  : url.startsWith("postgres://")
    ? "postgres"
    : url.startsWith("file:")
      ? "sqlite"
      : url
        ? "other"
        : "missing";

console.log(`[migrate] DATABASE_URL scheme: ${scheme}`);

if (!url) {
  console.error("[migrate] DATABASE_URL is not set — cannot run migrations");
  process.exit(1);
}

const migrationsDir =
  scheme === "postgresql" || scheme === "postgres"
    ? "prisma/migrations-postgresql"
    : "prisma/migrations";

assertMigrationSqlHasNoBom(migrationsDir);

console.log("[migrate] Running prisma migrate deploy...");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
console.log("[migrate] Migrations applied successfully.");

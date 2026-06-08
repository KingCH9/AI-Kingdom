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

const isProduction =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  Boolean(process.env.RAILWAY_PROJECT_ID);

if (!url) {
  console.error("[migrate] DATABASE_URL is not set — cannot run migrations");
  process.exit(1);
}

if (isProduction && (scheme === "sqlite" || scheme === "missing")) {
  console.error(
    "[migrate] Production requires a PostgreSQL DATABASE_URL — link Railway Postgres to this service"
  );
  process.exit(1);
}

const migrationsDir =
  scheme === "postgresql" || scheme === "postgres"
    ? "prisma/migrations-postgresql"
    : "prisma/migrations";

assertMigrationSqlHasNoBom(migrationsDir);

function isRailwayNetwork() {
  return (
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID) ||
    Boolean(process.env.RAILWAY_SERVICE_ID) ||
    url.includes("railway.internal")
  );
}

function runMigrateDeploy() {
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
}

console.log("[migrate] Running prisma migrate deploy...");
try {
  runMigrateDeploy();
  console.log("[migrate] Migrations applied successfully.");
} catch {
  if (
    isRailwayNetwork() &&
    (scheme === "postgresql" || scheme === "postgres") &&
    process.env.RAILWAY_SKIP_MIGRATE_RECOVER !== "true"
  ) {
    console.log(
      "[migrate] Deploy failed on Railway — running automatic P3009 recovery " +
        "(scripts/railway-migrate-recover.mjs)..."
    );
    try {
      execSync("node scripts/railway-migrate-recover.mjs", {
        stdio: "inherit",
        env: process.env,
      });
      console.log("[migrate] Recovery completed.");
    } catch {
      console.error("[migrate] Automatic recovery failed.");
      process.exit(1);
    }
  } else {
    console.error("[migrate] prisma migrate deploy failed.");
    process.exit(1);
  }
}

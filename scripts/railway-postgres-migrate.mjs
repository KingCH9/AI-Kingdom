/**
 * Run Prisma migration recovery against Railway PostgreSQL only.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "<paste from Railway Postgres → Connect → DATABASE_URL>"
 *   node scripts/railway-postgres-migrate.mjs
 *
 * Or create .env.railway (gitignored) with DATABASE_URL=postgresql://...
 *   node --env-file=.env.railway scripts/railway-postgres-migrate.mjs
 */
import { execSync } from "node:child_process";

const MIGRATION = "20260609000000_baseline";

function getDatabaseUrl() {
  return (
    process.env.RAILWAY_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

function maskUrl(url) {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

function assertPostgres(url) {
  if (!url) {
    console.error(
      "[railway-postgres] DATABASE_URL is not set.\n" +
        "Copy the PostgreSQL URL from Railway:\n" +
        "  Postgres service → Connect → DATABASE_URL\n" +
        "Then run:\n" +
        '  $env:DATABASE_URL = "postgresql://..."\n' +
        "  node scripts/railway-postgres-migrate.mjs"
    );
    process.exit(1);
  }

  if (url.startsWith("file:")) {
    console.error(
      "[railway-postgres] Refusing SQLite DATABASE_URL (local dev.db).\n" +
        "Set the Railway PostgreSQL connection string instead."
    );
    process.exit(1);
  }

  if (
    !url.startsWith("postgresql://") &&
    !url.startsWith("postgres://")
  ) {
    console.error(
      `[railway-postgres] DATABASE_URL must be PostgreSQL, got: ${url.split(":")[0]}:`
    );
    process.exit(1);
  }
}

function run(cmd, label) {
  console.log(`\n[railway-postgres] ▶ ${label}`);
  console.log(`[railway-postgres] $ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    env: process.env,
  });
}

function inspectMigrations() {
  console.log("\n[railway-postgres] ▶ Inspect _prisma_migrations");
  try {
    const sql =
      'SELECT id, migration_name, started_at, finished_at, rolled_back_at, logs FROM "_prisma_migrations" ORDER BY started_at;';
    const out = execSync(
      `npx prisma db execute --stdin --url "${process.env.DATABASE_URL.replace(/"/g, '\\"')}"`,
      {
        input: sql,
        encoding: "utf8",
        env: process.env,
      }
    );
    console.log(out || "(no output)");
  } catch (error) {
    const message = error.stderr?.toString() || error.message || String(error);
    if (
      message.includes("42P01") ||
      message.includes("_prisma_migrations")
    ) {
      console.log(
        "[railway-postgres] _prisma_migrations table does not exist yet (fresh database)."
      );
    } else {
      console.log("[railway-postgres] Could not query _prisma_migrations:");
      console.log(message);
    }
  }
}

const url = getDatabaseUrl();
assertPostgres(url);
process.env.DATABASE_URL = url;

console.log(`[railway-postgres] Target: ${maskUrl(url)}`);
console.log("[railway-postgres] Datasource: PostgreSQL (verified)");

inspectMigrations();

let statusOutput = "";
try {
  statusOutput = execSync("npx prisma migrate status", {
    encoding: "utf8",
    env: process.env,
  });
  console.log(statusOutput);
} catch (error) {
  statusOutput =
    error.stdout?.toString() || error.stderr?.toString() || error.message || "";
  console.log(statusOutput);
}

const needsResolve =
  statusOutput.includes("failed") ||
  statusOutput.includes("failed migrations") ||
  statusOutput.includes("P3009") ||
  statusOutput.includes(MIGRATION);

if (needsResolve) {
  run(
    `npx prisma migrate resolve --rolled-back ${MIGRATION}`,
    `Resolve failed migration ${MIGRATION} as rolled back`
  );
} else {
  console.log(
    `\n[railway-postgres] No failed migration detected for ${MIGRATION}; skipping resolve.`
  );
}

run("npx prisma migrate deploy", "Apply pending migrations");

console.log("\n[railway-postgres] ▶ Final migration status");
try {
  console.log(
    execSync("npx prisma migrate status", {
      encoding: "utf8",
      env: process.env,
    })
  );
} catch (error) {
  console.log(error.stdout?.toString() || error.message);
}

inspectMigrations();
console.log("\n[railway-postgres] Done.");

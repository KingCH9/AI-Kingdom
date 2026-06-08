/**
 * Railway PostgreSQL migration recovery — run ON Railway's network only.
 *
 * Local PCs cannot reach postgres.railway.internal.
 *
 * Railway CLI v5: `railway run` executes LOCALLY (env vars only) — it cannot
 * reach internal hostnames. Use `railway ssh` to run inside your web service:
 *
 *   railway login
 *   railway link
 *   railway ssh -- npm run db:railway:inspect
 *   railway ssh -- npm run db:railway:recover
 *
 * Or interactive shell: railway ssh
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const BASELINE = "20260609000000_baseline";

/** Tables created by prisma/migrations-postgresql/20260609000000_baseline/migration.sql */
const BASELINE_TABLES = [
  "Agent",
  "Store",
  "Customer",
  "Order",
  "Product",
  "Revenue",
  "Opportunity",
  "Task",
  "AgentLog",
];

function maskUrl(url) {
  return url.replace(/:([^:@/]+)@/, ":***@");
}

function isRailwayNetwork() {
  return (
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID) ||
    Boolean(process.env.RAILWAY_SERVICE_ID) ||
    (process.env.DATABASE_URL ?? "").includes("railway.internal")
  );
}

function assertPostgresUrl() {
  const url = process.env.DATABASE_URL?.trim() ?? "";

  if (!url) {
    console.error("[recover] DATABASE_URL is not set.");
    process.exit(1);
  }

  if (url.startsWith("file:")) {
    console.error(
      "[recover] Refusing SQLite DATABASE_URL. Run via `railway ssh -- npm run db:railway:recover`."
    );
    process.exit(1);
  }

  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    console.error(`[recover] Expected PostgreSQL DATABASE_URL, got: ${url.split(":")[0]}:`);
    process.exit(1);
  }

  if (!isRailwayNetwork()) {
    console.warn(
      "[recover] WARNING: Not running on Railway (no RAILWAY_* env / internal host).\n" +
        "  postgres.railway.internal is unreachable from your PC.\n" +
        "  Use: railway ssh -- npm run db:railway:recover\n"
    );
  }

  return url;
}

function run(cmd, label) {
  console.log(`\n[recover] ▶ ${label}`);
  console.log(`[recover] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function getMigrateStatus() {
  try {
    return execSync("npx prisma migrate status", {
      encoding: "utf8",
      env: process.env,
    });
  } catch (error) {
    return (
      error.stdout?.toString() ||
      error.stderr?.toString() ||
      error.message ||
      ""
    );
  }
}

async function inspectDatabase() {
  const prisma = new PrismaClient();

  try {
    const migrationRows = await prisma.$queryRawUnsafe(`
      SELECT id, migration_name, started_at, finished_at, rolled_back_at, logs
      FROM "_prisma_migrations"
      ORDER BY started_at
    `);

    const tableRows = await prisma.$queryRawUnsafe(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tables = tableRows.map((row) => row.tablename);
    const appTables = tables.filter((name) => BASELINE_TABLES.includes(name));
    const missingBaseline = BASELINE_TABLES.filter((name) => !tables.includes(name));

    return {
      migrationRows,
      tables,
      appTables,
      missingBaseline,
      baselineComplete: missingBaseline.length === 0,
      baselinePartial:
        appTables.length > 0 && appTables.length < BASELINE_TABLES.length,
      baselineAbsent: appTables.length === 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("42P01") && message.includes("_prisma_migrations")) {
      return {
        migrationRows: [],
        tables: [],
        appTables: [],
        missingBaseline: [...BASELINE_TABLES],
        baselineComplete: false,
        baselinePartial: false,
        baselineAbsent: true,
        noMigrationTable: true,
      };
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function printInspection(inspection, statusOutput) {
  console.log("\n[recover] === Inspection ===");
  console.log(`[recover] DATABASE_URL: ${maskUrl(process.env.DATABASE_URL ?? "")}`);
  console.log(`[recover] On Railway network: ${isRailwayNetwork() ? "yes" : "no"}`);

  console.log("\n[recover] _prisma_migrations:");
  if (inspection.noMigrationTable) {
    console.log("  (table does not exist — migrations never started)");
  } else if (inspection.migrationRows.length === 0) {
    console.log("  (empty)");
  } else {
    for (const row of inspection.migrationRows) {
      const state = row.finished_at
        ? row.rolled_back_at
          ? "rolled_back"
          : "applied"
        : "FAILED";
      console.log(`  - ${row.migration_name}: ${state}`);
      if (row.logs) {
        console.log(`    logs: ${String(row.logs).slice(0, 200)}`);
      }
    }
  }

  console.log("\n[recover] public tables:");
  if (inspection.tables.length === 0) {
    console.log("  (none)");
  } else {
    for (const name of inspection.tables) {
      console.log(`  - ${name}`);
    }
  }

  console.log("\n[recover] Baseline app tables:");
  console.log(`  present: ${inspection.appTables.length}/${BASELINE_TABLES.length}`);
  if (inspection.missingBaseline.length > 0) {
    console.log(`  missing: ${inspection.missingBaseline.join(", ")}`);
  }

  console.log("\n[recover] prisma migrate status:");
  console.log(statusOutput.trim() || "(no output)");

  console.log("\n[recover] Diagnosis:");
  if (inspection.baselineComplete) {
    console.log(
      "  All 9 baseline tables exist. Schema likely applied; migration history may be out of sync."
    );
  } else if (inspection.baselinePartial) {
    console.log(
      "  PARTIAL schema detected — some baseline tables exist but not all."
    );
    console.log(
      "  Unusual for a BOM/parse failure (Prisma uses a transaction). Manual cleanup required."
    );
  } else {
    console.log(
      "  No baseline app tables — migration SQL did NOT commit (expected for BOM/P3009 failure)."
    );
  }
}

function decideRecovery(inspection, statusOutput) {
  const hasFailedBaseline = inspection.migrationRows.some(
    (row) => row.migration_name === BASELINE && !row.finished_at
  );
  const statusFailed =
    statusOutput.includes("failed") ||
    statusOutput.includes("P3009") ||
    statusOutput.includes(BASELINE);

  if (inspection.baselineComplete) {
    return {
      action: "mark_applied",
      reason: "All baseline tables exist — mark migration applied, then verify status.",
      commands: [
        `npx prisma migrate resolve --applied ${BASELINE}`,
        "npm run db:migrate:deploy",
        "npx prisma migrate status",
      ],
    };
  }

  if (inspection.baselinePartial) {
    return {
      action: "manual_cleanup",
      reason: "Partial schema — drop app tables, resolve rolled back, redeploy.",
      commands: [
        `npx prisma migrate resolve --rolled-back ${BASELINE}`,
        "npm run db:migrate:deploy",
        "npx prisma migrate status",
      ],
      sql: BASELINE_TABLES.map(
        (table) => `DROP TABLE IF EXISTS "${table}" CASCADE;`
      ).join("\n"),
    };
  }

  if (inspection.noMigrationTable) {
    return {
      action: "deploy_only",
      reason: "No _prisma_migrations table — fresh database, deploy baseline directly.",
      commands: ["npm run db:migrate:deploy", "npx prisma migrate status"],
    };
  }

  if (hasFailedBaseline || statusFailed) {
    return {
      action: "mark_rolled_back",
      reason: "No baseline tables — clear failed migration record and redeploy.",
      commands: [
        `npx prisma migrate resolve --rolled-back ${BASELINE}`,
        "npm run db:migrate:deploy",
        "npx prisma migrate status",
      ],
    };
  }

  return {
    action: "deploy_only",
    reason: "No failed migration detected — apply pending migrations only.",
    commands: ["npm run db:migrate:deploy", "npx prisma migrate status"],
  };
}

async function main() {
  const inspectOnly = process.argv.includes("--inspect");

  assertPostgresUrl();

  console.log("[recover] Railway PostgreSQL migration recovery");
  console.log(`[recover] Baseline migration: ${BASELINE}`);

  const inspection = await inspectDatabase();
  const statusOutput = getMigrateStatus();
  printInspection(inspection, statusOutput);

  const plan = decideRecovery(inspection, statusOutput);

  console.log("\n[recover] === Recommended recovery ===");
  console.log(`[recover] Action: ${plan.action}`);
  console.log(`[recover] Reason: ${plan.reason}`);
  console.log("[recover] Commands:");
  for (const cmd of plan.commands) {
    console.log(`  ${cmd}`);
  }
  if (plan.sql) {
    console.log("\n[recover] SQL cleanup (run via Railway Query tab or psql if partial):");
    console.log(plan.sql);
  }

  if (inspectOnly) {
    console.log("\n[recover] --inspect set; no changes applied.");
    return;
  }

  console.log("\n[recover] Applying recovery...");

  if (plan.action === "manual_cleanup") {
    console.error(
      "\n[recover] Partial schema detected — automatic recovery skipped for safety.\n" +
        "  Run the DROP TABLE SQL above on Railway, then:\n" +
        `  railway ssh -- npx prisma migrate resolve --rolled-back ${BASELINE}\n` +
        "  railway ssh -- npm run db:migrate:deploy"
    );
    process.exit(1);
  }

  for (const cmd of plan.commands) {
    if (cmd.startsWith("#")) continue;
    run(cmd, cmd);
  }

  console.log("\n[recover] Done. Redeploy or confirm /api/health migrations check passes.");
}

main().catch((error) => {
  console.error("[recover] Fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});

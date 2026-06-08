import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SqliteMasterRow = { name: string; type: string };
type TableInfoRow = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};
type MigrationRow = {
  migration_name: string;
  finished_at: string | null;
  applied_steps_count: number;
};

async function main() {
  const dbPath = process.env.DATABASE_URL ?? "file:./dev.db";

  console.log("=== DATABASE REALITY CHECK ===");
  console.log(`DATABASE_URL: ${dbPath}`);
  console.log("");

  let tables: SqliteMasterRow[] = [];
  try {
    tables = await prisma.$queryRaw<
      SqliteMasterRow[]
    >`SELECT name, type FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`;
  } catch (error) {
    console.error("Failed to connect or query database:", error);
    process.exit(1);
  }

  console.log("--- Tables in live database ---");
  if (tables.length === 0) {
    console.log("(none — database may not exist or is empty)");
  } else {
    for (const row of tables) {
      console.log(`  - ${row.name}`);
    }
  }
  console.log("");

  const tableNames = new Set(tables.map((t) => t.name));
  const agentLogExists = tableNames.has("AgentLog");
  console.log(`AgentLog table exists: ${agentLogExists ? "YES" : "NO"}`);
  console.log("");

  if (tableNames.has("Opportunity")) {
    const opportunityColumns = await prisma.$queryRaw<
      TableInfoRow[]
    >`PRAGMA table_info('Opportunity')`;

    console.log("--- Opportunity columns in live database ---");
    for (const col of opportunityColumns) {
      console.log(
        `  - ${col.name} (${col.type}${col.notnull ? ", NOT NULL" : ", nullable"}${col.dflt_value != null ? `, default=${col.dflt_value}` : ""})`
      );
    }
    console.log("");

    const columnNames = new Set(opportunityColumns.map((c) => c.name));
    const marketingFields = [
      "marketingAngles",
      "tiktokIdeas",
      "facebookAdIdeas",
      "alibabaKeywords",
      "launchPlan",
    ] as const;

    console.log("--- Marketing / launch field check ---");
    for (const field of marketingFields) {
      console.log(`  ${field}: ${columnNames.has(field) ? "EXISTS" : "MISSING"}`);
    }
    console.log("");
  } else {
    console.log("Opportunity table: MISSING");
    console.log("");
  }

  if (tableNames.has("_prisma_migrations")) {
    const migrations = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, finished_at, applied_steps_count
      FROM _prisma_migrations
      ORDER BY finished_at
    `;

    console.log("--- Applied Prisma migrations ---");
    if (migrations.length === 0) {
      console.log("  (none recorded)");
    } else {
      for (const m of migrations) {
        console.log(
          `  - ${m.migration_name} (steps: ${m.applied_steps_count}, finished: ${m.finished_at ?? "pending"})`
        );
      }
    }
    console.log("");
  } else {
    console.log("_prisma_migrations table: MISSING (database never migrated via Prisma migrate)");
    console.log("");
  }

  // Row counts for context
  const countTables = [
    "Agent",
    "AgentLog",
    "Store",
    "Product",
    "Revenue",
    "Opportunity",
    "Task",
  ] as const;

  console.log("--- Row counts ---");
  for (const table of countTables) {
    if (!tableNames.has(table)) {
      console.log(`  ${table}: (table missing)`);
      continue;
    }
    const result = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM "${table}"`
    );
    console.log(`  ${table}: ${result[0]?.count ?? 0}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

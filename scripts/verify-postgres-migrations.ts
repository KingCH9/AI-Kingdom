/**
 * Verifies PostgreSQL migrations apply cleanly against a test database.
 *
 * Usage:
 *   docker compose -f docker-compose.postgres.yml up -d
 *   npm run db:verify-postgres
 *
 * Or set VERIFY_DATABASE_URL to any empty PostgreSQL instance.
 */
import { execSync } from "node:child_process";

const DEFAULT_VERIFY_URL =
  "postgresql://ai_empire:ai_empire_test@localhost:5433/ai_empire";

const databaseUrl = process.env.VERIFY_DATABASE_URL ?? DEFAULT_VERIFY_URL;

function run(label: string, command: string): void {
  console.log(`\n▶ ${label}`);
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

console.log("PostgreSQL migration verification");
console.log(`Target: ${databaseUrl.replace(/:[^:@/]+@/, ":***@")}`);

try {
  run("Validate PostgreSQL schema", "npx prisma validate");
  run("Apply migrations", "npx prisma migrate deploy");
  run("Migration status", "npx prisma migrate status");
  console.log("\n✓ PostgreSQL migrations verified successfully");
} catch (error) {
  console.error("\n✗ PostgreSQL migration verification failed");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

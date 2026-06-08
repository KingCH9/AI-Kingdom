import { execSync } from "node:child_process";

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

console.log("[migrate] Running prisma migrate deploy...");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
console.log("[migrate] Migrations applied successfully.");

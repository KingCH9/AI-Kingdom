import { execSync } from "node:child_process";

// Migrations run in Railway releaseCommand (railway.toml). Re-running here during
// rolling deploys doubles connection usage and can hit Postgres max_connections.
const skipMigrate =
  process.env.RAILWAY_SKIP_STARTUP_MIGRATE === "true" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

if (skipMigrate) {
  console.log(
    "[railway] Skipping startup migrate (releaseCommand already applied migrations)"
  );
} else {
  console.log("[railway] Production startup — apply migrations then start Next.js");
  try {
    execSync("node scripts/migrate-deploy.mjs", {
      stdio: "inherit",
      env: process.env,
    });
  } catch {
    console.error("[railway] Migration step failed — aborting startup");
    process.exit(1);
  }
}

console.log("[railway] Starting Next.js...");
execSync("npx next start", { stdio: "inherit", env: process.env });

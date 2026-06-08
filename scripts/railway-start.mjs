import { execSync } from "node:child_process";

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

console.log("[railway] Starting Next.js...");
execSync("npx next start", { stdio: "inherit", env: process.env });

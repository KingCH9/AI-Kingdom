/**
 * Centralized environment configuration for AI Empire.
 * All server-side URL and feature-flag reads should go through this module.
 */

const TRUTHY = new Set(["true", "1", "yes"]);

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function readEnvFlag(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value !== undefined && TRUTHY.has(value);
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readEnvSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** True when NODE_ENV is production. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** API key for mutation routes and server action authorization. */
export function getEmpireApiKey(): string | undefined {
  return readEnvSecret("EMPIRE_API_KEY") ?? readEnvSecret("EMPIRE_APIKEY");
}

/**
 * When true, dashboard Server Actions work without manual sidebar unlock.
 * External mutation API routes still require x-api-key.
 * Set EMPIRE_DASHBOARD_AUTO_UNLOCK=false to require sidebar unlock in production.
 */
export function isDashboardAutoUnlockEnabled(): boolean {
  const raw = process.env.EMPIRE_DASHBOARD_AUTO_UNLOCK?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  if (raw === "true" || raw === "1" || raw === "yes") {
    return true;
  }
  return isProduction();
}

/** Optional dashboard password for server action sessions (alternative to API key in browser). */
export function getEmpireAdminPassword(): string | undefined {
  return readEnvSecret("EMPIRE_ADMIN_PASSWORD");
}

/**
 * Mutation auth is required in production, or in development when either secret is configured.
 */
export function requiresMutationAuth(): boolean {
  if (isProduction()) {
    return true;
  }

  return Boolean(getEmpireApiKey() || getEmpireAdminPassword());
}

/**
 * Fail fast when production boots without mutation credentials configured.
 * Call from instrumentation.ts at startup.
 */
export function assertProductionEnvironment(): void {
  if (!isProduction()) {
    return;
  }

  if (!getEmpireApiKey()) {
    throw new Error("EMPIRE_API_KEY is required in production");
  }
}

/** Returns DATABASE_URL when set. */
export function getDatabaseUrl(): string | undefined {
  return readEnvSecret("DATABASE_URL");
}

/** True when DATABASE_URL points to PostgreSQL. */
export function isPostgresDatabase(): boolean {
  const url = getDatabaseUrl() ?? "";
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/** True when DATABASE_URL points to SQLite. */
export function isSqliteDatabase(): boolean {
  const url = getDatabaseUrl() ?? "";
  return url.startsWith("file:");
}

/**
 * Fail fast when production uses SQLite or cannot reach PostgreSQL.
 * Call from instrumentation.ts after assertProductionEnvironment().
 */
export async function assertProductionDatabaseConnection(): Promise<void> {
  if (!isProduction()) {
    return;
  }

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL is required in production");
  }

  if (isSqliteDatabase()) {
    throw new Error(
      "SQLite DATABASE_URL is not supported in production — attach a PostgreSQL database"
    );
  }

  if (!isPostgresDatabase()) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string in production"
    );
  }

  const { prisma } = await import("@/lib/prisma");
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    throw new Error(`Production database connection failed: ${message}`);
  }
}

export function getAppUrl(): string {
  if (process.env.APP_URL) {
    return normalizeBaseUrl(process.env.APP_URL);
  }

  if (process.env.VERCEL_URL) {
    return normalizeBaseUrl(`https://${process.env.VERCEL_URL}`);
  }

  return "http://localhost:3000";
}

export function getInternalApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAppUrl()}${normalizedPath}`;
}

/** @deprecated Legacy simulation — disabled in Phase 3.5. */
export function isEmpireSimulationEnabled(): boolean {
  return false;
}

/** Legacy worker.ts flag — disabled in Phase 3.5. */
export function isLegacyWorkerEnabled(): boolean {
  return readEnvFlag("ENABLE_LEGACY_WORKER");
}

/** Background task worker (Phase 4b). Disabled by default. */
export function isTaskWorkerEnabled(): boolean {
  return readEnvFlag("ENABLE_TASK_WORKER");
}

/** Poll interval for task-worker.ts in milliseconds. Default: 30s. */
export function getTaskWorkerIntervalMs(): number {
  return readEnvInt("TASK_WORKER_INTERVAL_MS", 30_000);
}

/** Max tasks per worker cycle. Default: 10. */
export function getTaskWorkerBatchSize(): number {
  return readEnvInt("TASK_WORKER_BATCH_SIZE", 10);
}

/** Secret for POST /api/tasks/worker/tick cron endpoint. */
export function getTaskWorkerCronSecret(): string | undefined {
  return readEnvSecret("TASK_WORKER_CRON_SECRET");
}

/** Optional Atlas auto-validation in task-worker. Disabled by default. */
export function isValidatorAutomationEnabled(): boolean {
  return readEnvFlag("ENABLE_VALIDATOR_AUTOMATION");
}

/**
 * In-process opportunity pipeline (validator + CEO cycles) on the web service.
 * Enabled by default in production / Railway. Set ENABLE_EMPIRE_PIPELINE=false to disable.
 */
export function isEmpirePipelineEnabled(): boolean {
  const raw = process.env.ENABLE_EMPIRE_PIPELINE?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") {
    return false;
  }
  if (raw === "true" || raw === "1" || raw === "yes") {
    return true;
  }
  return (
    isProduction() ||
    Boolean(process.env.RAILWAY_ENVIRONMENT) ||
    Boolean(process.env.RAILWAY_PROJECT_ID)
  );
}

/** Pipeline tick interval in milliseconds. Default: 60s. */
export function getPipelineIntervalMs(): number {
  return readEnvInt("PIPELINE_INTERVAL_MS", 60_000);
}

/** Max opportunities processed per pipeline stage per tick. Default: 20. */
export function getPipelineBatchSize(): number {
  return readEnvInt("PIPELINE_BATCH_SIZE", 20);
}

/** Max opportunities per validator cycle. Default: 10. */
export function getValidatorBatchSize(): number {
  return readEnvInt("VALIDATOR_BATCH_SIZE", 10);
}

/** Secret for POST /api/validator/run-cycle cron endpoint. */
export function getValidatorCronSecret(): string | undefined {
  return readEnvSecret("VALIDATOR_CRON_SECRET");
}

/** Anthropic API key for agent workflows and opportunity generation. */
export function getAnthropicApiKey(): string | undefined {
  return readEnvSecret("ANTHROPIC_API_KEY");
}

/** Stripe secret API key for Checkout Session creation (Lean 8C). */
export function getStripeSecretKey(): string | undefined {
  return readEnvSecret("STRIPE_SECRET_KEY");
}

/** Stripe webhook signing secret for POST /api/webhooks/stripe. */
export function getStripeWebhookSecret(): string | undefined {
  return readEnvSecret("STRIPE_WEBHOOK_SECRET");
}

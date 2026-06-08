import { prisma } from "@/lib/prisma";
import {
  getAnthropicApiKey,
  getAppUrl,
  getDatabaseUrl,
  getEmpireApiKey,
  getStripeSecretKey,
  getStripeWebhookSecret,
  isPostgresDatabase,
  isProduction,
  isSqliteDatabase,
} from "@/lib/env";
import {
  isStripeConfigured,
  isStripeTestMode,
} from "@/lib/stripe/client";

export type DiagnosticStatus = "pass" | "warn" | "fail";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  message: string;
};

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export type HealthReport = {
  status: HealthStatus;
  environment: string;
  timestamp: string;
  checks: DiagnosticCheck[];
};

function check(
  id: string,
  label: string,
  status: DiagnosticStatus,
  message: string
): DiagnosticCheck {
  return { id, label, status, message };
}

async function checkDatabaseConnection(): Promise<DiagnosticCheck> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const provider = isPostgresDatabase()
      ? "PostgreSQL"
      : isSqliteDatabase()
        ? "SQLite"
        : "unknown";
    return check("database", "Database connection", "pass", `Connected (${provider})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    const transient =
      message.includes("too many clients") ||
      message.includes("Too many database connections");
    return check(
      "database",
      "Database connection",
      transient ? "warn" : "fail",
      message
    );
  }
}

function checkDatabaseProvider(): DiagnosticCheck {
  const url = getDatabaseUrl() ?? "";

  if (isProduction()) {
    if (isSqliteDatabase()) {
      return check(
        "database_provider",
        "Database provider",
        "fail",
        "SQLite not allowed in production — use PostgreSQL"
      );
    }
    if (isPostgresDatabase()) {
      return check("database_provider", "Database provider", "pass", "PostgreSQL");
    }
    return check(
      "database_provider",
      "Database provider",
      "fail",
      "Unsupported DATABASE_URL scheme for production"
    );
  }

  if (isSqliteDatabase()) {
    return check(
      "database_provider",
      "Database provider",
      "pass",
      "SQLite (development)"
    );
  }
  if (isPostgresDatabase()) {
    return check(
      "database_provider",
      "Database provider",
      "pass",
      "PostgreSQL"
    );
  }

  return check(
    "database_provider",
    "Database provider",
    "warn",
    "DATABASE_URL scheme not recognized"
  );
}

function checkAnthropicConfigured(): DiagnosticCheck {
  const key = getAnthropicApiKey();
  if (key) {
    return check("anthropic", "Anthropic API", "pass", "ANTHROPIC_API_KEY configured");
  }
  if (isProduction()) {
    return check(
      "anthropic",
      "Anthropic API",
      "warn",
      "ANTHROPIC_API_KEY not set (required for agent workflows)"
    );
  }
  return check(
    "anthropic",
    "Anthropic API",
    "warn",
    "ANTHROPIC_API_KEY not set (required for agent workflows)"
  );
}

function checkStripeConfigured(): DiagnosticCheck {
  if (!isStripeConfigured()) {
    return check(
      "stripe",
      "Stripe",
      "warn",
      "Stripe not configured (checkout and webhooks disabled)"
    );
  }

  if (isStripeTestMode()) {
    return check(
      "stripe",
      "Stripe",
      "pass",
      "Configured (test mode — sk_test_)"
    );
  }

  return check("stripe", "Stripe", "pass", "Configured (live mode — sk_live_)");
}

function checkStripeWebhook(): DiagnosticCheck {
  if (getStripeWebhookSecret()) {
    return check("stripe_webhook", "Stripe webhook secret", "pass", "STRIPE_WEBHOOK_SECRET set");
  }
  return check(
    "stripe_webhook",
    "Stripe webhook secret",
    "warn",
    "STRIPE_WEBHOOK_SECRET not set"
  );
}

function checkProductionEnv(): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];

  if (getEmpireApiKey()) {
    checks.push(
      check("empire_api_key", "Mutation auth", "pass", "EMPIRE_API_KEY configured")
    );
  } else if (isProduction()) {
    checks.push(
      check(
        "empire_api_key",
        "Mutation auth",
        "fail",
        "EMPIRE_API_KEY required in production"
      )
    );
  } else {
    checks.push(
      check(
        "empire_api_key",
        "Mutation auth",
        "warn",
        "EMPIRE_API_KEY not set (open in development)"
      )
    );
  }

  if (process.env.APP_URL?.trim()) {
    checks.push(
      check("app_url", "Application URL", "pass", getAppUrl())
    );
  } else if (isProduction()) {
    checks.push(
      check(
        "app_url",
        "Application URL",
        "warn",
        "APP_URL not set — using VERCEL_URL or localhost fallback"
      )
    );
  } else {
    checks.push(
      check("app_url", "Application URL", "pass", `${getAppUrl()} (default)`)
    );
  }

  if (process.env.DATABASE_URL?.trim()) {
    checks.push(
      check("database_url", "Database URL", "pass", "DATABASE_URL configured")
    );
  } else {
    checks.push(
      check("database_url", "Database URL", "fail", "DATABASE_URL missing")
    );
  }

  return checks;
}

async function checkMigrationDrift(): Promise<DiagnosticCheck> {
  try {
    // Active failures only — rolled-back history rows must not fail health.
    const failed = await prisma.$queryRaw<
      Array<{ migration_name: string }>
    >`SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NULL AND rolled_back_at IS NULL`;

    if (failed.length > 0) {
      const names = failed.map((row) => row.migration_name).join(", ");
      return check(
        "migrations",
        "Database migrations",
        "fail",
        `Failed migration(s) pending resolution: ${names}`
      );
    }

    // Latest successfully applied migration (ignore NULL finished_at — failed/rolled-back rows).
    const applied = await prisma.$queryRaw<
      Array<{ migration_name: string; finished_at: Date }>
    >`SELECT migration_name, finished_at FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1`;

    const latest = applied[0];
    if (!latest) {
      return check(
        "migrations",
        "Database migrations",
        "fail",
        "No applied migrations found — run prisma migrate deploy"
      );
    }

    return check(
      "migrations",
      "Database migrations",
      "pass",
      `Latest applied: ${latest.migration_name}`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not read migration history";

    if (
      message.includes("_prisma_migrations") ||
      message.includes("42P01")
    ) {
      return check(
        "migrations",
        "Database migrations",
        "fail",
        "Migrations not applied — run prisma migrate deploy"
      );
    }

    return check(
      "migrations",
      "Database migrations",
      "warn",
      message
    );
  }
}

function resolveHealthStatus(checks: DiagnosticCheck[]): HealthStatus {
  if (checks.some((c) => c.status === "fail")) {
    return "unhealthy";
  }
  if (checks.some((c) => c.status === "warn")) {
    return "degraded";
  }
  return "healthy";
}

/** Runs all health checks for /api/health and the readiness page. */
export async function runHealthChecks(): Promise<HealthReport> {
  const checks: DiagnosticCheck[] = [
    await checkDatabaseConnection(),
    checkDatabaseProvider(),
    ...checkProductionEnv(),
    checkAnthropicConfigured(),
    checkStripeConfigured(),
    checkStripeWebhook(),
    await checkMigrationDrift(),
  ];

  return {
    status: resolveHealthStatus(checks),
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    checks,
  };
}

/** Logs startup diagnostics once at boot (instrumentation.ts). */
export async function logStartupDiagnostics(): Promise<void> {
  const report = await runHealthChecks();
  const prefix = "[ai-empire startup]";

  console.log(`${prefix} environment=${report.environment} status=${report.status}`);

  for (const item of report.checks) {
    const level =
      item.status === "fail" ? "error" : item.status === "warn" ? "warn" : "log";
    console[level](`${prefix} ${item.id}: ${item.message}`);
  }

  if (!getStripeSecretKey()) {
    console.warn(`${prefix} Stripe checkout disabled until STRIPE_SECRET_KEY is set`);
  }
}

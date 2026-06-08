function isTransientDbError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("too many clients") ||
    message.includes("Too many database connections")
  );
}

async function runWithDbRetry(label: string, fn: () => Promise<void>): Promise<void> {
  const delaysMs = [3000, 5000, 8000, 12000, 15000, 20000];

  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      await fn();
      return;
    } catch (error) {
      if (!isTransientDbError(error) || attempt === delaysMs.length) {
        console.error(
          `[startup] ${label} failed:`,
          error instanceof Error ? error.message : error
        );
        return;
      }

      const wait = delaysMs[attempt] ?? 20000;
      console.warn(
        `[startup] ${label} hit connection limit — retry in ${wait / 1000}s`
      );
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { assertProductionEnvironment, assertProductionDatabaseConnection } =
    await import("./lib/env");
  assertProductionEnvironment();
  await assertProductionDatabaseConnection();

  void runWithDbRetry("startup diagnostics", async () => {
    const { logStartupDiagnostics } = await import("./lib/ops/diagnostics");
    await logStartupDiagnostics();
  });

  void runWithDbRetry("agent bootstrap", async () => {
    const { ensureCoreLaunchAgents } = await import("./lib/ops/agent-bootstrap");
    await ensureCoreLaunchAgents();
  });

  void runWithDbRetry("hq bootstrap", async () => {
    const { ensureHqFoundation } = await import("./lib/ops/hq-bootstrap");
    await ensureHqFoundation();
  });

  void runWithDbRetry("product page bootstrap", async () => {
    const { ensureMissingProductPages } = await import(
      "./lib/ops/product-page-bootstrap"
    );
    await ensureMissingProductPages();

    const { ensureMissingMarketingAssets } = await import(
      "./lib/ops/marketing-assets-bootstrap"
    );
    await ensureMissingMarketingAssets();
  });

  const { startEmpirePipelineScheduler } = await import(
    "./lib/ops/pipeline-scheduler"
  );
  startEmpirePipelineScheduler();
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { assertProductionEnvironment, assertProductionDatabaseConnection } =
    await import("./lib/env");
  assertProductionEnvironment();
  await assertProductionDatabaseConnection();

  const { logStartupDiagnostics } = await import("./lib/ops/diagnostics");
  await logStartupDiagnostics();

  const { ensureCoreLaunchAgents } = await import("./lib/ops/agent-bootstrap");
  await ensureCoreLaunchAgents();

  const { ensureMissingProductPages } = await import(
    "./lib/ops/product-page-bootstrap"
  );
  void ensureMissingProductPages().catch((error) => {
    console.error(
      "[product-page-agent] bootstrap error:",
      error instanceof Error ? error.message : error
    );
  });

  const { startEmpirePipelineScheduler } = await import(
    "./lib/ops/pipeline-scheduler"
  );
  startEmpirePipelineScheduler();
}

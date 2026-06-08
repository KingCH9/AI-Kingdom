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

  const { startEmpirePipelineScheduler } = await import(
    "./lib/ops/pipeline-scheduler"
  );
  startEmpirePipelineScheduler();
}

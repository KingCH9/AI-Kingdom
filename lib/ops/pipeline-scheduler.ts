import {
  getPipelineIntervalMs,
  isEmpirePipelineEnabled,
} from "@/lib/env";
import { runEmpirePipelineCycle } from "@/lib/opportunity/pipeline-cycle";

const globalForPipeline = global as unknown as {
  empirePipelineSchedulerStarted?: boolean;
  empirePipelineRunning?: boolean;
};

/**
 * Starts in-process empire pipeline automation (validator → CEO → task worker).
 * Runs on Railway/production by default — no separate worker process required.
 */
export function startEmpirePipelineScheduler(): void {
  if (globalForPipeline.empirePipelineSchedulerStarted) {
    return;
  }

  if (!isEmpirePipelineEnabled()) {
    console.log("[pipeline] automation disabled (ENABLE_EMPIRE_PIPELINE=false)");
    return;
  }

  globalForPipeline.empirePipelineSchedulerStarted = true;
  const intervalMs = getPipelineIntervalMs();

  console.log(
    `[pipeline] scheduler started — interval=${intervalMs}ms (validator → CEO → task worker)`
  );

  const tick = async () => {
    if (globalForPipeline.empirePipelineRunning) {
      console.log("[pipeline] skipping tick — previous cycle still running");
      return;
    }

    globalForPipeline.empirePipelineRunning = true;
    try {
      await runEmpirePipelineCycle();
    } catch (error) {
      console.error(
        "[pipeline] cycle error:",
        error instanceof Error ? error.message : error
      );
    } finally {
      globalForPipeline.empirePipelineRunning = false;
    }
  };

  void tick();
  setInterval(() => {
    void tick();
  }, intervalMs);
}

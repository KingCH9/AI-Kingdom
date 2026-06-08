/**
 * @deprecated Use task-worker.ts (Phase 4b) instead.
 *
 * Legacy empire simulation — permanently disabled in Phase 3.5.
 */
import { isLegacyWorkerEnabled } from "./lib/env";

console.log("⏸️  worker.ts is deprecated.");
console.log("   Background execution: npm run task-worker (ENABLE_TASK_WORKER=true)");
console.log("   Manual batch: POST /api/tasks/execute-pending");

if (isLegacyWorkerEnabled()) {
  console.error("ENABLE_LEGACY_WORKER is set but legacy mutations are removed.");
}

process.exit(0);

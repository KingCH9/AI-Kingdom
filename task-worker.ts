/**

 * Phase 4b/7 background empire worker.

 *

 * Polls validator cycle, pending tasks, and intelligence snapshots.

 * All paths go through domain services.

 *

 * Start: npm run task-worker

 * Requires: ENABLE_TASK_WORKER=true in .env

 */

import {

  getTaskWorkerBatchSize,

  getTaskWorkerIntervalMs,

  getValidatorBatchSize,

  isTaskWorkerEnabled,
  assertProductionEnvironment,
} from "./lib/env";

import { runEmpireWorkerCycle } from "./lib/agents/execution/empire-worker-cycle";

assertProductionEnvironment();

async function runCycle() {

  try {

    const cycle = await runEmpireWorkerCycle({

      taskLimit: getTaskWorkerBatchSize(),

      validatorLimit: getValidatorBatchSize(),

    });



    const durationMs =

      cycle.finishedAt.getTime() - cycle.startedAt.getTime();



    if (cycle.validator) {

      console.log(

        `[task-worker] validator — processed=${cycle.validator.processed} ` +

          `approved=${cycle.validator.approved} rejected=${cycle.validator.rejected} ` +

          `failed=${cycle.validator.failed}`

      );

    }



    console.log(

      `[task-worker] tasks — executed=${cycle.tasks.executed} succeeded=${cycle.tasks.succeeded} ` +

        `failed=${cycle.tasks.failed} deferred=${cycle.tasks.deferred}`

    );



    console.log(

      `[task-worker] intelligence — recommendations=${cycle.intelligence.recommendationCount} ` +

        `opportunities=${cycle.intelligence.opportunityCount} stores=${cycle.intelligence.storeCount}`

    );



    console.log(`[task-worker] cycle complete in ${durationMs}ms`);



    if (cycle.tasks.failed > 0) {

      for (const result of cycle.tasks.results) {

        if (!result.success && !result.deferred) {

          console.warn(

            `[task-worker] task #${result.task.id} failed: ${result.error}`

          );

        }

      }

    }

  } catch (error) {

    console.error("[task-worker] cycle error:", error);

  }

}



if (!isTaskWorkerEnabled()) {

  console.log("Task worker is disabled.");

  console.log("   Set ENABLE_TASK_WORKER=true in .env, then: npm run task-worker");

  console.log("   Or trigger manually: POST /api/tasks/worker/tick");

  process.exit(0);

}



const intervalMs = getTaskWorkerIntervalMs();



console.log(

  `Empire worker started (interval ${intervalMs}ms, batch ${getTaskWorkerBatchSize()})`

);



runCycle();

const timer = setInterval(runCycle, intervalMs);



function shutdown() {

  console.log("\n[task-worker] shutting down...");

  clearInterval(timer);

  process.exit(0);

}



process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);


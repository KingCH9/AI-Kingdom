import type { Task } from "@prisma/client";
import type { TaskExecutionContext } from "./context";

export type TaskExecutionResult =
  | { success: true; task: Task; result: string }
  | {
      success: false;
      task: Task;
      error: string;
      /** True when execution was skipped due to unmet dependencies. */
      deferred?: boolean;
    };

export type { TaskExecutionContext };

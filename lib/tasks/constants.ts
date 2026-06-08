import type { TaskStatus } from "@/lib/types";

/** Canonical task lifecycle statuses. */
export const TASK_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
} as const satisfies Record<string, TaskStatus>;

export const TASK_TITLE_PREFIX = {
  BUILD_STORE: "Build store for ",
  MARKETING_PLAN: "Create marketing plan for ",
} as const;

export function isTaskStatus(value: string): value is TaskStatus {
  return Object.values(TASK_STATUSES).includes(value as TaskStatus);
}

/** Extracts product name from standard task title patterns. */
export function parseProductNameFromTaskTitle(title: string): string | null {
  for (const prefix of Object.values(TASK_TITLE_PREFIX)) {
    if (title.startsWith(prefix)) {
      return title.slice(prefix.length).trim() || null;
    }
  }
  return null;
}

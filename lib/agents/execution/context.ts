import type { Agent, Opportunity, Task } from "@prisma/client";

export interface TaskExecutionContext {
  task: Task;
  agent: Agent;
  opportunity: Opportunity | null;
}

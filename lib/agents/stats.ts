import { TASK_STATUSES } from "@/lib/tasks/constants";
import { prisma } from "@/lib/prisma";

export interface AgentActivityStats {
  agentName: string;
  role: string;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  inProgressCount: number;
  successRate: number;
  lastActivity: Date | null;
  lastActivityAction: string | null;
}

/** Computes task and activity metrics for a single agent. */
export async function getAgentActivityStats(
  agentName: string,
  role: string
): Promise<AgentActivityStats> {
  const [tasks, lastLog] = await Promise.all([
    prisma.task.findMany({ where: { agent: agentName } }),
    prisma.agentLog.findFirst({
      where: { agentName },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const completedCount = tasks.filter(
    (t) => t.status === TASK_STATUSES.COMPLETED
  ).length;
  const failedCount = tasks.filter(
    (t) => t.status === TASK_STATUSES.FAILED
  ).length;
  const pendingCount = tasks.filter(
    (t) => t.status === TASK_STATUSES.PENDING
  ).length;
  const inProgressCount = tasks.filter(
    (t) => t.status === TASK_STATUSES.IN_PROGRESS
  ).length;

  const finished = completedCount + failedCount;
  const successRate =
    finished > 0 ? Math.round((completedCount / finished) * 100) : 0;

  return {
    agentName,
    role,
    completedCount,
    failedCount,
    pendingCount,
    inProgressCount,
    successRate,
    lastActivity: lastLog?.createdAt ?? null,
    lastActivityAction: lastLog?.action ?? null,
  };
}

/** Computes activity metrics for all agents. */
export async function getAllAgentActivityStats(): Promise<AgentActivityStats[]> {
  const agents = await prisma.agent.findMany({
    orderBy: { name: "asc" },
  });

  return Promise.all(
    agents.map((agent) => getAgentActivityStats(agent.name, agent.role))
  );
}

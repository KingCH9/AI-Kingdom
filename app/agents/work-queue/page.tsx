import Link from "next/link";
import { StatCard } from "@/components/opportunity-ui";
import {
  ExecuteAllPendingButton,
  ExecuteTaskButton,
} from "@/components/task-execution-actions";
import { getAllAgentActivityStats } from "@/lib/agents/stats";
import { isTaskWorkerEnabled } from "@/lib/env";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import { prisma } from "@/lib/prisma";

function TaskColumn({
  title,
  tasks,
  showExecute,
}: {
  title: string;
  tasks: Array<{
    id: number;
    title: string;
    agent: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  showExecute?: boolean;
}) {
  return (
    <div className="border border-gray-700 rounded-2xl bg-gray-900 overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-950">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-gray-500">{tasks.length} tasks</p>
      </div>
      <div className="divide-y divide-gray-800 max-h-[480px] overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="p-4 text-gray-500 text-sm">None</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="p-4">
              <p className="font-medium text-white">{task.title}</p>
              <p className="text-sm text-blue-300 mt-1">Agent: {task.agent}</p>
              <p className="text-xs text-gray-500 mt-1">
                Created {task.createdAt.toLocaleString()}
                {task.completedAt &&
                  ` · Completed ${task.completedAt.toLocaleString()}`}
              </p>
              {showExecute && (
                <div className="mt-3">
                  <ExecuteTaskButton taskId={task.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function AgentWorkQueuePage() {
  const [tasks, agentStats] = await Promise.all([
    prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: { opportunity: { select: { id: true, productName: true } } },
    }),
    getAllAgentActivityStats(),
  ]);

  const pending = tasks.filter((t) => t.status === TASK_STATUSES.PENDING);
  const inProgress = tasks.filter(
    (t) => t.status === TASK_STATUSES.IN_PROGRESS
  );
  const completed = tasks.filter((t) => t.status === TASK_STATUSES.COMPLETED);
  const failed = tasks.filter((t) => t.status === TASK_STATUSES.FAILED);
  const workerEnabled = isTaskWorkerEnabled();

  return (
    <div className="p-10 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-5xl font-bold mb-2">⚙️ Agent Work Queue</h1>
          <p className="text-gray-400">
            Claim, execute, and track autonomous agent tasks
          </p>
        </div>
        <ExecuteAllPendingButton />
      </div>

      <div
        className={`mb-8 rounded-xl border px-4 py-3 text-sm ${
          workerEnabled
            ? "border-green-800 bg-green-950/40 text-green-300"
            : "border-gray-700 bg-gray-900 text-gray-400"
        }`}
      >
        {workerEnabled
          ? "Background task worker is enabled (ENABLE_TASK_WORKER=true). Pending tasks run automatically via npm run task-worker or POST /api/tasks/worker/tick."
          : "Background worker is off. Execute tasks manually or set ENABLE_TASK_WORKER=true and run npm run task-worker."}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Pending" value={pending.length} accent="blue" />
        <StatCard label="In Progress" value={inProgress.length} />
        <StatCard label="Completed" value={completed.length} accent="green" />
        <StatCard label="Failed" value={failed.length} />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <TaskColumn title="Pending" tasks={pending} showExecute />
        <TaskColumn title="In Progress" tasks={inProgress} />
        <TaskColumn title="Completed" tasks={completed.slice(0, 20)} />
      </div>

      {failed.length > 0 && (
        <div className="mb-10">
          <TaskColumn title="Failed" tasks={failed} />
        </div>
      )}

      <div className="border border-gray-700 rounded-2xl bg-gray-900 overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-950">
          <h2 className="text-xl font-bold">Agent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left p-4">Agent</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Completed</th>
                <th className="text-left p-4">Failed</th>
                <th className="text-left p-4">Pending</th>
                <th className="text-left p-4">Success Rate</th>
                <th className="text-left p-4">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {agentStats.map((stat) => (
                <tr key={stat.agentName} className="border-b border-gray-800">
                  <td className="p-4 font-medium text-blue-300">
                    {stat.agentName}
                  </td>
                  <td className="p-4 text-gray-300">{stat.role}</td>
                  <td className="p-4">{stat.completedCount}</td>
                  <td className="p-4">{stat.failedCount}</td>
                  <td className="p-4">{stat.pendingCount}</td>
                  <td className="p-4">{stat.successRate}%</td>
                  <td className="p-4 text-gray-500">
                    {stat.lastActivity
                      ? stat.lastActivity.toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link
        href="/agents"
        className="inline-block mt-8 text-blue-400 hover:text-blue-300 text-sm"
      >
        ← Back to Agents
      </Link>
    </div>
  );
}

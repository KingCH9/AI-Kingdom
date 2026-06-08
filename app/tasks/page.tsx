import Link from "next/link";
import { TASK_STATUSES } from "@/lib/tasks/constants";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  in_progress: "text-blue-400",
  completed: "text-green-400",
  failed: "text-red-400",
};

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      opportunity: { select: { id: true, productName: true } },
    },
  });

  return (
    <div className="p-10 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-5xl font-bold">📋 Agent Tasks</h1>
        <Link
          href="/agents/work-queue"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
        >
          Open Work Queue →
        </Link>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="border border-gray-700 rounded-xl p-5 bg-gray-900"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-xl font-bold">{task.title}</h2>
              <span
                className={`font-semibold capitalize ${STATUS_COLORS[task.status] ?? "text-gray-400"}`}
              >
                {task.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-blue-300 mt-2">Agent: {task.agent}</p>
            {task.opportunity && (
              <p className="text-sm text-gray-400 mt-1">
                Opportunity:{" "}
                <Link
                  href={`/opportunities/${task.opportunity.id}`}
                  className="text-blue-400 hover:underline"
                >
                  {task.opportunity.productName}
                </Link>
              </p>
            )}
            {task.result && task.status === TASK_STATUSES.COMPLETED && (
              <pre className="mt-3 p-3 bg-gray-950 rounded-lg text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                {task.result}
              </pre>
            )}
            {task.result && task.status === TASK_STATUSES.FAILED && (
              <p className="mt-3 text-sm text-red-400">{task.result}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Created {task.createdAt.toLocaleString()}
              {task.completedAt &&
                ` · Completed ${task.completedAt.toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

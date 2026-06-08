import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isEmpirePipelineEnabled } from "@/lib/env";
import { computeEmpireQueueStats } from "@/lib/opportunity/compute-queue-stats";

export const dynamic = "force-dynamic";

/** Read-only pipeline + opportunity status for operations verification. */
export async function GET() {
  const [allOpportunities, pendingTasks, inProgressTasks] = await Promise.all([
    prisma.opportunity.findMany({ orderBy: { id: "asc" } }),
    prisma.task.count({ where: { status: "pending" } }),
    prisma.task.count({ where: { status: "in_progress" } }),
  ]);

  const grouped = allOpportunities.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const queues = computeEmpireQueueStats(allOpportunities, {
    pending: pendingTasks,
    inProgress: inProgressTasks,
  });

  const opportunities = allOpportunities.map((row) => ({
    id: row.id,
    productName: row.productName,
    status: row.status,
    opportunityScore: row.opportunityScore,
  }));

  return NextResponse.json({
    pipelineEnabled: isEmpirePipelineEnabled(),
    counts: {
      researching: grouped.researching ?? 0,
      validated: grouped.validated ?? 0,
      launch_ready: grouped.launch_ready ?? 0,
      killed: grouped.killed ?? 0,
      other: Object.entries(grouped)
        .filter(([status]) => !["researching", "validated", "launch_ready", "killed"].includes(status))
        .reduce((sum, [, count]) => sum + count, 0),
    },
    queues,
    opportunities,
    timestamp: new Date().toISOString(),
  });
}

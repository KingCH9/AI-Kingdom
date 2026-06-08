import { prisma } from "@/lib/prisma";

/**
 * Finds agent log entries related to a specific opportunity.
 * Uses FK lookup first; falls back to string matching for historical logs without links.
 */
export async function findAgentLogsForOpportunity(
  opportunityId: number,
  productName: string
) {
  return prisma.agentLog.findMany({
    where: {
      OR: [
        { opportunityId },
        {
          opportunityId: null,
          OR: [
            { action: { contains: `#${opportunityId}` } },
            ...(productName.trim()
              ? [{ action: { contains: productName.trim() } }]
              : []),
          ],
        },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

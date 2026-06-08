import type { Task } from "@prisma/client";
import { parseProductNameFromTaskTitle } from "./constants";
import { prisma } from "@/lib/prisma";

/** Resolves the opportunity linked to a task. */
export async function findOpportunityForTask(task: Task) {
  if (task.opportunityId) {
    return prisma.opportunity.findUnique({
      where: { id: task.opportunityId },
    });
  }

  const productName = parseProductNameFromTaskTitle(task.title);
  if (!productName) {
    return null;
  }

  return prisma.opportunity.findFirst({
    where: { productName },
    orderBy: { createdAt: "desc" },
  });
}

import { ensureStoreForOpportunity } from "@/lib/opportunity/launch-ready-effects";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { updateOpportunityStatus } from "@/lib/opportunity/update-status";
import { STORE_STATUSES } from "@/lib/store/status";
import { prisma } from "@/lib/prisma";
import type { TaskExecutionContext } from "../types";

export async function executeBuildStoreTask(
  ctx: TaskExecutionContext
): Promise<string> {
  const { task, opportunity, agent } = ctx;

  if (!opportunity) {
    throw new Error(`No opportunity found for task: ${task.title}`);
  }

  const store = await ensureStoreForOpportunity(opportunity);

  await prisma.store.update({
    where: { id: store.id },
    data: { status: STORE_STATUSES.BUILDING },
  });

  const currentStatus = normalizeOpportunityStatus(opportunity.status);

  if (currentStatus === "launch_ready") {
    await updateOpportunityStatus({
      opportunityId: opportunity.id,
      newStatus: "building",
      actor: "operator",
    });
  }

  return JSON.stringify(
    {
      storeId: store.id,
      storeName: store.name,
      opportunityId: opportunity.id,
      agent: agent.name,
      message: `Store "${store.name}" prepared and linked to opportunity #${opportunity.id}`,
    },
    null,
    2
  );
}

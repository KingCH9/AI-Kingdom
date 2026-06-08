import { prisma } from "@/lib/prisma";
import { sortOpportunitiesByIntelligence } from "@/lib/intelligence/priority-bias";
import { getEmpireIntelligence } from "@/lib/queries/intelligence";

export async function getCeoApprovalQueue() {
  const [opportunities, intelligence] = await Promise.all([
    prisma.opportunity.findMany(),
    getEmpireIntelligence(),
  ]);

  const queue = sortOpportunitiesByIntelligence(
    opportunities,
    intelligence.analysis
  );

  return { queue, intelligence };
}

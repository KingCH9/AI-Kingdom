import { prisma } from "@/lib/prisma";
import {
  buildDiversityContext,
  type DiversityContext,
} from "./generation-diversity";

/** Loads the last 20 opportunities and builds diversity context (newest first). */
export async function getOpportunityDiversityContext(): Promise<DiversityContext> {
  const rows = await prisma.opportunity.findMany({
    orderBy: { id: "desc" },
    take: 20,
    select: {
      id: true,
      productName: true,
      category: true,
    },
  });

  return buildDiversityContext(rows);
}

import { prisma } from "@/lib/prisma";
import type { EmpireDataset } from "./types";

/** Loads raw empire data for intelligence analysis. */
export async function loadEmpireDataset(): Promise<EmpireDataset> {
  const [opportunities, stores, orders] = await Promise.all([
    prisma.opportunity.findMany(),
    prisma.store.findMany(),
    prisma.order.findMany(),
  ]);

  return {
    opportunities,
    stores,
    orders,
    generatedAt: new Date(),
  };
}

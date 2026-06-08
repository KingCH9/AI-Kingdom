import type { Opportunity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Parses a numeric price from opportunity selling price string. */
export function parseSellingPrice(value: string | null | undefined): number {
  if (!value) {
    return 29.99;
  }

  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 29.99;
  }

  return Math.round(parsed * 100) / 100;
}

/** Ensures the store has a product linked to its opportunity. */
export async function ensureProductForStore(
  storeId: number,
  opportunity: Pick<Opportunity, "productName" | "sellingPrice">
) {
  const existing = await prisma.product.findFirst({
    where: {
      storeId,
      name: opportunity.productName,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.product.create({
    data: {
      name: opportunity.productName,
      price: parseSellingPrice(opportunity.sellingPrice),
      storeId,
    },
  });
}

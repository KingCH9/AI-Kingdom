import type { MarketingLaunchPackage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLaunchPackageContent } from "./generate-launch-package";
import type { GenerateLaunchPackageInput } from "./generate-launch-package";

const LOG_PREFIX = "[marketing-agent]";

export async function ensureMarketingLaunchPackage(
  input: GenerateLaunchPackageInput
): Promise<MarketingLaunchPackage> {
  const existing = await prisma.marketingLaunchPackage.findUnique({
    where: { storeId: input.store.id },
  });

  if (existing) {
    console.log(
      `${LOG_PREFIX} launch package exists store=${input.store.id}`
    );
    return existing;
  }

  const content = await generateLaunchPackageContent(input);

  const saved = await prisma.marketingLaunchPackage.create({
    data: {
      storeId: input.store.id,
      launchStrategy: content.launchStrategy,
      budgetTiers: JSON.stringify(content.budgetTiers),
      tiktokStrategy: content.tiktokStrategy,
      metaStrategy: content.metaStrategy,
      influencerStrategy: content.influencerStrategy,
      emailStrategy: content.emailStrategy,
    },
  });

  console.log(
    `${LOG_PREFIX} generated launch package store=${input.store.id}`
  );

  return saved;
}

export function parseBudgetTiers(packageRow: MarketingLaunchPackage) {
  try {
    return JSON.parse(packageRow.budgetTiers) as Array<{
      name: string;
      dailyBudget: string;
      focus: string;
    }>;
  } catch {
    return [];
  }
}

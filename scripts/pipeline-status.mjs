/** One-off status report — run via: railway ssh -- node scripts/pipeline-status.mjs */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const grouped = await prisma.opportunity.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const counts = Object.fromEntries(
    grouped.map((row) => [row.status, row._count.id])
  );

  const opportunities = await prisma.opportunity.findMany({
    select: {
      id: true,
      productName: true,
      status: true,
      opportunityScore: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(JSON.stringify({ counts, opportunities }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

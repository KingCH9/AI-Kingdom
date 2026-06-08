import { prisma } from "../lib/prisma";

async function main() {
  const opp = await prisma.opportunity.findUnique({
    where: { id: 91 },
    select: { sellingPrice: true },
  });
  console.log("sellingPrice:", opp?.sellingPrice);
}

main().finally(async () => {
  await prisma.$disconnect();
});

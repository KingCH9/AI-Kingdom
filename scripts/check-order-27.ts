import { prisma } from "../lib/prisma";

async function main() {
  const order = await prisma.order.findUnique({
    where: { id: 27 },
    select: {
      id: true,
      externalId: true,
      customerEmail: true,
      customerName: true,
      total: true,
      source: true,
      status: true,
    },
  });
  console.log(order);
}

main().finally(async () => {
  await prisma.$disconnect();
});

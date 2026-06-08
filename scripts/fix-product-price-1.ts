import { prisma } from "../lib/prisma";

async function main() {
  const before = await prisma.product.findUnique({ where: { id: 1 } });
  console.log("Before:", before);

  const after = await prisma.product.update({
    where: { id: 1 },
    data: { price: 79.99 },
  });
  console.log("After:", after);
}

main().finally(async () => {
  await prisma.$disconnect();
});

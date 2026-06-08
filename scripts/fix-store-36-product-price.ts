import { prisma } from "../lib/prisma";

async function main() {
  const product = await prisma.product.update({
    where: { id: 1 },
    data: { price: 49.99 },
  });
  console.log("Updated product price:", product);
}

main().finally(async () => {
  await prisma.$disconnect();
});

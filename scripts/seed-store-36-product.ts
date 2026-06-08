import { prisma } from "../lib/prisma";
import { ensureProductForStore } from "../lib/store/ensure-product";

async function main() {
  const store = await prisma.store.findUnique({
    where: { id: 36 },
    include: { opportunity: true, products: true },
  });
  if (!store?.opportunity) throw new Error("Store #36 missing opportunity");
  if (store.products.length > 0) {
    console.log("Product already exists:", store.products[0]);
    return;
  }
  const product = await ensureProductForStore(store.id, store.opportunity);
  console.log("Created product:", product);
}

main().finally(async () => {
  await prisma.$disconnect();
});

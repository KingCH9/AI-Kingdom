import { prisma } from "@/lib/prisma";
import { parseProductPageJsonFields } from "./ensure-product-page";

export async function getShopPageBySlug(slug: string) {
  const store = await prisma.store.findUnique({
    where: { slug },
    include: {
      productPage: true,
      products: { orderBy: { id: "asc" }, take: 1 },
      opportunity: true,
    },
  });

  if (!store?.productPage || store.products.length === 0) {
    return null;
  }

  const parsed = parseProductPageJsonFields(store.productPage);

  return {
    store,
    product: store.products[0],
    page: store.productPage,
    ...parsed,
  };
}

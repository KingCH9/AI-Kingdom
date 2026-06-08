import type { Opportunity, Product, ProductPage, Store } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugifyStoreName } from "@/lib/store/slug";
import { generateProductPageContent } from "./generate-with-claude";
import type { MarketingPlanInput } from "./types";

const LOG_PREFIX = "[product-page-agent]";

async function ensureUniqueStoreSlug(
  storeId: number,
  name: string
): Promise<string> {
  const base = slugifyStoreName(name);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const conflict = await prisma.store.findFirst({
      where: {
        slug: candidate,
        id: { not: storeId },
      },
    });

    if (!conflict) {
      break;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  await prisma.store.update({
    where: { id: storeId },
    data: { slug: candidate },
  });

  return candidate;
}

function serializeContent(content: Awaited<ReturnType<typeof generateProductPageContent>>) {
  return {
    heroHeadline: content.heroHeadline,
    subheadline: content.subheadline,
    salesCopy: content.salesCopy,
    benefits: JSON.stringify(content.benefits),
    features: JSON.stringify(content.features),
    faq: JSON.stringify(content.faq),
    ctaText: content.ctaText,
    seoTitle: content.seoTitle,
    seoDescription: content.seoDescription,
  };
}

export type EnsureProductPageInput = {
  store: Store;
  product: Product;
  opportunity: Opportunity;
  marketingPlan: MarketingPlanInput;
};

/** Idempotent — returns existing page or generates and persists a new one. */
export async function ensureProductPageForStore(
  input: EnsureProductPageInput
): Promise<ProductPage> {
  const { store, product, opportunity, marketingPlan } = input;

  const existing = await prisma.productPage.findUnique({
    where: { storeId: store.id },
  });

  if (existing) {
    console.log(
      `${LOG_PREFIX} page already exists store=#${store.id} slug=${store.slug ?? "(pending)"}`
    );
    return existing;
  }

  const slug = store.slug ?? (await ensureUniqueStoreSlug(store.id, store.name));

  console.log(
    `${LOG_PREFIX} creating page store=#${store.id} slug=${slug} product=#${product.id}`
  );

  const content = await generateProductPageContent({
    opportunity,
    product,
    marketingPlan,
  });

  const page = await prisma.productPage.create({
    data: {
      storeId: store.id,
      productId: product.id,
      ...serializeContent(content),
    },
  });

  console.log(
    `${LOG_PREFIX} saved page id=#${page.id} store=#${store.id} slug=${slug}`
  );

  return page;
}

export function parseProductPageJsonFields(page: ProductPage) {
  return {
    benefits: JSON.parse(page.benefits) as string[],
    features: JSON.parse(page.features) as string[],
    faq: JSON.parse(page.faq) as Array<{ question: string; answer: string }>,
  };
}

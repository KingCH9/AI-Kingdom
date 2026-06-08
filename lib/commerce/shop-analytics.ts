import { prisma } from "@/lib/prisma";

export const SHOP_EVENT_TYPES = {
  PAGE_VIEW: "page_view",
  CHECKOUT_START: "checkout_start",
  PURCHASE: "purchase",
} as const;

export type ShopEventType =
  (typeof SHOP_EVENT_TYPES)[keyof typeof SHOP_EVENT_TYPES];

export async function recordShopEvent(
  storeId: number,
  eventType: ShopEventType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await prisma.shopAnalyticsEvent.create({
    data: {
      storeId,
      eventType,
      metadata: JSON.stringify(metadata),
    },
  });
}

export async function getShopAnalyticsSummary() {
  const [events, orders] = await Promise.all([
    prisma.shopAnalyticsEvent.groupBy({
      by: ["eventType"],
      _count: { eventType: true },
    }),
    prisma.order.count(),
  ]);

  const counts = Object.fromEntries(
    events.map((row) => [row.eventType, row._count.eventType])
  );

  const pageViews = counts[SHOP_EVENT_TYPES.PAGE_VIEW] ?? 0;
  const checkoutStarts = counts[SHOP_EVENT_TYPES.CHECKOUT_START] ?? 0;
  const purchaseEvents = counts[SHOP_EVENT_TYPES.PURCHASE] ?? 0;
  const purchases = Math.max(purchaseEvents, orders);

  const conversionRate =
    pageViews > 0 ? Math.round((purchases / pageViews) * 1000) / 10 : 0;
  const checkoutConversionRate =
    checkoutStarts > 0
      ? Math.round((purchases / checkoutStarts) * 1000) / 10
      : 0;

  return {
    pageViews,
    checkoutStarts,
    purchases,
    conversionRate,
    checkoutConversionRate,
  };
}

export async function getShopAnalyticsByStore() {
  const stores = await prisma.store.findMany({
    where: { slug: { not: null } },
    select: { id: true, name: true, slug: true, revenue: true },
    orderBy: { id: "asc" },
  });

  const results = await Promise.all(
    stores.map(async (store) => {
      const [events, orderCount, orderTotal] = await Promise.all([
        prisma.shopAnalyticsEvent.groupBy({
          by: ["eventType"],
          where: { storeId: store.id },
          _count: { eventType: true },
        }),
        prisma.order.count({ where: { storeId: store.id } }),
        prisma.order.aggregate({
          where: { storeId: store.id },
          _sum: { total: true },
        }),
      ]);

      const counts = Object.fromEntries(
        events.map((row) => [row.eventType, row._count.eventType])
      );
      const pageViews = counts[SHOP_EVENT_TYPES.PAGE_VIEW] ?? 0;
      const checkoutStarts = counts[SHOP_EVENT_TYPES.CHECKOUT_START] ?? 0;
      const purchases = Math.max(
        counts[SHOP_EVENT_TYPES.PURCHASE] ?? 0,
        orderCount
      );

      return {
        storeId: store.id,
        storeName: store.name,
        storeSlug: store.slug,
        pageViews,
        checkoutStarts,
        purchases,
        orderTotal: orderTotal._sum.total ?? 0,
        storeRevenue: store.revenue,
        conversionRate:
          pageViews > 0 ? Math.round((purchases / pageViews) * 1000) / 10 : 0,
      };
    })
  );

  return results;
}

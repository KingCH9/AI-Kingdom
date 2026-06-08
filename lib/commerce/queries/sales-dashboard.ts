import { prisma } from "@/lib/prisma";
import {
  getShopAnalyticsByStore,
  getShopAnalyticsSummary,
} from "../shop-analytics";

export async function getSalesDashboardData() {
  const [
    orders,
    revenueAggregate,
    storeRevenue,
    topProducts,
    analyticsSummary,
    analyticsByStore,
  ] = await Promise.all([
    prisma.order.findMany({
      include: {
        store: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, name: true } },
        customer: { select: { email: true, name: true } },
        opportunity: { select: { id: true, productName: true, status: true } },
      },
      orderBy: { placedAt: "desc" },
      take: 100,
    }),
    prisma.revenue.aggregate({ _sum: { amount: true } }),
    prisma.store.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        revenue: true,
        status: true,
        opportunityId: true,
        _count: { select: { orders: true } },
      },
      orderBy: { revenue: "desc" },
    }),
    prisma.order.groupBy({
      by: ["productId"],
      where: { productId: { not: null } },
      _count: { productId: true },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 10,
    }),
    getShopAnalyticsSummary(),
    getShopAnalyticsByStore(),
  ]);

  const productIds = topProducts
    .map((row) => row.productId)
    .filter((id): id is number => id != null);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, storeId: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const topProductsEnriched = topProducts.map((row) => {
    const product = row.productId ? productMap.get(row.productId) : null;
    return {
      productId: row.productId,
      productName: product?.name ?? "Unknown product",
      storeId: product?.storeId ?? null,
      orderCount: row._count.productId,
      totalRevenue: row._sum.total ?? 0,
    };
  });

  const totalRevenue = revenueAggregate._sum.amount ?? 0;

  return {
    orders,
    storeRevenue,
    topProducts: topProductsEnriched,
    totalRevenue,
    totalOrders: orders.length,
    analytics: analyticsSummary,
    analyticsByStore,
  };
}

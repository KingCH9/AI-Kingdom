import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const stores = await prisma.store.findMany();

    const totalRevenue = stores.reduce(
      (sum, store) => sum + store.revenue,
      0
    );

    const topStore =
      stores.length > 0
        ? stores.reduce((prev, current) =>
            prev.revenue > current.revenue ? prev : current
          )
        : null;

    const stats = {
      revenue: totalRevenue,
      stores: await prisma.store.count(),
      products: await prisma.product.count(),
      agents: await prisma.agent.count(),
      topStore: topStore?.name || "None",
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
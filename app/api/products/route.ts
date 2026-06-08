import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(products);
}

/** Demo product creation is deprecated — products are created when Gamma launches a store. */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Direct product creation is deprecated. Products are created automatically when Gamma completes a marketing-plan task.",
    },
    { status: 410 }
  );
}

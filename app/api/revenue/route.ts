import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth/api-guard";
import { recordStoreRevenue } from "@/lib/store/record-revenue";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const revenue = await prisma.revenue.findMany({
      include: {
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(revenue);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch revenue" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = (await request.json()) as {
      storeId?: number;
      amount?: number;
      source?: string;
    };

    const storeId = body.storeId;
    const amount = body.amount;
    const source = body.source?.trim() || "sale";

    if (typeof storeId !== "number" || !Number.isFinite(storeId)) {
      return NextResponse.json(
        { error: "storeId (number) is required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount (positive number) is required" },
        { status: 400 }
      );
    }

    const result = await recordStoreRevenue({ storeId, amount, source });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to record revenue";
    const status = message.includes("not found") ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

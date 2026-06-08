import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const opportunities = await prisma.opportunity.findMany({
    orderBy: {
      demandScore: "desc",
    },
  });

  return NextResponse.json(opportunities);
}
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const agents = await prisma.agent.findMany({
    orderBy: {
      level: "desc",
    },
  });

  return NextResponse.json(agents);
}
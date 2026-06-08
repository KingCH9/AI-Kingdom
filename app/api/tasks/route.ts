import { prisma } from "@/lib/prisma";

export async function GET() {
  const tasks = await prisma.task.findMany();

  return Response.json(tasks);
}
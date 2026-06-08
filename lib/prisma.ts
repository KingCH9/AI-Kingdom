import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

function withConnectionLimit(url: string, limit: number): string {
  if (url.startsWith("file:")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(limit));
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function createPrismaClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL?.trim();
  const limit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? "3");
  const url =
    rawUrl && Number.isFinite(limit) && limit > 0
      ? withConnectionLimit(rawUrl, limit)
      : rawUrl;

  return url
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
import type { Prisma, PrismaClient } from "@prisma/client";

/** Prisma client or interactive transaction delegate — same model API. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

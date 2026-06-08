import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { DbClient } from "@/lib/prisma/db-client";

import { recordStoreRevenueTx } from "@/lib/store/record-revenue";

import {
  recordShopEvent,
  SHOP_EVENT_TYPES,
} from "@/lib/commerce/shop-analytics";

import type { RecordOrderRevenueInput, RecordOrderRevenueResult } from "./types";



function normalizeEmail(email: string): string {

  return email.trim().toLowerCase();

}



async function findExistingOrder(

  source: string,

  externalId: string,

  db: DbClient = prisma

) {

  return db.order.findUnique({

    where: {

      source_externalId: {

        source,

        externalId,

      },

    },

    include: {

      revenues: { orderBy: { createdAt: "desc" }, take: 1 },

    },

  });

}



async function duplicateOrderResult(

  existing: NonNullable<Awaited<ReturnType<typeof findExistingOrder>>>,

  fallbackRevenue: number,

  fallbackStatus: string

): Promise<RecordOrderRevenueResult> {

  const revenue = existing.revenues[0];

  const refreshedStore = await prisma.store.findUnique({

    where: { id: existing.storeId },

  });



  return {

    duplicate: true,

    orderId: existing.id,

    customerId: existing.customerId,

    revenueId: revenue?.id ?? 0,

    storeId: existing.storeId,

    amount: existing.total,

    totalRevenue: refreshedStore?.revenue ?? fallbackRevenue,

    storeStatus: refreshedStore?.status ?? fallbackStatus,

  };

}



function isDuplicateOrderError(

  error: unknown,

  externalId: string | null | undefined

): boolean {

  return (

    Boolean(externalId) &&

    error instanceof Prisma.PrismaClientKnownRequestError &&

    error.code === "P2002"

  );

}



/**

 * SSOT for order ingestion.

 * All writes run in a single transaction — order, customer, revenue, lifecycle.

 */

export async function recordOrderRevenue(

  input: RecordOrderRevenueInput

): Promise<RecordOrderRevenueResult> {

  if (input.total <= 0) {

    throw new Error("Order total must be positive");

  }



  const email = normalizeEmail(input.email);

  if (!email.includes("@")) {

    throw new Error("Valid customer email is required");

  }



  const store = await prisma.store.findUnique({ where: { id: input.storeId } });

  if (!store) {

    throw new Error(`Store #${input.storeId} not found`);

  }



  if (input.externalId) {

    const existing = await findExistingOrder(input.source, input.externalId);

    if (existing) {

      return duplicateOrderResult(existing, store.revenue, store.status);

    }

  }



  try {

    return await prisma.$transaction(async (tx) => {

      const customer = await tx.customer.upsert({

        where: {

          storeId_email: {

            storeId: input.storeId,

            email,

          },

        },

        create: {

          storeId: input.storeId,

          email,

          name: input.name?.trim() || null,

          externalId: input.customerExternalId ?? null,

          orderCount: 0,

          totalSpent: 0,

        },

        update: {

          ...(input.name?.trim() ? { name: input.name.trim() } : {}),

          ...(input.customerExternalId

            ? { externalId: input.customerExternalId }

            : {}),

        },

      });



      const order = await tx.order.create({

        data: {

          storeId: input.storeId,

          customerId: customer.id,

          productId: input.productId ?? null,

          opportunityId: input.opportunityId ?? store.opportunityId ?? null,

          externalId: input.externalId ?? null,

          source: input.source,

          status: "paid",

          total: input.total,

          currency: input.currency?.trim() || "GBP",

          lineItemsJson: input.lineItemsJson ?? "[]",

          placedAt: input.placedAt ?? new Date(),

        },

      });



      await tx.customer.update({

        where: { id: customer.id },

        data: {

          orderCount: { increment: 1 },

          totalSpent: { increment: input.total },

        },

      });



      const revenueResult = await recordStoreRevenueTx(tx, {

        storeId: input.storeId,

        amount: input.total,

        source: input.source,

        orderId: order.id,

      });

      await recordShopEvent(input.storeId, SHOP_EVENT_TYPES.PURCHASE, {
        orderId: order.id,
        amount: input.total,
        productId: order.productId,
      });

      return {

        duplicate: false,

        orderId: order.id,

        customerId: customer.id,

        revenueId: revenueResult.revenueId,

        storeId: revenueResult.storeId,

        amount: revenueResult.amount,

        totalRevenue: revenueResult.totalRevenue,

        storeStatus: revenueResult.storeStatus,

      };

    });

  } catch (error) {

    if (isDuplicateOrderError(error, input.externalId)) {

      const existing = await findExistingOrder(

        input.source,

        input.externalId!

      );

      if (existing) {

        return duplicateOrderResult(existing, store.revenue, store.status);

      }

    }



    throw error;

  }

}



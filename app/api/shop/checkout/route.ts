import { NextResponse } from "next/server";
import {
  createStripeCheckoutSession,
  StripeCheckoutError,
} from "@/lib/commerce/create-stripe-checkout";
import {
  recordShopEvent,
  SHOP_EVENT_TYPES,
} from "@/lib/commerce/shop-analytics";

function statusForCheckoutError(code: StripeCheckoutError["code"]): number {
  switch (code) {
    case "STRIPE_NOT_CONFIGURED":
      return 503;
    case "STORE_NOT_FOUND":
      return 404;
    case "STORE_KILLED":
    case "NO_PRODUCT":
    case "INVALID_PRICE":
      return 422;
    default:
      return 500;
  }
}

/** Public checkout for storefront visitors — no API key required. */
export async function POST(request: Request) {
  let storeId: number | undefined;
  let customerEmail: string | undefined;
  let storeSlug: string | undefined;

  try {
    const body = (await request.json()) as {
      storeId?: number;
      email?: string;
      storeSlug?: string;
    };
    storeId = body.storeId;
    customerEmail = body.email?.trim();
    storeSlug = body.storeSlug?.trim();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!storeId || !Number.isFinite(storeId) || storeId <= 0) {
    return NextResponse.json(
      { success: false, message: "Valid storeId is required" },
      { status: 400 }
    );
  }

  try {
    console.log(`[checkout] starting store=${storeId}`);

    const session = await createStripeCheckoutSession({
      storeId,
      customerEmail,
      storeSlug,
    });

    await recordShopEvent(storeId, SHOP_EVENT_TYPES.CHECKOUT_START, {
      sessionId: session.sessionId,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.sessionId,
    });
  } catch (error) {
    if (error instanceof StripeCheckoutError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: statusForCheckoutError(error.code) }
      );
    }

    console.error("[checkout] session creation failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Checkout creation failed",
      },
      { status: 500 }
    );
  }
}

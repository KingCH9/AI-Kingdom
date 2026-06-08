import { NextResponse } from "next/server";
import {
  createStripeCheckoutSession,
  StripeCheckoutError,
} from "@/lib/commerce/create-stripe-checkout";
import { requireApiKey } from "@/lib/auth/api-guard";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  const storeId = Number.parseInt(id, 10);
  if (!Number.isFinite(storeId) || storeId <= 0) {
    return NextResponse.json(
      { success: false, message: "Invalid store id" },
      { status: 400 }
    );
  }

  let customerEmail: string | undefined;
  try {
    const body = (await request.json()) as { email?: string };
    customerEmail = body.email?.trim();
  } catch {
    customerEmail = undefined;
  }

  try {
    const session = await createStripeCheckoutSession({
      storeId,
      customerEmail,
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

    console.error("[stripe checkout] session creation failed:", error);
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

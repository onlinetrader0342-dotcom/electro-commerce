import { NextRequest, NextResponse } from "next/server";
import { createOrderFromCheckout, validateCheckout } from "@/lib/checkout-server";
import { MedusaError } from "@/lib/commerce";
import { getCustomerToken } from "@/lib/customer-auth";

/**
 * POST /api/checkout/complete — re-validates the cart server-side
 * (price + stock from Medusa), then creates the Medusa order.
 * Client totals are never trusted.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: ["Request body must be valid JSON."] },
      { status: 400 },
    );
  }

  const result = await validateCheckout(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errors: result.errors },
      { status: 422 },
    );
  }

  try {
    const customerToken = getCustomerToken(req);
    const order = await createOrderFromCheckout(result.checkout, customerToken);
    return NextResponse.json({
      ok: true,
      orderId: order.orderId,
      displayId: order.displayId ?? null,
    });
  } catch (err) {
    if (err instanceof MedusaError) {
      const status = err.status === 503 ? 503 : 502;
      return NextResponse.json(
        {
          ok: false,
          errors: [
            err.status === 503
              ? "Commerce backend is temporarily unavailable. Please try again."
              : "Could not place the order. Please try again.",
          ],
        },
        { status },
      );
    }
    console.error("[checkout/complete]", err);
    return NextResponse.json(
      { ok: false, errors: ["Unexpected error placing the order."] },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { validateCheckout, type ValidatedCheckout } from "@/lib/checkout-server";
import { formatPKR } from "@/lib/format";

/**
 * POST /api/checkout/validate — server-side cart validation.
 * Re-fetches price + stock from Medusa for every line; recomputes totals.
 * Client prices are ignored. Returns 422 with details on any mismatch.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { valid: false, errors: ["Request body must be valid JSON."] },
      { status: 400 },
    );
  }

  const result = await validateCheckout(body);
  if (!result.ok) {
    return NextResponse.json(
      { valid: false, errors: result.errors },
      { status: 422 },
    );
  }

  const v: ValidatedCheckout = result.checkout;
  return NextResponse.json({
    valid: true,
    summary: {
      lines: v.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        title: l.title,
        image: l.image,
        unitPrice: l.unitPrice,
        unitPriceFormatted: formatPKR(l.unitPrice, v.currency),
        quantity: l.quantity,
        lineTotal: l.lineTotal,
        lineTotalFormatted: formatPKR(l.lineTotal, v.currency),
      })),
      subtotal: v.subtotal,
      subtotalFormatted: formatPKR(v.subtotal, v.currency),
      shipping: v.shipping,
      shippingFormatted: formatPKR(v.shipping, v.currency),
      shippingMethod: {
        id: v.shippingMethod.id,
        name: v.shippingMethod.name,
      },
      paymentMethod: { id: v.paymentMethod.id, name: v.paymentMethod.name },
      total: v.total,
      totalFormatted: formatPKR(v.total, v.currency),
      currency: v.currency,
    },
  });
}

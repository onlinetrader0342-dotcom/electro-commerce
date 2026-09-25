import { NextRequest } from "next/server";
import { commerceStub, requireCustomerJwt } from "@/lib/commerce-stubs";

/**
 * POST /api/v1/commerce/update_cart — STUB (501).
 * Updates line-item quantities in the customer's cart.
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireCustomerJwt(req);
  if (unauthorized) return unauthorized;
  return commerceStub("update_cart", {
    method: "POST",
    auth: "Authorization: Bearer <customer-jwt>",
    request: {
      cart_id: "string (required)",
      line_id: "string (required)",
      quantity: "integer 0–99 (required; 0 removes the line)",
    },
    response: {
      data: {
        cart_id: "cart_...",
        items: [],
        subtotal: 0,
        currency: "PKR",
      },
    },
  });
}

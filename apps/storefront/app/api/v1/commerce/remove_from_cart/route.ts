import { NextRequest } from "next/server";
import { commerceStub, requireCustomerJwt } from "@/lib/commerce-stubs";

/**
 * POST /api/v1/commerce/remove_from_cart — STUB (501).
 * Removes a line item from the customer's cart.
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireCustomerJwt(req);
  if (unauthorized) return unauthorized;
  return commerceStub("remove_from_cart", {
    method: "POST",
    auth: "Authorization: Bearer <customer-jwt>",
    request: {
      cart_id: "string (required)",
      line_id: "string (required)",
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

import { NextRequest } from "next/server";
import { commerceStub, requireCustomerJwt } from "@/lib/commerce-stubs";

/**
 * POST /api/v1/commerce/add_to_cart — STUB (501).
 * Adds a variant to the customer's cart. Prices/stock are validated
 * server-side against Medusa at execution time.
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireCustomerJwt(req);
  if (unauthorized) return unauthorized;
  return commerceStub("add_to_cart", {
    method: "POST",
    auth: "Authorization: Bearer <customer-jwt>",
    request: {
      cart_id: "string (required)",
      variant_id: "string (required)",
      quantity: "integer 1–99 (required)",
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

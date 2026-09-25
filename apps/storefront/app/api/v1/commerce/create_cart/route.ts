import { NextRequest } from "next/server";
import { commerceStub, requireCustomerJwt } from "@/lib/commerce-stubs";

/**
 * POST /api/v1/commerce/create_cart — STUB (501).
 * Creates a customer cart. Requires customer JWT (scope commerce:write),
 * separate from the ai:read key used by /api/v1/ai/*.
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireCustomerJwt(req);
  if (unauthorized) return unauthorized;
  return commerceStub("create_cart", {
    method: "POST",
    auth: "Authorization: Bearer <customer-jwt>",
    request: {
      region_id: "string (optional)",
      metadata: "object (optional)",
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

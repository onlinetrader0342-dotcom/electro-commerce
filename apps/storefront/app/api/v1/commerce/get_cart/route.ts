import { NextRequest } from "next/server";
import { commerceStub, requireCustomerJwt } from "@/lib/commerce-stubs";

/**
 * GET /api/v1/commerce/get_cart?cart_id=cart_... — STUB (501).
 * Reads the customer's own cart. Customer JWT required.
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireCustomerJwt(req);
  if (unauthorized) return unauthorized;
  return commerceStub("get_cart", {
    method: "GET",
    auth: "Authorization: Bearer <customer-jwt>",
    request: { cart_id: "string (query, required)" },
    response: {
      data: {
        cart_id: "cart_...",
        items: [
          {
            product_id: "prod_...",
            variant_id: "variant_...",
            quantity: 2,
            unit_price: 145000,
            line_total: 290000,
          },
        ],
        subtotal: 290000,
        shipping: 250,
        total: 290250,
        currency: "PKR",
      },
    },
  });
}

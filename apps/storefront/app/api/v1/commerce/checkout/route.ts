import { NextRequest } from "next/server";
import { commerceStub, requireCustomerJwt } from "@/lib/commerce-stubs";

/**
 * POST /api/v1/commerce/checkout — STUB (501).
 * Starts checkout for a cart: address + shipping + payment method selection,
 * then order placement. All money is validated server-side.
 */
export async function POST(req: NextRequest) {
  const unauthorized = requireCustomerJwt(req);
  if (unauthorized) return unauthorized;
  return commerceStub("checkout", {
    method: "POST",
    auth: "Authorization: Bearer <customer-jwt>",
    request: {
      cart_id: "string (required)",
      shipping_address: {
        first_name: "string",
        last_name: "string",
        phone: "string",
        address_1: "string",
        city: "string",
        province: "string",
        postal_code: "string (optional)",
        country_code: "pk",
      },
      shipping_method_id: "standard | express | pickup",
      payment_method_id: "cod | bank_transfer",
    },
    response: {
      data: {
        order_id: "order_...",
        display_id: 1001,
        total: 290250,
        currency: "PKR",
        payment_status: "awaiting",
      },
    },
  });
}

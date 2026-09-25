import { NextResponse } from "next/server";
import { getShippingProvider } from "@/lib/shipping";
import { formatPKR } from "@/lib/format";

/**
 * GET /api/checkout/shipping-methods — available shipping methods
 * from the shipping abstraction layer (lib/shipping.ts).
 */
export async function GET() {
  const provider = getShippingProvider();
  const methods = await provider.listMethods({
    city: "",
    province: "",
    country: "Pakistan",
  });
  return NextResponse.json({
    methods: methods.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: m.price,
      priceFormatted: formatPKR(m.price, m.currency),
      currency: m.currency,
      etaDays: m.etaDays,
    })),
  });
}

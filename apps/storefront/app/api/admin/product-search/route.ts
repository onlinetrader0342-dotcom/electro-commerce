import { NextRequest, NextResponse } from "next/server";
import { fromMinorUnits, storeFetch } from "@/lib/commerce";
import { formatPKR } from "@/lib/format";

/**
 * GET /api/admin/product-search?q=...
 * Admin-gated product picker for the blog post form's "recommended products".
 * Returns minimal fields only (id, title, thumbnail, price).
 */
export async function GET(req: NextRequest) {
  const authed =
    req.cookies.get("ec_admin")?.value === "1" ||
    req.cookies.get("ec_admin_api")?.value === "1";
  if (!authed) {
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (!q) return NextResponse.json({ products: [] });

  try {
    const res = await storeFetch<{
      products: {
        id: string;
        title: string;
        thumbnail?: string | null;
        variants?: { prices?: { amount: number; currency_code: string }[] | null }[] | null;
      }[];
    }>("/store/products", {
      params: {
        q,
        limit: 8,
        fields: "id,title,thumbnail,variants.prices",
      },
    });
    return NextResponse.json({
      products: (res.products ?? []).map((p) => {
        const priceEntry = p.variants?.[0]?.prices?.[0];
        const price = priceEntry ? fromMinorUnits(priceEntry.amount) : 0;
        const currency = (priceEntry?.currency_code || "PKR").toUpperCase();
        return {
          id: p.id,
          title: p.title,
          thumbnail: p.thumbnail ?? null,
          price,
          currency,
          priceFormatted: formatPKR(price, currency),
        };
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "Product search unavailable." },
      { status: 502 },
    );
  }
}

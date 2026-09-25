import { NextRequest } from "next/server";
import {
  aiOk,
  aiSearchProducts,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiSearchProductsQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/search_products
 * AI tool: search_products — keyword/category/brand/price/availability search.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const q = parseAiQuery(
      aiSearchProductsQuerySchema,
      req.nextUrl.searchParams,
    );

    const { items, total } = await aiSearchProducts({
      q: q.q,
      category: q.category,
      brand: q.brand,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      inStock: q.inStock,
      limit: q.limit,
      offset: q.offset,
      sort: q.sort,
    });

    return aiOk(items, {
      total,
      limit: q.limit,
      page: Math.floor(q.offset / q.limit) + 1,
    });
  });
}

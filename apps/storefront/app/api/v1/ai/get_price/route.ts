import { NextRequest } from "next/server";
import {
  aiErr,
  aiGetPrice,
  aiOk,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiIdQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/get_price?id=prod_...
 * AI tool: get_price — current price/sale price/currency for one product.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const { id } = parseAiQuery(aiIdQuerySchema, req.nextUrl.searchParams);
    const price = await aiGetPrice(id);
    if (!price) return aiErr(404, "NOT_FOUND", "Product not found.");
    return aiOk(price, { currency: price.currency });
  });
}

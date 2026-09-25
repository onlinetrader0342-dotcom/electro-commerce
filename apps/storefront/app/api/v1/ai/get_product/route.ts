import { NextRequest } from "next/server";
import {
  aiErr,
  aiOk,
  getAiProductById,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiIdQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/get_product?id=prod_...
 * AI tool: get_product — normalized product card for one product.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const { id } = parseAiQuery(aiIdQuerySchema, req.nextUrl.searchParams);
    const product = await getAiProductById(id);
    if (!product) return aiErr(404, "NOT_FOUND", "Product not found.");
    return aiOk(product, {});
  });
}

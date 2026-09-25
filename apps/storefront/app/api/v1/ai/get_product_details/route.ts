import { NextRequest } from "next/server";
import {
  aiErr,
  aiGetProductDetails,
  aiOk,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiIdQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/get_product_details?id=prod_...
 * AI tool: get_product_details — full detail incl. description, images,
 * categories, warranty, specifications.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const { id } = parseAiQuery(aiIdQuerySchema, req.nextUrl.searchParams);
    const details = await aiGetProductDetails(id);
    if (!details) return aiErr(404, "NOT_FOUND", "Product not found.");
    return aiOk(details, {});
  });
}

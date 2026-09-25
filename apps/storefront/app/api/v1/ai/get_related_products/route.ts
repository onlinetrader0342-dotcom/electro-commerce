import { NextRequest } from "next/server";
import {
  aiGetRelatedProducts,
  aiOk,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiRelatedQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/get_related_products?id=prod_...&limit=8
 * AI tool: get_related_products — same-category (fallback: same-brand) picks.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const { id, limit } = parseAiQuery(
      aiRelatedQuerySchema,
      req.nextUrl.searchParams,
    );
    const related = await aiGetRelatedProducts(id, limit);
    return aiOk(related, { total: related.length, limit });
  });
}

import { NextRequest } from "next/server";
import {
  aiOk,
  aiSearchCategories,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiCategoriesQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/search_categories?q=inverter
 * AI tool: search_categories — category discovery for faceted search.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const { q } = parseAiQuery(
      aiCategoriesQuerySchema,
      req.nextUrl.searchParams,
    );
    const categories = await aiSearchCategories(q);
    return aiOk(categories, { total: categories.length });
  });
}

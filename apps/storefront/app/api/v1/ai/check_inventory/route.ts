import { NextRequest } from "next/server";
import {
  aiCheckInventory,
  aiErr,
  aiOk,
  requireAiAccess,
  runAiHandler,
} from "@/lib/ai-api";
import { aiInventoryQuerySchema, parseAiQuery } from "@/lib/validation";

/**
 * GET /api/v1/ai/check_inventory?ids=prod_1,prod_2
 * AI tool: check_inventory — stock status for up to 20 products.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAiAccess(req);
  if (denied) return denied;
  return runAiHandler(async () => {
    const { ids } = parseAiQuery(
      aiInventoryQuerySchema,
      req.nextUrl.searchParams,
    );
    const statuses = await aiCheckInventory(ids);
    const missing = ids.filter(
      (id) => !statuses.some((s) => s.productId === id),
    );
    if (missing.length)
      return aiErr(404, "NOT_FOUND", "Some products were not found.", {
        missing,
      });
    return aiOk(statuses, { total: statuses.length });
  });
}

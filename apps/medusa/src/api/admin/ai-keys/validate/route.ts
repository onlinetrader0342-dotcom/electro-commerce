import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { AI_KEYS_MODULE } from "../../../../modules/ai_keys";
import type AiKeysModuleService from "../../../../modules/ai_keys/service";

const ValidateKey = z.object({
  key: z.string().min(1),
});

/**
 * POST /admin/ai-keys/validate
 * Called by the storefront's AI API to validate a presented raw key.
 * Returns { valid: true, scopes } or { valid: false }. The hash itself
 * never leaves the server. Requires admin authentication.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = ValidateKey.parse(req.body);
  const keys = req.scope.resolve(AI_KEYS_MODULE) as AiKeysModuleService;

  const record = await keys.validateKey(body.key);
  if (!record) {
    return res.json({ valid: false });
  }

  // Fire-and-forget usage audit; validation must not fail because of it.
  keys.recordUsage((record as { id: string }).id).catch(() => {});

  const scopes = (record as { scopes?: unknown }).scopes;
  res.json({
    valid: true,
    scopes: Array.isArray(scopes) ? scopes : [],
  });
};

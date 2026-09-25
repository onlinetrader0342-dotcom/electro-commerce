import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { AI_KEYS_MODULE } from "../../../../../modules/ai_keys";
import type AiKeysModuleService from "../../../../../modules/ai_keys/service";

/** POST /admin/ai-keys/:id/revoke — deactivate immediately. */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const keys = req.scope.resolve(AI_KEYS_MODULE) as AiKeysModuleService;
  const key = await keys.revokeKey(req.params.id);
  res.json({ key, revoked: true });
};

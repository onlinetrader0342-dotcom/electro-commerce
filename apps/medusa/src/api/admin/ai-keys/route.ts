import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { AI_KEYS_MODULE } from "../../../modules/ai_keys";
import type AiKeysModuleService from "../../../modules/ai_keys/service";

const CreateKey = z.object({
  name: z.string().min(1),
  /** e.g. ["ai:read"]. Transactional scopes require an approval flow. */
  scopes: z.array(z.string()).min(1),
  rateLimitPerMin: z.number().int().min(1).max(10000).default(60),
});

/** GET — list keys (hashes never leave the server). */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const keys = req.scope.resolve(AI_KEYS_MODULE) as AiKeysModuleService;
  res.json({ keys: await keys.listPublicKeys() });
};

/**
 * POST — create a key. The RAW key is returned exactly once in this
 * response; it cannot be retrieved again afterwards.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = CreateKey.parse(req.body);
  const keys = req.scope.resolve(AI_KEYS_MODULE) as AiKeysModuleService;
  const { record, rawKey } = await keys.createApiKey({
    name: body.name,
    scopes: body.scopes,
    rateLimitPerMin: body.rateLimitPerMin,
  });
  const { key_hash: _omit, ...pub } = record as unknown as Record<string, unknown>;
  res.status(201).json({ key: pub, rawKey });
};

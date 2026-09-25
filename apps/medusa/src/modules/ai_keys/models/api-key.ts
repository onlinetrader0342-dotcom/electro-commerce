import { model } from "@medusajs/framework/utils";

/**
 * API key for the AI-agent API (and future admin integrations).
 *
 * SECURITY MODEL:
 *  - Only the sha256 hash is stored. The raw key is shown ONCE at creation
 *    and can never be recovered afterwards.
 *  - `prefix` (first 8 chars of the raw key) lets validateKey() narrow the
 *    DB lookup before doing a timing-safe hash comparison.
 *  - `scopes` gate capabilities: "ai:read" (product discovery) is separate
 *    from transactional scopes "ai:cart" / "ai:checkout". Transactional
 *    scopes must never be granted without an explicit user-approval flow.
 */
export const ApiKey = model.define("ai_api_key", {
  id: model.id().primaryKey(),
  name: model.text(),
  key_hash: model.text().unique(),
  prefix: model.text(),
  /** e.g. ["ai:read"] — stored as JSON array. */
  scopes: model.json(),
  rate_limit_per_min: model.number().default(60),
  is_active: model.boolean().default(true),
  last_used_at: model.dateTime().nullable(),
});

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { MedusaService } from "@medusajs/framework/utils";
import { ApiKey } from "./models/api-key";

const KEY_PREFIX_LEN = 8;

function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Raw key format: ec_<32 random bytes, base64url>. */
function generateRawKey(): string {
  return `ec_${randomBytes(32).toString("base64url")}`;
}

class AiKeysModuleService extends MedusaService({ ApiKey }) {
  /**
   * Create a key. Returns the RAW key exactly once — the caller (admin API)
   * must display it immediately; it is never stored or recoverable.
   */
  async createApiKey(input: {
    name: string;
    scopes: string[];
    rateLimitPerMin?: number;
  }) {
    const rawKey = generateRawKey();
    const created = await this.createApiKeys({
      name: input.name,
      key_hash: sha256Hex(rawKey),
      prefix: rawKey.slice(0, KEY_PREFIX_LEN),
      scopes: input.scopes as unknown as Record<string, unknown>,
      rate_limit_per_min: input.rateLimitPerMin ?? 60,
      is_active: true,
    });
    return { record: created, rawKey };
  }

  /**
   * Validate a presented raw key. Timing-safe comparison of the sha256 hash;
   * the prefix narrows candidates so we don't compare against every key.
   * Returns the key record (without the hash) or null.
   */
  async validateKey(rawKey: string) {
    if (!rawKey || typeof rawKey !== "string") return null;
    const prefix = rawKey.slice(0, KEY_PREFIX_LEN);
    const candidates = await this.listApiKeys({
      prefix,
      is_active: true,
    });
    const presented = Buffer.from(sha256Hex(rawKey), "hex");
    for (const c of candidates) {
      const stored = Buffer.from((c as { key_hash: string }).key_hash, "hex");
      if (
        stored.length === presented.length &&
        timingSafeEqual(stored, presented)
      ) {
        return c;
      }
    }
    return null;
  }

  /** Mark a key as used (drives last_used_at + abuse auditing). */
  async recordUsage(id: string) {
    await this.updateApiKeys({ id, last_used_at: new Date() });
  }

  /** Revoke = soft-deactivate; the hash row stays for audit. */
  async revokeKey(id: string) {
    return this.updateApiKeys({ id, is_active: false });
  }

  /** List keys for the admin UI — hashes are stripped by the route layer. */
  async listPublicKeys() {
    const keys = await this.listApiKeys({}, { order: { created_at: "DESC" } });
    return keys.map((k) => {
      const { key_hash: _omit, ...pub } = k as Record<string, unknown>;
      return pub;
    });
  }
}

export default AiKeysModuleService;

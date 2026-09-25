import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  adminFetch,
  fromMinorUnits,
  hasAdminKey,
  MedusaError,
  storeFetch,
} from "./commerce";
import { fixtureProducts } from "./fixtures";
import {
  listCategories,
  listProducts,
  type StoreProduct,
} from "./medusa";
import { checkRateLimit, type RateLimitResult } from "./rate-limit";
import { absoluteUrl } from "./format";

/**
 * AI-ready API core (lib layer — route handlers in app/api/v1/ai/* stay thin).
 *
 * SCOPE: read-only product discovery. No customer data is ever returned here.
 * Transactional actions live separately under /api/v1/commerce/* with their
 * own auth (customer JWT) — see BUILD_NOTES.md "scope separation".
 *
 * All money: Medusa minor units -> major units via fromMinorUnits().
 */

// ---------------------------------------------------------------- types ---

export type Availability = "in_stock" | "out_of_stock" | "preorder";

/** Normalized product DTO — the single shape every AI tool returns. */
export interface AiProduct {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  model: string | null;
  price: number;
  currency: string;
  salePrice: number | null;
  availability: Availability;
  image: string | null;
  url: string;
  specifications: Record<string, string>;
  shortDescription: string | null;
}

export interface AiProductDetails extends AiProduct {
  description: string | null;
  images: string[];
  categories: { id: string; name: string }[];
  warranty: string | null;
}

export interface AiCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number | null;
}

export interface AiInventoryStatus {
  productId: string;
  inStock: boolean;
  quantity: number | null;
}

export interface AiPriceInfo {
  productId: string;
  price: number;
  salePrice: number | null;
  currency: string;
}

export interface AiMeta {
  total?: number;
  page?: number;
  limit?: number;
  currency?: string;
}

export interface AiEnvelope<T> {
  data: T;
  meta: AiMeta;
}

// -------------------------------------------- Medusa raw shapes ---

interface MedusaPrice {
  amount: number;
  currency_code: string;
}

interface MedusaVariant {
  id: string;
  sku?: string | null;
  inventory_quantity?: number | null;
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  calculated_price?: {
    calculated_amount?: number;
    original_amount?: number;
    currency_code?: string;
  } | null;
  prices?: MedusaPrice[] | null;
}

interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  images?: { url: string }[] | null;
  variants?: MedusaVariant[] | null;
  categories?: { id: string; name: string; handle?: string | null }[] | null;
  metadata?: Record<string, unknown> | null;
}

const PRODUCT_URL_PREFIX = process.env.PRODUCT_URL_PREFIX || "/product";
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || "PKR";

const PRODUCT_FIELDS =
  "id,title,handle,subtitle,description,thumbnail,images.url,variants.id,variants.sku,variants.inventory_quantity,variants.prices,metadata,categories.id,categories.name,categories.handle";

// ------------------------------------------------------ mapping ---

function metaString(p: MedusaProduct, key: string): string | null {
  const v = p.metadata?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Effective price info for a variant. Prefers Medusa's region-aware
 *  `calculated_price`; falls back to the raw `prices` list. */
function priceInfo(
  p: MedusaProduct,
  v: MedusaVariant | undefined,
): { effective: number; original: number | null; currency: string } {
  const calc = v?.calculated_price ?? null;
  const prices = v?.prices ?? [];
  const fallback =
    prices.find(
      (pr) => pr.currency_code?.toUpperCase() === DEFAULT_CURRENCY.toUpperCase(),
    ) ?? prices[0];
  const currency = (
    calc?.currency_code ??
    fallback?.currency_code ??
    DEFAULT_CURRENCY
  ).toUpperCase();
  const effective =
    calc?.calculated_amount != null
      ? fromMinorUnits(calc.calculated_amount)
      : fallback
        ? fromMinorUnits(fallback.amount)
        : 0;
  const calcOriginal =
    calc?.original_amount != null ? fromMinorUnits(calc.original_amount) : null;
  const metaCompare =
    typeof p.metadata?.compare_at_amount === "number"
      ? fromMinorUnits(p.metadata.compare_at_amount as number)
      : null;
  return { effective, original: calcOriginal ?? metaCompare, currency };
}

/** Mirrors lib/medusa.ts stock logic: backorder or untracked inventory
 *  counts as in stock. */
function variantInStock(v: MedusaVariant): boolean {
  return (
    v.allow_backorder === true ||
    v.manage_inventory === false ||
    (typeof v.inventory_quantity === "number" && v.inventory_quantity > 0)
  );
}

function productAvailability(p: MedusaProduct): {
  availability: Availability;
  quantity: number | null;
} {
  const variants = p.variants ?? [];
  if (!variants.length) return { availability: "out_of_stock", quantity: 0 };
  const anyInStock = variants.some(variantInStock);
  let total: number | null = 0;
  for (const v of variants) {
    if (typeof v.inventory_quantity !== "number") {
      total = null;
    } else if (total !== null) {
      total += v.inventory_quantity;
    }
  }
  if (total === null)
    return { availability: anyInStock ? "in_stock" : "out_of_stock", quantity: null };
  return {
    availability: total > 0 ? "in_stock" : "out_of_stock",
    quantity: total,
  };
}

/** Specifications from Medusa `metadata.specifications`.
 *  Supports BOTH conventions: `[{ name, value }]` (used by lib/medusa.ts)
 *  and a plain `{ key: value }` object. */
function specificationsOf(p: MedusaProduct): Record<string, string> {
  const raw = p.metadata?.specifications;
  const out: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const s of raw) {
      if (s && typeof s === "object") {
        const name = (s as { name?: unknown }).name;
        const value = (s as { value?: unknown }).value;
        if (typeof name === "string" && name) out[name] = String(value ?? "");
      }
    }
    return out;
  }
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v !== null && v !== undefined) out[k] = String(v);
    }
  }
  return out;
}

/** Map one Medusa product -> normalized AiProduct. Exported for reuse (blog, feeds). */
export function mapMedusaProductToAi(p: MedusaProduct): AiProduct {
  const variants = p.variants ?? [];
  // Cheapest variant defines the display price.
  let best: MedusaVariant | undefined;
  let bestEffective = Number.POSITIVE_INFINITY;
  for (const v of variants) {
    const { effective } = priceInfo(p, v);
    if (effective < bestEffective) {
      bestEffective = effective;
      best = v;
    }
  }
  const { effective, original, currency } = priceInfo(p, best);
  const { availability } = productAvailability(p);

  const onSale = original != null && original > effective;
  const price = onSale && original ? original : effective;
  const salePrice = onSale ? effective : null;

  return {
    id: p.id,
    name: p.title,
    sku: best?.sku ?? variants[0]?.sku ?? null,
    brand: metaString(p, "brand"),
    model: metaString(p, "model"),
    price,
    currency,
    salePrice,
    availability,
    image: p.thumbnail ?? p.images?.[0]?.url ?? null,
    url: absoluteUrl(`${PRODUCT_URL_PREFIX}/${p.handle}`),
    specifications: specificationsOf(p),
    shortDescription:
      metaString(p, "short_description") ?? p.subtitle ?? null,
  };
}

/** Map agent B's normalized StoreProduct (major units already) -> AiProduct.
 *  Used when reading through lib/medusa.ts, which carries fixture fallback. */
export function mapStoreProductToAi(p: StoreProduct): AiProduct {
  const specs: Record<string, string> = {};
  for (const s of p.specifications ?? []) {
    if (s.name) specs[s.name] = s.value;
  }
  // StoreProduct: price = effective, salePrice = compare-at (list).
  // AiProduct:    price = list,       salePrice = discounted.
  const onSale =
    p.salePrice != null && p.salePrice > p.price;
  return {
    id: p.id,
    name: p.title,
    sku: p.sku ?? null,
    brand: p.brand ?? null,
    model: p.model ?? null,
    price: onSale && p.salePrice ? p.salePrice : p.price,
    currency: (p.currency || DEFAULT_CURRENCY).toUpperCase(),
    salePrice: onSale ? p.price : null,
    availability: p.inStock ? "in_stock" : "out_of_stock",
    image: p.thumbnail ?? p.images[0]?.url ?? null,
    url: absoluteUrl(`${PRODUCT_URL_PREFIX}/${p.handle}`),
    specifications: specs,
    shortDescription: p.shortDescription ?? null,
  };
}

function mapDetails(p: MedusaProduct): AiProductDetails {
  const base = mapMedusaProductToAi(p);
  return {
    ...base,
    description: p.description ?? null,
    images:
      p.images?.map((im) => im.url).filter(Boolean) ??
      (base.image ? [base.image] : []),
    categories: (p.categories ?? []).map((c) => ({ id: c.id, name: c.name })),
    warranty: metaString(p, "warranty"),
  };
}

// ------------------------------------------------- data access ---

export interface ProductSearchParams {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
  sort?: "price_asc" | "price_desc" | "name_asc" | "name_desc" | "newest";
}

export async function aiSearchProducts(
  params: ProductSearchParams,
): Promise<{ items: AiProduct[]; total: number }> {
  // Read through agent B's typed store client (lib/medusa.ts): it applies
  // keyword/brand/price/stock filters, sorting and pagination, and falls back
  // to local fixtures when Medusa is unreachable — so the AI catalog always
  // matches what shoppers see on the site.
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = params.offset ?? 0;
  const page = Math.floor(offset / limit) + 1;

  // `category` may be an id or a slug/handle — resolve slugs to ids.
  let categoryId = params.category;
  if (categoryId) {
    try {
      const cats = await listCategories();
      const found = cats.find(
        (c) =>
          c.id === categoryId ||
          c.handle === categoryId ||
          c.slug === categoryId,
      );
      if (found) categoryId = found.id;
    } catch {
      // keep the raw value; listProducts will treat it as an id
    }
  }

  const sortMap = {
    price_asc: "price_asc",
    price_desc: "price_desc",
    name_asc: "name",
    name_desc: "name",
    newest: "newest",
  } as const;

  const res = await listProducts({
    q: params.q,
    categoryId,
    brand: params.brand,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    inStock: params.inStock,
    sort: params.sort ? sortMap[params.sort] : "relevance",
    page,
    pageSize: limit,
  });

  let items = res.products.map(mapStoreProductToAi);

  // Friendlier brand matching than the storefront's exact match:
  if (params.brand) {
    const b = params.brand.toLowerCase();
    const filtered = items.filter((p) =>
      p.brand?.toLowerCase().includes(b),
    );
    if (filtered.length) items = filtered;
  }
  if (params.sort === "name_desc") items = [...items].reverse();

  return { items, total: res.count };
}

/** Server-side fetch of one product (no API key needed — used after auth, and by blog pages).
 *  Falls back to local fixtures when Medusa is unreachable. */
export async function getAiProductById(id: string): Promise<AiProduct | null> {
  try {
    const res = await storeFetch<{ products: MedusaProduct[] }>(
      "/store/products",
      {
        params: { id, limit: 1, fields: PRODUCT_FIELDS },
        tags: ["products", `product:${id}`],
        revalidate: 120,
      },
    );
    const p = res.products[0];
    return p ? mapMedusaProductToAi(p) : null;
  } catch (err) {
    if (err instanceof MedusaError && (err.status === 503 || err.status === 502)) {
      const fixture = fixtureProducts.find((p) => p.id === id);
      return fixture ? mapStoreProductToAi(fixture) : null;
    }
    return null;
  }
}

export async function aiGetProductDetails(
  id: string,
): Promise<AiProductDetails | null> {
  const res = await storeFetch<{ products: MedusaProduct[] }>(
    "/store/products",
    {
      params: { id, limit: 1, fields: PRODUCT_FIELDS },
      tags: ["products", `product:${id}`],
      revalidate: 120,
    },
  );
  const p = res.products[0];
  return p ? mapDetails(p) : null;
}

export async function aiSearchCategories(q?: string): Promise<AiCategory[]> {
  const res = await storeFetch<{
    product_categories: {
      id: string;
      name: string;
      handle: string;
      description?: string | null;
      products?: unknown[];
    }[];
  }>("/store/product-categories", {
    params: { q, limit: 100 },
    tags: ["categories"],
    revalidate: 600,
  });
  return (res.product_categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.handle,
    description: c.description ?? null,
    productCount: Array.isArray(c.products) ? c.products.length : null,
  }));
}

export async function aiCheckInventory(
  ids: string[],
): Promise<AiInventoryStatus[]> {
  const unique = [...new Set(ids)].slice(0, 20);
  const out: AiInventoryStatus[] = [];
  for (const id of unique) {
    const res = await storeFetch<{ products: MedusaProduct[] }>(
      "/store/products",
      {
        params: {
          id,
          limit: 1,
          fields: "id,variants.id,variants.inventory_quantity",
        },
        tags: ["products", `product:${id}`],
        revalidate: 60,
      },
    );
    const p = res.products[0];
    if (!p) {
      out.push({ productId: id, inStock: false, quantity: 0 });
      continue;
    }
    const { availability, quantity } = productAvailability(p);
    out.push({
      productId: id,
      inStock: availability === "in_stock",
      quantity,
    });
  }
  return out;
}

export async function aiGetPrice(id: string): Promise<AiPriceInfo | null> {
  const p = await getAiProductById(id);
  if (!p) return null;
  return {
    productId: p.id,
    price: p.price,
    salePrice: p.salePrice,
    currency: p.currency,
  };
}

export async function aiGetRelatedProducts(
  id: string,
  limit = 8,
): Promise<AiProduct[]> {
  const res = await storeFetch<{ products: MedusaProduct[] }>(
    "/store/products",
    {
      params: { id, limit: 1, fields: "id,categories.id" },
      tags: ["products", `product:${id}`],
      revalidate: 300,
    },
  );
  const self = res.products[0];
  const categoryId = self?.categories?.[0]?.id;
  const { items } = await aiSearchProducts({
    category: categoryId,
    limit: limit + 1,
  });
  const related = items.filter((p) => p.id !== id).slice(0, limit);
  if (related.length > 0 || !self) return related;
  // Fallback: same brand.
  const details = await aiGetProductDetails(id);
  if (details?.brand) {
    const byBrand = await aiSearchProducts({ brand: details.brand, limit: limit + 1 });
    return byBrand.items.filter((p) => p.id !== id).slice(0, limit);
  }
  return [];
}

// ------------------------------------------------------- auth ---

const AI_RATE_LIMIT = 60;
const AI_RATE_WINDOW_MS = 60_000;
const keyCache = new Map<string, number>(); // key -> validUntil (ms)

function timingSafeCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}

/**
 * Validate one key against the Medusa ai_keys module.
 * Returns true/false, or null when the module is unreachable (caller falls
 * back to the AI_API_KEYS env list).
 */
async function validateKeyViaMedusa(key: string): Promise<boolean | null> {
  if (!hasAdminKey()) return null;
  try {
    const res = await adminFetch<{ valid: boolean }>("/admin/ai-keys/validate", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    return res.valid === true;
  } catch {
    return null;
  }
}

export interface AiAccess {
  ok: true;
  rateLimit: RateLimitResult;
  keyPrefix: string;
}

export type AiDenied = Response;

/**
 * Authenticate an AI API request. Order:
 *  1. x-api-key header present?
 *  2. valid per Medusa ai_keys module (cached 5 min), else AI_API_KEYS env
 *     list (timing-safe compare)
 *  3. 60 req/min token bucket per key
 * Returns null when access is granted, otherwise an error Response.
 */
export async function requireAiAccess(req: Request): Promise<AiDenied | null> {
  const key = req.headers.get("x-api-key")?.trim();
  if (!key) {
    return aiErr(
      401,
      "MISSING_API_KEY",
      "Provide your API key in the x-api-key header.",
    );
  }

  const now = Date.now();
  const cachedUntil = keyCache.get(key);
  let valid: boolean | null =
    cachedUntil !== undefined && cachedUntil > now ? true : null;

  if (valid === null) {
    const viaMedusa = await validateKeyViaMedusa(key);
    if (viaMedusa === true) {
      valid = true;
      keyCache.set(key, now + 5 * 60_000);
    } else if (viaMedusa === false) {
      valid = false;
    } else {
      const envKeys = (process.env.AI_API_KEYS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      valid = envKeys.some((k) => timingSafeCompare(k, key));
    }
  }

  if (!valid) {
    return aiErr(401, "INVALID_API_KEY", "The provided API key is not valid.");
  }

  const rl = checkRateLimit(`ai:${key}`, AI_RATE_LIMIT, AI_RATE_WINDOW_MS);
  if (!rl.allowed) {
    const res = aiErr(
      429,
      "RATE_LIMITED",
      `Rate limit exceeded (${AI_RATE_LIMIT}/min). Retry in ${Math.ceil(rl.resetMs / 1000)}s.`,
    );
    res.headers.set("Retry-After", String(Math.ceil(rl.resetMs / 1000)));
    return res;
  }

  return null;
}

// --------------------------------------------- envelopes/helpers ---

function rateLimitHeaders(rl?: RateLimitResult): Record<string, string> {
  if (!rl) return {};
  return {
    "X-RateLimit-Limit": String(rl.limit),
    "X-RateLimit-Remaining": String(rl.remaining),
  };
}

export function aiOk<T>(
  data: T,
  meta: AiMeta = {},
  rl?: RateLimitResult,
): Response {
  const body: AiEnvelope<T> = { data, meta };
  return Response.json(body, { headers: rateLimitHeaders(rl) });
}

export function aiErr(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

// ------------------------------------------------- param parsing ---

export class AiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiValidationError";
  }
}

export function qStr(
  sp: URLSearchParams,
  name: string,
  opts: { required?: boolean; maxLength?: number } = {},
): string | undefined {
  const v = sp.get(name)?.trim();
  if (!v) {
    if (opts.required) throw new AiValidationError(`Missing required parameter: ${name}`);
    return undefined;
  }
  if (opts.maxLength && v.length > opts.maxLength)
    throw new AiValidationError(`Parameter ${name} exceeds ${opts.maxLength} characters.`);
  return v;
}

export function qInt(
  sp: URLSearchParams,
  name: string,
  opts: { min?: number; max?: number; default?: number } = {},
): number {
  const raw = sp.get(name);
  if (raw === null || raw === "") return opts.default ?? 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n))
    throw new AiValidationError(`Parameter ${name} must be an integer.`);
  if (opts.min !== undefined && n < opts.min)
    throw new AiValidationError(`Parameter ${name} must be >= ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max)
    throw new AiValidationError(`Parameter ${name} must be <= ${opts.max}.`);
  return n;
}

export function qNum(
  sp: URLSearchParams,
  name: string,
): number | undefined {
  const raw = sp.get(name);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0)
    throw new AiValidationError(`Parameter ${name} must be a non-negative number.`);
  return n;
}

export function qBool(sp: URLSearchParams, name: string): boolean | undefined {
  const raw = sp.get(name)?.toLowerCase();
  if (raw === null || raw === undefined || raw === "") return undefined;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new AiValidationError(`Parameter ${name} must be true or false.`);
}

/** Wrap a GET handler body: maps AiValidationError -> 400 envelope. */
export async function runAiHandler(
  fn: () => Promise<Response>,
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AiValidationError) {
      return aiErr(400, "INVALID_PARAMS", err.message);
    }
    console.error("[ai-api]", err);
    return aiErr(500, "INTERNAL_ERROR", "Unexpected error processing the request.");
  }
}

import "server-only";

import { fixtureCategories, fixtureProducts } from "./fixtures";

/**
 * Typed SERVER-ONLY Medusa store client.
 *
 * Reads MEDUSA_BACKEND_URL + NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY from the
 * environment. Every function tries the Medusa Store API first and falls back
 * to local fixtures (lib/fixtures.ts) on any failure, so pages always render.
 *
 * Prices are normalized to MAJOR currency units (rupees) — Medusa returns
 * minor units (paisa), so the mapper divides by 100.
 * ISR: all fetches use `next: { revalidate: 3600, tags: [...] }`.
 */

// ---------------------------------------------------------------------------
// Public types (shared with fixtures + pages)
// ---------------------------------------------------------------------------

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface SpecRow {
  name: string;
  value: string;
}

export interface StoreCategory {
  id: string;
  name: string;
  /** URL slug, e.g. "led-lights" */
  handle: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  image?: string;
  productCount?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface StoreProduct {
  id: string;
  handle: string;
  title: string;
  brand?: string;
  model?: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  thumbnail?: string;
  images: ProductImage[];
  /** Major units, e.g. 145000 = Rs 145,000 */
  price: number;
  salePrice?: number;
  currency: string;
  inStock: boolean;
  stockQty?: number;
  categoryId?: string;
  category?: { id: string; name: string; handle: string };
  specifications: SpecRow[];
  attributes: Record<string, string>;
  weight?: string;
  dimensions?: string;
  warranty?: string;
  relatedIds: string[];
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export type ProductSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "name";

export interface ProductFilters {
  q?: string;
  categoryId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ProductListResult {
  products: StoreProduct[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MEDUSA_URL = (process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "");
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const REGION_ID = process.env.MEDUSA_REGION_ID || "";

export function isMedusaConfigured(): boolean {
  return Boolean(MEDUSA_URL && PUBLISHABLE_KEY);
}

const REVALIDATE = 3600;

// ---------------------------------------------------------------------------
// Minimal Medusa v2 Store API shapes (only what we map)
// ---------------------------------------------------------------------------

interface MedusaImage {
  url?: string;
}
interface MedusaVariant {
  sku?: string;
  calculated_price?: {
    calculated_amount?: number;
    original_amount?: number;
    currency_code?: string;
  };
  prices?: { amount?: number; currency_code?: string }[];
  inventory_quantity?: number;
  manage_inventory?: boolean;
  allow_backorder?: boolean;
  metadata?: Record<string, unknown>;
}
interface MedusaProduct {
  id?: string;
  handle?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  images?: MedusaImage[];
  categories?: { id?: string; name?: string; handle?: string }[];
  variants?: MedusaVariant[];
  metadata?: Record<string, unknown>;
  created_at?: string;
}
interface MedusaCategory {
  id?: string;
  name?: string;
  handle?: string;
  description?: string;
  parent_category_id?: string | null;
  metadata?: Record<string, unknown>;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** Normalize a Medusa product into StoreProduct (major units). */
function normalizeProduct(m: MedusaProduct): StoreProduct {
  const variant = m.variants?.[0];
  const calc = variant?.calculated_price;
  const fallbackPrice = variant?.prices?.[0];

  const amountMinor =
    calc?.calculated_amount ?? fallbackPrice?.amount ?? 0;
  const originalMinor =
    calc?.original_amount ??
    (fallbackPrice?.amount && calc?.calculated_amount
      ? undefined
      : undefined);

  const price = amountMinor / 100;
  const original =
    originalMinor && originalMinor > amountMinor
      ? originalMinor / 100
      : undefined;

  const meta = m.metadata ?? {};
  const vmeta = variant?.metadata ?? {};
  const inv = variant?.inventory_quantity ?? 0;
  const inStock =
    variant?.allow_backorder === true ||
    variant?.manage_inventory === false ||
    inv > 0;

  const specsRaw = meta.specifications;
  const specifications: SpecRow[] = Array.isArray(specsRaw)
    ? (specsRaw as { name?: string; value?: string }[]).map((s) => ({
        name: String(s.name ?? ""),
        value: String(s.value ?? ""),
      }))
    : [];

  const attrsRaw = meta.attributes;
  const attributes: Record<string, string> =
    attrsRaw && typeof attrsRaw === "object"
      ? Object.fromEntries(
          Object.entries(attrsRaw as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v),
          ]),
        )
      : {};

  const cat = m.categories?.[0];
  const images: ProductImage[] =
    m.images?.map((im, i) => ({
      url: im.url ?? "",
      alt: `${m.title ?? "Product"} image ${i + 1}`,
    })).filter((im) => im.url) ?? [];

  return {
    id: String(m.id ?? ""),
    handle: String(m.handle ?? m.id ?? ""),
    title: String(m.title ?? "Untitled product"),
    brand: str(meta.brand) ?? str(vmeta.brand),
    model: str(meta.model),
    sku: str(variant?.sku),
    description: str(m.description),
    shortDescription: str(meta.short_description),
    thumbnail: str(m.thumbnail) ?? images[0]?.url,
    images,
    price,
    salePrice: original,
    currency: (
      calc?.currency_code ??
      fallbackPrice?.currency_code ??
      "PKR"
    ).toUpperCase(),
    inStock,
    stockQty: inv,
    categoryId: str(cat?.id),
    category: cat?.id
      ? {
          id: String(cat.id),
          name: String(cat.name ?? ""),
          handle: String(cat.handle ?? ""),
        }
      : undefined,
    specifications,
    attributes,
    weight: str(meta.weight),
    dimensions: str(meta.dimensions),
    warranty: str(meta.warranty),
    relatedIds: [],
    rating: typeof meta.rating === "number" ? meta.rating : undefined,
    reviewCount:
      typeof meta.review_count === "number" ? meta.review_count : undefined,
    isFeatured: meta.is_featured === true,
    isBestSeller: meta.is_best_seller === true,
    seoTitle: str(meta.seo_title),
    seoDescription: str(meta.seo_description),
  };
}

function normalizeCategory(m: MedusaCategory): StoreCategory {
  const meta = m.metadata ?? {};
  return {
    id: String(m.id ?? ""),
    name: String(m.name ?? ""),
    handle: String(m.handle ?? m.id ?? ""),
    slug: String(m.handle ?? m.id ?? ""),
    description: str(m.description),
    parentId: m.parent_category_id ?? null,
    image: str(meta.image),
    seoTitle: str(meta.seo_title),
    seoDescription: str(meta.seo_description),
  };
}

async function medusaFetch<T>(path: string, tag: string): Promise<T> {
  // NOTE: hard timeout — without it a sleeping/unreachable backend hangs page
  // prerendering (Next.js kills pages after 60s) and runtime requests.
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    next: { revalidate: REVALIDATE, tags: [tag] },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    throw new Error(`Medusa ${path} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Fixture-side filtering (mirrors what the Medusa query would do)
// ---------------------------------------------------------------------------

function applyFilters(
  products: StoreProduct[],
  f: ProductFilters,
): StoreProduct[] {
  let out = [...products];
  const q = (f.q ?? "").trim().toLowerCase();
  if (q) {
    const terms = q.split(/\s+/);
    out = out.filter((p) => {
      const hay =
        `${p.title} ${p.brand ?? ""} ${p.model ?? ""} ${p.sku ?? ""} ${p.shortDescription ?? ""} ${p.description ?? ""} ${Object.values(p.attributes).join(" ")}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }
  if (f.categoryId) out = out.filter((p) => p.categoryId === f.categoryId);
  if (f.brand)
    out = out.filter(
      (p) => (p.brand ?? "").toLowerCase() === f.brand!.toLowerCase(),
    );
  if (typeof f.minPrice === "number")
    out = out.filter((p) => (p.salePrice ?? p.price) >= f.minPrice!);
  if (typeof f.maxPrice === "number")
    out = out.filter((p) => (p.salePrice ?? p.price) <= f.maxPrice!);
  if (f.inStock) out = out.filter((p) => p.inStock);

  switch (f.sort) {
    case "price_asc":
      out.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
      break;
    case "price_desc":
      out.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
      break;
    case "name":
      out.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "newest":
      // fixtures have no created_at; keep insertion order (newest last added)
      out.reverse();
      break;
    default:
      // relevance: best sellers + featured first
      out.sort(
        (a, b) =>
          Number(b.isBestSeller ?? false) - Number(a.isBestSeller ?? false) ||
          Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false),
      );
  }
  return out;
}

function paginate(
  products: StoreProduct[],
  f: ProductFilters,
): ProductListResult {
  const pageSize = Math.min(Math.max(f.pageSize ?? 12, 1), 100);
  const page = Math.max(f.page ?? 1, 1);
  const count = products.length;
  const totalPages = Math.max(Math.ceil(count / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    products: products.slice(start, start + pageSize),
    count,
    page: safePage,
    pageSize,
    totalPages,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** List products with keyword/brand/price/stock filters, sorting + pagination. */
export async function listProducts(
  filters: ProductFilters = {},
): Promise<ProductListResult> {
  if (isMedusaConfigured()) {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.categoryId) params.set("category_id", filters.categoryId);
      if (filters.brand) params.set("brand", filters.brand);
      if (REGION_ID) params.set("region_id", REGION_ID);
      params.set(
        "fields",
        "*variants.calculated_price,*categories,*images",
      );
      params.set("limit", String(filters.pageSize ?? 12));
      params.set("offset", String(((filters.page ?? 1) - 1) * (filters.pageSize ?? 12)));
      const data = await medusaFetch<{
        products?: MedusaProduct[];
        count?: number;
      }>(`/store/products?${params.toString()}`, "products");
      const products = (data.products ?? []).map(normalizeProduct);
      const filtered = applyFilters(products, { ...filters, page: 1, pageSize: 1000 });
      return paginate(filtered, filters);
    } catch {
      // fall through to fixtures
    }
  }
  return paginate(applyFilters(fixtureProducts, filters), filters);
}

/** Get a single product by its URL handle (slug). */
export async function getProductByHandle(
  handle: string,
): Promise<StoreProduct | null> {
  if (isMedusaConfigured()) {
    try {
      const params = new URLSearchParams({ handle });
      if (REGION_ID) params.set("region_id", REGION_ID);
      params.set("fields", "*variants.calculated_price,*categories,*images");
      const data = await medusaFetch<{ products?: MedusaProduct[] }>(
        `/store/products?${params.toString()}`,
        "products",
      );
      const found = (data.products ?? [])[0];
      if (found) return normalizeProduct(found);
    } catch {
      // fall through to fixtures
    }
  }
  return fixtureProducts.find((p) => p.handle === handle) ?? null;
}

/** Alias used by route params named [slug]. */
export const getProductBySlug = getProductByHandle;

/** List all product categories (flat; parents via parentId). */
export async function listCategories(): Promise<StoreCategory[]> {
  if (isMedusaConfigured()) {
    try {
      const data = await medusaFetch<{ product_categories?: MedusaCategory[] }>(
        `/store/product-categories?include_descendants_tree=false`,
        "categories",
      );
      return (data.product_categories ?? []).map(normalizeCategory);
    } catch {
      // fall through to fixtures
    }
  }
  return fixtureCategories;
}

/** Get a category by slug/handle. */
export async function getCategory(
  slug: string,
): Promise<StoreCategory | null> {
  const cats = await listCategories();
  return cats.find((c) => c.handle === slug || c.slug === slug) ?? null;
}

/** Keyword product search — same engine as listProducts, tuned for /search. */
export async function searchProducts(
  query: string,
  filters: Omit<ProductFilters, "q"> = {},
): Promise<ProductListResult> {
  return listProducts({ ...filters, q: query });
}

/** Related products: same category first, then best sellers. */
export async function getRelatedProducts(
  product: StoreProduct,
  limit = 4,
): Promise<StoreProduct[]> {
  const explicit = product.relatedIds
    .map((id) => fixtureProducts.find((p) => p.id === id))
    .filter((p): p is StoreProduct => Boolean(p && p.id !== product.id));

  let pool: StoreProduct[];
  if (isMedusaConfigured()) {
    try {
      const { products } = await listProducts({
        categoryId: product.categoryId,
        pageSize: 50,
      });
      pool = products.filter((p) => p.id !== product.id);
    } catch {
      pool = fixtureProducts.filter((p) => p.id !== product.id);
    }
  } else {
    pool = fixtureProducts.filter((p) => p.id !== product.id);
  }

  const sameCat = pool.filter((p) => p.categoryId === product.categoryId);
  const rest = pool.filter((p) => p.categoryId !== product.categoryId);
  const merged = [
    ...explicit,
    ...sameCat.filter((p) => !explicit.some((e) => e.id === p.id)),
    ...rest.filter((p) => !explicit.some((e) => e.id === p.id)),
  ];
  return merged.slice(0, limit);
}

/** Distinct brand names across the catalog (for filter UI). */
export async function listBrands(): Promise<string[]> {
  const { products } = await listProducts({ pageSize: 200 });
  const brands = new Set<string>();
  for (const p of products) if (p.brand) brands.add(p.brand);
  return [...brands].sort();
}

/** Global min/max effective price (for price-range filter bounds). */
export async function priceBounds(): Promise<{ min: number; max: number }> {
  const { products } = await listProducts({ pageSize: 200 });
  const prices = products.map((p) => p.salePrice ?? p.price);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

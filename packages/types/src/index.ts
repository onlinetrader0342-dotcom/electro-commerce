/**
 * Shared domain DTOs for the electro-commerce monorepo.
 *
 * These are the canonical shapes exchanged between:
 *  - Medusa commerce engine (apps/medusa)
 *  - Next.js storefront (apps/storefront)
 *  - AI agent API layer (packages/ai-tools)
 *  - Product feed generator (packages/feed-generator)
 *
 * Medusa remains the single source of truth; these types describe the
 * *projected* shapes each consumer works with — never a second database.
 */

/* ── Money & availability ─────────────────────────────────── */

export type Currency = "PKR" | "USD" | "EUR" | "AED" | "SAR";

export interface Money {
  /** Amount in major currency units, e.g. 285000 = Rs 285,000. */
  amount: number;
  currency: Currency;
}

export type Availability =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "preorder";

export interface InventoryStatus {
  productId: string;
  variantId?: string;
  sku?: string;
  quantity: number;
  availability: Availability;
  /** ISO timestamp of when this status was read. */
  checkedAt: string;
}

/* ── Catalog ──────────────────────────────────────────────── */

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  price: Money;
  salePrice?: Money;
  inventoryQuantity: number;
  availability: Availability;
  /** e.g. { Size: "5kW", Color: "White" } */
  options: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  children?: Category[];
  imageUrl?: string;
  productCount?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface SeoMeta {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "mm" | "in";
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  /** Human SKU (stock-keeping unit), unique per sellable variant line. */
  sku: string;
  brand?: string;
  model?: string;
  description: string;
  shortDescription?: string;
  images: ProductImage[];
  price: Money;
  salePrice?: Money;
  availability: Availability;
  stockQuantity: number;
  category: Category;
  subcategory?: Category;
  /** Technical specs, e.g. { capacity: "5 kW", mppt: "80 A", warranty: "5 years" } */
  specifications: Record<string, string>;
  /** Facetable attributes, e.g. { phase: "single", color: ["white","black"] } */
  attributes: Record<string, string | string[]>;
  weightKg?: number;
  dimensions?: ProductDimensions;
  warranty?: string;
  relatedProductIds: string[];
  /** Canonical storefront URL, e.g. https://…/products/voltcore-5kw-hybrid */
  url: string;
  seo: SeoMeta;
  tags: string[];
}

/* ── Blog / CMS ───────────────────────────────────────────── */

export type BlogPostStatus = "draft" | "published" | "scheduled";

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface Author {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  role?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  /** Markdown content. Product recommendations are NOT inlined here —
   *  they are structured PostProductLinks resolved to `relatedProducts`. */
  content: string;
  status: BlogPostStatus;
  publishedAt?: string;
  scheduledAt?: string;
  featuredImage?: string;
  imageAlt?: string;
  ogImage?: string;
  author?: Author;
  category?: BlogCategory;
  tags: BlogTag[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  /** Products recommended by this article, resolved from structured links. */
  relatedProducts?: AiProduct[];
}

/** Structured link from a blog post to a Medusa product (ordered). */
export interface PostProductLink {
  id: string;
  postId: string;
  /** Medusa product id — the single source of truth stays in Medusa. */
  medusaProductId: string;
  position: number;
}

/* ── AI-agent API shapes ──────────────────────────────────── */

/**
 * Trimmed product projection for AI agents. Deliberately excludes anything
 * an unauthenticated agent must never see (costs, margins, customer data).
 */
export interface AiProduct {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  model?: string;
  price: Money;
  salePrice?: Money;
  availability: Availability;
  image?: string;
  url: string;
  specifications: Record<string, string>;
  shortDescription?: string;
}

export type AiSort = "relevance" | "price_asc" | "price_desc" | "newest";

export interface AiSearchParams {
  query?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  attributes?: Record<string, string>;
  sort?: AiSort;
  page?: number;
  pageSize?: number;
}

export interface AiSearchResult {
  query: AiSearchParams;
  total: number;
  page: number;
  pageSize: number;
  products: AiProduct[];
  facets?: {
    brands?: Array<{ value: string; count: number }>;
    categories?: Array<{ value: string; count: number }>;
    priceRanges?: Array<{ min: number; max: number; count: number }>;
  };
}

/* ── Product feed ─────────────────────────────────────────── */

export type FeedAvailability = "in_stock" | "out_of_stock" | "preorder";

export interface FeedProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  /** Canonical product URL. */
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  price: Money;
  salePrice?: Money;
  availability: FeedAvailability;
  brand?: string;
  /** Manufacturer part number — falls back to SKU. */
  mpn?: string;
  gtin?: string;
  /** e.g. "Inverters > Hybrid Inverters" */
  productType?: string;
  googleProductCategory?: string;
  condition: "new" | "refurbished" | "used";
  weightKg?: number;
  /** Extra attributes forwarded as custom feed fields. */
  attributes: Record<string, string>;
}

/* ── API keys / scopes ────────────────────────────────────── */

/**
 * Scopes gate what an API key may do. Read-only discovery (`ai:read`) is
 * strictly separated from transactional scopes (`ai:cart`, `ai:checkout`).
 * Transactional scopes must only be granted behind an explicit user-approval
 * flow — never by default.
 */
export type ApiScope =
  | "ai:read"
  | "ai:cart"
  | "ai:checkout"
  | "admin:blog"
  | "admin:keys";

export interface ApiKeyInfo {
  id: string;
  name: string;
  /** First characters of the raw key, for identification (never the key). */
  prefix: string;
  scopes: ApiScope[];
  rateLimitPerMin: number;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

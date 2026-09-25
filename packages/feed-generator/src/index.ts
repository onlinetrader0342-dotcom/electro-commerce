/**
 * Product-feed generation for electro-commerce.
 *
 * Data flow (one direction only):
 *
 *   MEDUSA / POSTGRESQL ──▶ mapMedusaToFeedProduct() ──▶ FeedProduct
 *                                                        ├─▶ toGoogleMerchantXml()
 *                                                        └─▶ toJsonFeed()
 *
 * There is intentionally NO product database here. The feed is regenerated
 * from Medusa on every run (cron / Medusa subscriber / admin trigger), so a
 * product entered once in the admin is automatically reflected in the feed.
 */
import type {
  Currency,
  FeedAvailability,
  FeedProduct,
} from "@electro-commerce/types";

/* ── Medusa shape (structural — no @medusajs/* dependency) ── */

/** Minimal structural view of a Medusa v2 store product. */
export interface MedusaProductLike {
  id: string;
  title: string;
  handle: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  images?: Array<{ url: string }>;
  categories?: Array<{ id: string; name: string }>;
  tags?: Array<{ value: string }>;
  variants?: Array<{
    id: string;
    sku?: string | null;
    calculated_price?: {
      calculated_amount?: number | null;
      currency_code?: string | null;
    } | null;
    inventory_quantity?: number | null;
  }>;
  metadata?: Record<string, unknown> | null;
}

export interface MapOptions {
  /** Storefront origin, e.g. https://www.imranelectric.store */
  baseUrl: string;
  /** Fallback currency when a variant has no calculated price. */
  defaultCurrency?: Currency;
}

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  const v = metadata?.[key];
  return typeof v === "string" && v.length ? v : undefined;
}

function toFeedAvailability(qty: number | null | undefined): FeedAvailability {
  if (qty == null) return "out_of_stock";
  return qty > 0 ? "in_stock" : "out_of_stock";
}

/**
 * Project one Medusa product into the canonical FeedProduct.
 * Picks the first variant that carries a price; SKU/brand/model fall back
 * to product-level metadata so the feed never emits empty required fields.
 */
export function mapMedusaToFeedProduct(
  p: MedusaProductLike,
  opts: MapOptions,
): FeedProduct {
  const pricedVariant =
    p.variants?.find(
      (v) => v.calculated_price?.calculated_amount != null,
    ) ?? p.variants?.[0];

  const amount = pricedVariant?.calculated_price?.calculated_amount ?? 0;
  const currency = ((pricedVariant?.calculated_price?.currency_code ??
    opts.defaultCurrency ??
    "PKR") as Currency).toUpperCase() as Currency;

  const sku =
    pricedVariant?.sku ?? metaString(p.metadata, "sku") ?? p.id;
  const brand = metaString(p.metadata, "brand");
  const model = metaString(p.metadata, "model");
  const specs = (p.metadata?.specifications ?? {}) as Record<string, string>;

  const images = (p.images ?? []).map((i) => i.url).filter(Boolean);
  const imageLink = p.thumbnail ?? images[0] ?? "";
  const description =
    p.description?.trim() || p.subtitle?.trim() || p.title;

  const productType = (p.categories ?? []).map((c) => c.name).join(" > ") || undefined;

  return {
    id: p.id,
    sku,
    title: p.title,
    description,
    link: `${opts.baseUrl.replace(/\/$/, "")}/products/${p.handle}`,
    imageLink,
    additionalImageLinks: images.slice(1),
    price: { amount, currency },
    // Sale price: Medusa exposes it via calculated_price when a price list /
    // promotion applies; the storefront passes it through `salePrice`.
    salePrice: undefined,
    availability: toFeedAvailability(pricedVariant?.inventory_quantity),
    brand,
    mpn: model ?? sku,
    productType,
    condition: "new",
    attributes: Object.fromEntries(
      Object.entries(specs).map(([k, v]) => [k, String(v)]),
    ),
  };
}

/** Map many products at once, dropping entries without a usable price. */
export function mapMedusaProductsToFeed(
  products: MedusaProductLike[],
  opts: MapOptions,
): FeedProduct[] {
  return products
    .map((p) => mapMedusaToFeedProduct(p, opts))
    .filter((f) => f.price.amount > 0);
}

/* ── Google Merchant Center (RSS 2.0 + g: namespace) ───────── */

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const GMC_AVAILABILITY: Record<FeedAvailability, string> = {
  in_stock: "in_stock",
  out_of_stock: "out_of_stock",
  preorder: "preorder",
};

function gmcPrice(fp: FeedProduct): string {
  const p = fp.salePrice ?? fp.price;
  return `${p.amount.toFixed(2)} ${p.currency}`;
}

/**
 * Google Merchant Center product feed (RSS 2.0).
 * Fields: id, title, description, link, image_link, price, sale_price,
 * availability, brand, mpn, condition, product_type, google_product_category.
 */
export function toGoogleMerchantXml(
  products: FeedProduct[],
  opts: { title: string; link: string; description: string },
): string {
  const items = products
    .map((fp) => {
      const extra: string[] = [];
      if (fp.salePrice) {
        extra.push(`    <g:sale_price>${escXml(gmcPrice({ ...fp, salePrice: fp.salePrice }))}</g:sale_price>`);
      }
      if (fp.additionalImageLinks?.length) {
        for (const u of fp.additionalImageLinks.slice(0, 10)) {
          extra.push(`    <g:additional_image_link>${escXml(u)}</g:additional_image_link>`);
        }
      }
      const specLines = Object.entries(fp.attributes)
        .map(([k, v]) => `    <g:product_detail><g:section_name>Specifications</g:section_name><g:attribute_name>${escXml(k)}</g:attribute_name><g:attribute_value>${escXml(v)}</g:attribute_value></g:product_detail>`);
      return `  <item>
    <g:id>${escXml(fp.id)}</g:id>
    <title>${escXml(fp.title)}</title>
    <description>${escXml(fp.description)}</description>
    <link>${escXml(fp.link)}</link>
    <g:image_link>${escXml(fp.imageLink)}</g:image_link>
    <g:price>${escXml(gmcPrice(fp))}</g:price>
    <g:availability>${GMC_AVAILABILITY[fp.availability]}</g:availability>
    <g:condition>${fp.condition}</g:condition>
${fp.brand ? `    <g:brand>${escXml(fp.brand)}</g:brand>\n` : ""}${fp.mpn ? `    <g:mpn>${escXml(fp.mpn)}</g:mpn>\n` : ""}${fp.gtin ? `    <g:gtin>${escXml(fp.gtin)}</g:gtin>\n` : ""}${fp.productType ? `    <g:product_type>${escXml(fp.productType)}</g:product_type>\n` : ""}${fp.googleProductCategory ? `    <g:google_product_category>${escXml(fp.googleProductCategory)}</g:google_product_category>\n` : ""}${extra.join("\n")}${extra.length ? "\n" : ""}${specLines.join("\n")}${specLines.length ? "\n" : ""}  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>${escXml(opts.title)}</title>
  <link>${escXml(opts.link)}</link>
  <description>${escXml(opts.description)}</description>
${items}
</channel>
</rss>
`;
}

/* ── JSON feed (for AI platforms / custom integrations) ───── */

export interface JsonFeed {
  version: string;
  generatedAt: string;
  count: number;
  products: FeedProduct[];
}

/** Simple JSON feed — same data, machine-friendly, for AI/UCP integrations. */
export function toJsonFeed(products: FeedProduct[]): string {
  const feed: JsonFeed = {
    version: "https://electro-commerce/feed/v1",
    generatedAt: new Date().toISOString(),
    count: products.length,
    products,
  };
  return JSON.stringify(feed, null, 2);
}

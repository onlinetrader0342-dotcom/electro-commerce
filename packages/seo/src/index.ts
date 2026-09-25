/**
 * Pure SEO helpers for electro-commerce.
 *
 * Framework-agnostic: they take plain data and return plain objects, so the
 * Next.js storefront, the feed generator, or any future renderer can use
 * them. No Next.js (or any framework) dependency lives here.
 */
import type {
  Availability,
  BlogPost,
  Category,
  Money,
  Product,
} from "@electro-commerce/types";

export interface SiteConfig {
  /** e.g. "Imran Electric Store" */
  name: string;
  /** e.g. "https://www.imranelectric.store" (no trailing slash) */
  baseUrl: string;
  defaultLocale?: string;
  twitterHandle?: string;
}

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  openGraph: {
    type: "website" | "article" | "product";
    title: string;
    description: string;
    url: string;
    siteName: string;
    images: Array<{ url: string; alt?: string }>;
  };
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_\-~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrice(m: Money): string {
  return `${m.currency} ${m.amount.toLocaleString("en-PK")}`;
}

/* ── Metadata builders ────────────────────────────────────── */

/** Dynamic <title> / meta description / canonical / Open Graph for a product. */
export function buildProductMetadata(
  product: Product,
  site: SiteConfig,
): PageMetadata {
  const price = product.salePrice ?? product.price;
  const title =
    product.seo.title ??
    `${product.title} — ${formatPrice(price)} | ${site.name}`;
  const description =
    product.seo.description ??
    truncate(
      `${product.shortDescription ?? stripMarkdown(product.description)} ` +
        `Brand: ${product.brand ?? "—"}. ` +
        `Price ${formatPrice(price)} in Pakistan. ` +
        `${product.availability === "in_stock" ? "In stock" : "Check availability"} at ${site.name}.`,
      160,
    );
  const canonical = product.seo.canonicalUrl ?? product.url;
  const images = product.images.map((img) => ({
    url: img.url,
    alt: img.altText ?? product.title,
  }));

  return {
    title,
    description,
    canonical,
    openGraph: {
      type: "product",
      title,
      description,
      url: canonical,
      siteName: site.name,
      images,
    },
  };
}

/** Metadata for a category (or subcategory) listing page. */
export function buildCategoryMetadata(
  category: Category,
  site: SiteConfig,
  productCount?: number,
): PageMetadata {
  const url = `${site.baseUrl}/categories/${category.slug}`;
  const title =
    category.seoTitle ?? `${category.name} — Buy Online in Pakistan | ${site.name}`;
  const countBit =
    typeof productCount === "number" ? ` (${productCount} products)` : "";
  const description =
    category.seoDescription ??
    truncate(
      `Shop ${category.name}${countBit} online in Pakistan at ${site.name}. ` +
        (category.description ?? "Best prices, warranty and fast delivery."),
      160,
    );

  return {
    title,
    description,
    canonical: url,
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: site.name,
      images: category.imageUrl ? [{ url: category.imageUrl, alt: category.name }] : [],
    },
  };
}

/** Metadata for a blog article page. */
export function buildArticleMetadata(
  post: BlogPost,
  site: SiteConfig,
): PageMetadata {
  const url = post.canonicalUrl ?? `${site.baseUrl}/blog/${post.slug}`;
  const title = post.seoTitle ?? `${post.title} | ${site.name} Blog`;
  const description =
    post.seoDescription ??
    truncate(post.excerpt ?? stripMarkdown(post.content).slice(0, 200), 160);

  return {
    title,
    description,
    canonical: post.canonicalUrl ?? url,
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: site.name,
      images: (post.ogImage ?? post.featuredImage)
        ? [{ url: (post.ogImage ?? post.featuredImage) as string, alt: post.imageAlt ?? post.title }]
        : [],
    },
  };
}

/* ── JSON-LD structured data ──────────────────────────────── */

const AVAILABILITY_LD: Record<Availability, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
};

/** schema.org Product — powers rich results (price, availability, rating). */
export function jsonLdProduct(product: Product, site: SiteConfig) {
  const price = product.salePrice ?? product.price;
  const specProps = Object.entries(product.specifications).map(
    ([name, value]) => ({
      "@type": "PropertyValue",
      name,
      value,
    }),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images.map((i) => i.url),
    description: truncate(
      product.shortDescription ?? stripMarkdown(product.description),
      500,
    ),
    sku: product.sku,
    mpn: product.model ?? product.sku,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    url: product.url,
    additionalProperty: specProps.length ? specProps : undefined,
    weight: product.weightKg
      ? { "@type": "QuantitativeValue", value: product.weightKg, unitCode: "KGM" }
      : undefined,
    offers: {
      "@type": "Offer",
      url: product.url,
      priceCurrency: price.currency,
      price: price.amount,
      availability: AVAILABILITY_LD[product.availability],
      seller: { "@type": "Organization", name: site.name },
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

/** BreadcrumbList — Home › Category › Product (or article). */
export function jsonLdBreadcrumb(
  items: Array<{ name: string; url: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** schema.org Article for blog posts (NewsArticle/BlogPosting). */
export function jsonLdArticle(post: BlogPost, site: SiteConfig) {
  const url = `${site.baseUrl}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage ? [post.featuredImage] : undefined,
    datePublished: post.publishedAt,
    author: post.author
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: site.name },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.baseUrl,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": post.canonicalUrl ?? url },
    keywords: post.tags.map((t) => t.name).join(", ") || undefined,
  };
}

/** Organization + WebSite (with SearchAction) for the site root. */
export function jsonLdOrganization(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.baseUrl,
    sameAs: [] as string[],
  };
}

export function jsonLdWebSite(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site.baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

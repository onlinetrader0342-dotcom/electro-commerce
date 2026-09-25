import type { Metadata } from "next";
import { absoluteUrl } from "./format";
import type { StoreCategory, StoreProduct } from "./medusa";

/**
 * SEO helpers: dynamic metadata + JSON-LD builders.
 * Canonical URLs always come from NEXT_PUBLIC_SITE_URL.
 */

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export function generateProductMetadata(p: StoreProduct): Metadata {
  const effective = p.salePrice ?? p.price;
  const url = absoluteUrl(`/product/${p.handle}`);
  const title =
    p.seoTitle ?? `${p.title} — Price in Pakistan | Imran Electric Store`;
  const description =
    p.seoDescription ??
    p.shortDescription ??
    `${p.title} online in Pakistan at Rs ${effective.toLocaleString("en-PK")}. ${p.warranty ?? "Genuine product"}.`;
  const images = p.images.length
    ? p.images.map((im) => ({ url: absoluteUrl(im.url), alt: im.alt ?? p.title }))
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Imran Electric Store",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((i) => i.url),
    },
    ...(p.inStock
      ? {}
      : { robots: { index: true, follow: true } }),
  };
}

export function generateCategoryMetadata(c: StoreCategory): Metadata {
  const url = absoluteUrl(`/category/${c.handle}`);
  const title =
    c.seoTitle ?? `${c.name} — Buy Online in Pakistan | Imran Electric Store`;
  const description =
    c.seoDescription ??
    c.description ??
    `Shop ${c.name} online in Pakistan at the best prices. Genuine products with warranty at Imran Electric Store.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Imran Electric Store",
      ...(c.image ? { images: [{ url: absoluteUrl(c.image) }] } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD builders (rendered via <JsonLd>)
// ---------------------------------------------------------------------------

export function productJsonLd(p: StoreProduct) {
  const effective = p.salePrice ?? p.price;
  const url = absoluteUrl(`/product/${p.handle}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    url,
    image: p.images.map((im) => absoluteUrl(im.url)),
    description: p.shortDescription ?? p.description,
    sku: p.sku,
    mpn: p.model,
    brand: p.brand
      ? { "@type": "Brand", name: p.brand }
      : undefined,
    category: p.category?.name,
    weight: p.weight,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: p.currency,
      price: effective,
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Imran Electric Store",
      },
    },
    ...(p.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            reviewCount: p.reviewCount ?? 1,
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(
  items: { label: string; href?: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function organizationJsonLd() {
  const base = absoluteUrl("/");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Imran Electric Store",
    url: base,
    logo: absoluteUrl("/images/logo.svg"),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+92-317-5953134",
      contactType: "customer service",
      areaServed: "PK",
    },
    sameAs: [] as string[],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Imran Electric Store",
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

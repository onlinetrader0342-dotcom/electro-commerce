import "server-only";
import { mapMedusaProductToAi } from "./ai-api";
import { storeFetch } from "./commerce";
import { absoluteUrl } from "./format";

/**
 * Product-feed generation. Single source of truth: the Medusa product list.
 * Nothing is stored or maintained separately — feeds are built on demand
 * from live commerce data (cached at the edge via Cache-Control headers
 * set in the route handlers).
 *
 * Google Merchant schema: https://support.google.com/merchants/answer/7052112
 */

export interface FeedItem {
  id: string;
  sku: string | null;
  title: string;
  description: string;
  link: string;
  imageLink: string | null;
  price: number;
  currency: string;
  availability: "in_stock" | "out_of_stock" | "preorder";
  brand: string | null;
  model: string | null;
  category: string | null;
  condition: "new";
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function getFeedItems(): Promise<FeedItem[]> {
  const items: FeedItem[] = [];
  const limit = 100;
  let offset = 0;

  for (;;) {
    const res = await storeFetch<{
      products: Parameters<typeof mapMedusaProductToAi>[0][];
      count: number;
    }>("/store/products", {
      params: {
        limit,
        offset,
        fields:
          "id,title,handle,subtitle,description,thumbnail,images.url,variants.id,variants.sku,variants.prices,metadata,categories.id,categories.name",
      },
      tags: ["products"],
      revalidate: 600,
    });
    const batch = res.products ?? [];
    for (const raw of batch) {
      const p = mapMedusaProductToAi(raw);
      const desc =
        stripHtml(raw.description ?? "").slice(0, 5000) ||
        p.shortDescription ||
        p.name;
      items.push({
        id: p.id,
        sku: p.sku,
        title: p.name.slice(0, 200),
        description: desc,
        link: p.url,
        imageLink: p.image,
        price: p.salePrice ?? p.price,
        currency: p.currency,
        availability: p.availability,
        brand: p.brand,
        model: p.model,
        category: raw.categories?.[0]?.name ?? null,
        condition: "new",
      });
    }
    offset += batch.length;
    if (batch.length < limit || offset >= (res.count ?? 0)) break;
    if (offset >= 5000) break; // safety cap per build
  }
  return items;
}

export function feedItemsToGoogleXml(items: FeedItem[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `  <title>${xmlEscape("Imran Electric Store — Product Feed")}</title>`,
    `  <link>${xmlEscape(absoluteUrl("/"))}</link>`,
    `  <description>${xmlEscape("Electric products product feed")}</description>`,
  ];
  for (const it of items) {
    lines.push("  <item>");
    lines.push(`    <g:id>${xmlEscape(it.id)}</g:id>`);
    lines.push(`    <g:title>${xmlEscape(it.title)}</g:title>`);
    lines.push(`    <g:description>${xmlEscape(it.description)}</g:description>`);
    lines.push(`    <g:link>${xmlEscape(it.link)}</g:link>`);
    if (it.imageLink)
      lines.push(`    <g:image_link>${xmlEscape(it.imageLink)}</g:image_link>`);
    lines.push(
      `    <g:price>${it.price.toFixed(2)} ${xmlEscape(it.currency)}</g:price>`,
    );
    lines.push(`    <g:availability>${it.availability}</g:availability>`);
    lines.push(`    <g:condition>${it.condition}</g:condition>`);
    if (it.brand) lines.push(`    <g:brand>${xmlEscape(it.brand)}</g:brand>`);
    // Single <g:mpn> per item (Google rejects duplicates): SKU preferred, else model.
    const mpn = it.sku || it.model;
    if (mpn) lines.push(`    <g:mpn>${xmlEscape(mpn)}</g:mpn>`);
    if (it.category)
      lines.push(
        `    <g:google_product_category>${xmlEscape(it.category)}</g:google_product_category>`,
      );
    lines.push("  </item>");
  }
  lines.push("</channel>", "</rss>");
  return lines.join("\n");
}

export function feedItemsToJson(items: FeedItem[]): object {
  return {
    generated_at: new Date().toISOString(),
    count: items.length,
    currency_default: process.env.DEFAULT_CURRENCY || "PKR",
    products: items.map((it) => ({
      id: it.id,
      sku: it.sku,
      title: it.title,
      description: it.description,
      url: it.link,
      image: it.imageLink,
      price: it.price,
      currency: it.currency,
      availability: it.availability,
      brand: it.brand,
      model: it.model,
      category: it.category,
      condition: it.condition,
    })),
  };
}

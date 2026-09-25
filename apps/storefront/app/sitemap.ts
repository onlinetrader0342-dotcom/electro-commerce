import type { MetadataRoute } from "next";
import { aiSearchCategories } from "@/lib/ai-api";
import { getBlogRepository, getFixturePosts } from "@/lib/blog";
import { storeFetch } from "@/lib/commerce";
import { absoluteUrl } from "@/lib/format";

/**
 * Sitemap: products + categories + blog posts + static routes.
 * Everything derives from Medusa (single source of truth); blog falls back
 * to fixtures when the blog module is unreachable.
 */

const PRODUCT_URL_PREFIX = process.env.PRODUCT_URL_PREFIX || "/product";

async function productEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];
    const limit = 500;
    let offset = 0;
    for (;;) {
      const res = await storeFetch<{
        products: { handle: string; updated_at?: string }[];
        count: number;
      }>("/store/products", {
        params: { limit, offset, fields: "handle,updated_at" },
        // No cache tags here: sitemap regenerates on its own schedule.
      });
      const batch = res.products ?? [];
      for (const p of batch) {
        entries.push({
          url: absoluteUrl(`${PRODUCT_URL_PREFIX}/${p.handle}`),
          lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
      offset += batch.length;
      if (batch.length < limit || offset >= (res.count ?? 0)) break;
      if (offset >= 5000) break;
    }
    return entries;
  } catch {
    return [];
  }
}

async function categoryEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const cats = await aiSearchCategories();
    return cats.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

async function blogEntries(): Promise<MetadataRoute.Sitemap> {
  const repo = getBlogRepository();
  let posts = getFixturePosts();
  try {
    const res = await repo.getPosts({ status: "published", limit: 500 });
    if (res.posts.length) posts = res.posts;
  } catch {
    /* fixtures */
  }
  return posts.map((p) => ({
    url: absoluteUrl(`/blog/${p.slug}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, blog] = await Promise.all([
    productEntries(),
    categoryEntries(),
    blogEntries(),
  ]);

  // B's real routes: /product/[slug], /category/[slug], plus static pages.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/blog"), changeFrequency: "daily", priority: 0.7 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "monthly", priority: 0.3 },
  ];

  return [...staticRoutes, ...products, ...categories, ...blog];
}

import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

const ListQuery = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /store/blog/posts — published posts only, with category/tag/search
 * filters. Used by /blog, /blog/category/[slug], /blog/tag/[slug].
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = ListQuery.parse(req.query);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;

  const filters: Record<string, unknown> = { status: "published" };
  if (q.category) {
    const [cat] = await blog.listBlogCategories({ slug: q.category });
    if (!cat) return res.json({ posts: [], count: 0 });
    filters.category_id = cat.id;
  }
  if (q.tag) {
    const [tag] = await blog.listBlogTags({ slug: q.tag });
    if (!tag) return res.json({ posts: [], count: 0 });
    const pivots = await blog.listPostTags({ tag_id: tag.id });
    const ids = pivots.map((p: { post_id: string }) => p.post_id);
    if (!ids.length) return res.json({ posts: [], count: 0 });
    filters.id = ids;
  }
  if (q.q) filters.title = { $ilike: `%${q.q}%` };

  const [posts, count] = await blog.listAndCountBlogPosts(filters, {
    relations: ["author", "category", "tags"],
    take: q.limit,
    skip: q.offset,
    order: { published_at: "DESC" },
  });
  res.json({ posts, count, limit: q.limit, offset: q.offset });
};

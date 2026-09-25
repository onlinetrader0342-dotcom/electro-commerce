import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

const ListQuery = z.object({
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  category_id: z.string().optional(),
  tag_id: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  order: z.string().default("-created_at"),
});

const CreatePost = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  status: z.enum(["draft", "published", "scheduled"]).default("draft"),
  published_at: z.string().datetime().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  canonical_url: z.string().url().optional(),
  og_image: z.string().optional(),
  featured_image: z.string().optional(),
  image_alt: z.string().optional(),
  author_id: z.string().optional(),
  category_id: z.string().optional(),
  tag_ids: z.array(z.string()).optional(),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = ListQuery.parse(req.query);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;

  const filters: Record<string, unknown> = {};
  if (q.status) filters.status = q.status;
  if (q.category_id) filters.category_id = q.category_id;
  if (q.q) filters.title = { $ilike: `%${q.q}%` };

  // Tag filter goes through the pivot table.
  let postIds: string[] | undefined;
  if (q.tag_id) {
    const pivots = await blog.listPostTags({ tag_id: q.tag_id });
    postIds = pivots.map((p: { post_id: string }) => p.post_id);
    if (!postIds.length) return res.json({ posts: [], count: 0, limit: q.limit, offset: q.offset });
    filters.id = postIds;
  }

  const [posts, count] = await blog.listAndCountBlogPosts(filters, {
    relations: ["author", "category", "tags"],
    take: q.limit,
    skip: q.offset,
    order: { created_at: q.order.startsWith("-") ? "DESC" : "ASC" },
  });
  res.json({ posts, count, limit: q.limit, offset: q.offset });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = CreatePost.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;

  const { tag_ids, author_id, category_id, published_at, ...rest } = body;
  const post = await blog.createBlogPosts({
    ...rest,
    ...(published_at ? { published_at: new Date(published_at) } : {}),
    slug: body.slug ?? slugify(body.title),
    ...(author_id ? { author_id } : {}),
    ...(category_id ? { category_id } : {}),
  });

  if (tag_ids?.length) {
    await blog.createPostTags(tag_ids.map((tag_id) => ({ post_id: post.id, tag_id })));
  }

  const [full] = await blog.listBlogPosts(
    { id: post.id },
    { relations: ["author", "category", "tags"] },
  );
  res.status(201).json({ post: full });
};

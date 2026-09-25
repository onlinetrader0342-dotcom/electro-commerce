import { z } from "zod";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../../modules/blog";
import type BlogModuleService from "../../../../../modules/blog/service";

const UpdatePost = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["draft", "published", "scheduled"]).optional(),
  published_at: z.string().datetime().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  canonical_url: z.string().url().nullable().optional(),
  og_image: z.string().nullable().optional(),
  featured_image: z.string().nullable().optional(),
  image_alt: z.string().nullable().optional(),
  author_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  tag_ids: z.array(z.string()).optional(),
});

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const [post] = await blog.listBlogPosts(
    { id: req.params.id },
    { relations: ["author", "category", "tags", "product_links"] },
  );
  if (!post) return res.status(404).json({ message: "Post not found" });
  res.json({ post });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = UpdatePost.parse(req.body);
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const { tag_ids, published_at, ...rest } = body;

  const post = await blog.updateBlogPosts({
    id: req.params.id,
    ...rest,
    ...(published_at ? { published_at: new Date(published_at) } : {}),
  });

  if (tag_ids !== undefined) {
    // Replace tag set: delete existing pivots, create the new ones.
    const existing = await blog.listPostTags({ post_id: req.params.id });
    if (existing.length) {
      await blog.deletePostTags(existing.map((p: { id: string }) => p.id));
    }
    if (tag_ids.length) {
      await blog.createPostTags(tag_ids.map((tag_id) => ({ post_id: req.params.id, tag_id })));
    }
  }

  const [full] = await blog.listBlogPosts(
    { id: req.params.id },
    { relations: ["author", "category", "tags"] },
  );
  res.json({ post: full ?? post });
};

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  await blog.softDeleteBlogPosts(req.params.id);
  res.json({ id: req.params.id, deleted: true });
};

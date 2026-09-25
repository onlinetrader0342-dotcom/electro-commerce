import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../../modules/blog";
import type BlogModuleService from "../../../../../modules/blog/service";

/**
 * GET /store/blog/posts/:slug — one published article with its structured
 * product links. The storefront resolves `product_links[].medusa_product_id`
 * against the Medusa Store API to render "Recommended products" with live
 * price/stock — nothing is copied into the article.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const post = await blog.getPublishedPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ message: "Post not found" });
  res.json({ post });
};

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLOG_MODULE } from "../../../../modules/blog";
import type BlogModuleService from "../../../../modules/blog/service";

/** GET /store/blog/categories — public list for the blog index nav. */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const blog = req.scope.resolve(BLOG_MODULE) as BlogModuleService;
  const categories = await blog.listBlogCategories({}, { order: { name: "ASC" } });
  res.json({ categories });
};
